from pathlib import Path

from fastapi import APIRouter
from fastapi.responses import FileResponse

FAVICON_PATH = Path(__file__).resolve().parents[1] / "static" / "favicon.ico"
router = APIRouter()


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/favicon.ico")
def favicon() -> FileResponse:
    return FileResponse(FAVICON_PATH)
