import asyncio
import logging
import sqlite3
from contextlib import suppress
from datetime import UTC, datetime, timedelta

from app.domain.giveaway import GiveawayEngine, GiveawayState, Participant
from app.infrastructure.history import (
    add_participant,
    create_giveaway,
    draw_giveaway,
    open_giveaway,
    stop_giveaway,
)
from app.web.websocket import OverlayConnectionManager


class GiveawayService:
    def __init__(
        self,
        engine: GiveawayEngine,
        connection: sqlite3.Connection,
        overlay_connections: OverlayConnectionManager,
    ) -> None:
        self._engine: GiveawayEngine = engine
        self._connection: sqlite3.Connection = connection
        self._overlay_connections: OverlayConnectionManager = overlay_connections
        self._lock: asyncio.Lock = asyncio.Lock()
        self._timer: asyncio.Task[None] | None = None

    def resume_timer(self) -> None:
        if self._engine.closes_at is not None and (
            self._timer is None or self._timer.done()
        ):
            self._timer = asyncio.create_task(self._run_timer(), name="giveaway-deadline")

    async def close(self) -> None:
        if self._timer is not None:
            self._timer.cancel()
            with suppress(asyncio.CancelledError):
                await self._timer
            self._timer = None

    def _cancel_timer(self) -> None:
        if self._timer is asyncio.current_task():
            return
        if self._timer is not None:
            self._timer.cancel()
        self._timer = None

    async def _run_timer(self) -> None:
        while self._engine.closes_at is not None:
            delay = (self._engine.closes_at - datetime.now(UTC)).total_seconds()
            await asyncio.sleep(max(0, delay))
            try:
                async with self._lock:
                    await self._expire_if_due()
            except Exception:
                logging.getLogger("uvicorn.error").exception("Giveaway deadline failed")
                await asyncio.sleep(1)

    async def _expire_if_due(self) -> None:
        deadline = self._engine.closes_at
        if deadline is None or datetime.now(UTC) < deadline:
            return
        giveaway_id = self._active_giveaway_id()
        if self._engine.participants:
            self._draw(giveaway_id)
        else:
            stop_giveaway(self._connection, giveaway_id)
            self._engine.stop()
        self._cancel_timer()
        await self._broadcast_state()

    def _draw(self, giveaway_id: str) -> Participant:
        previous_state = self._engine.state
        previous_deadline = self._engine.closes_at
        winner = self._engine.pull()
        try:
            draw_giveaway(self._connection, giveaway_id, winner)
        except Exception:
            self._engine.winners.pop()
            self._engine.state = previous_state
            self._engine.closes_at = previous_deadline
            raise
        return winner

    async def set_lot(self, lot: str) -> None:
        async with self._lock:
            self._engine.set_lot(lot)

            giveaway_id = self._engine.giveaway_id
            cleaned_lot = self._engine.lot

            if giveaway_id is None or cleaned_lot is None:
                raise RuntimeError("The giveaway was not initialized correctly")

            create_giveaway(
                self._connection,
                giveaway_id,
                cleaned_lot,
            )

            await self._broadcast_state()

    async def start(self, duration_seconds: int | None = None) -> None:
        if duration_seconds is not None and (
            type(duration_seconds) is not int or not 1 <= duration_seconds <= 604800
        ):
            raise ValueError("Duration must be between 1 and 604800 seconds")
        async with self._lock:
            giveaway_id = self._active_giveaway_id()
            if self._engine.state is not GiveawayState.WAITING:
                raise RuntimeError("A giveaway is not waiting")
            deadline = (
                datetime.now(UTC) + timedelta(seconds=duration_seconds)
                if duration_seconds is not None
                else None
            )
            open_giveaway(self._connection, giveaway_id, deadline)
            self._engine.start()
            self._engine.closes_at = deadline
            self.resume_timer()
            await self._broadcast_state()

    async def join(self, participant: Participant) -> bool:
        async with self._lock:
            await self._expire_if_due()
            giveaway_id = self._active_giveaway_id()

            was_added = self._engine.join(participant)
            if not was_added:
                return False

            was_persisted = add_participant(
                self._connection,
                giveaway_id,
                participant,
            )
            if not was_persisted:
                raise RuntimeError("The participant already exists in the history")

            await self._broadcast_state()
            return True

    async def pull(self) -> Participant:
        async with self._lock:
            giveaway_id = self._active_giveaway_id()

            winner = self._draw(giveaway_id)
            self._cancel_timer()

            await self._broadcast_state()
            return winner

    async def stop(self) -> None:
        async with self._lock:
            giveaway_id = self._active_giveaway_id()

            stop_giveaway(self._connection, giveaway_id)
            self._engine.stop()
            self._cancel_timer()

            await self._broadcast_state()

    def _active_giveaway_id(self) -> str:
        giveaway_id = self._engine.giveaway_id
        if giveaway_id is None:
            raise RuntimeError("There is no active giveaway")

        return giveaway_id

    async def _broadcast_state(self) -> None:
        await self._overlay_connections.broadcast(self._engine.overlay_snapshot())
