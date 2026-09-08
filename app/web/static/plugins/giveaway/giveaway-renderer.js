const giveawayElement = document.querySelector("#giveaway");
const lotElement = document.querySelector("#lot");
const statusElement = document.querySelector("#status");
const participantsElement = document.querySelector("#participants");
const winnerElement = document.querySelector("#winner");
const countdownElement = document.querySelector("#countdown");

let closesAt = null;

function renderCountdown(now = Date.now()) {
  countdownElement.hidden = closesAt === null;
  countdownElement.textContent = closesAt === null
    ? ""
    : `${Math.max(0, Math.ceil((closesAt - now) / 1000))} s`;
}

function renderGiveaway(state, now = Date.now()) {
  const deadline = Date.parse(state.closes_at);

  closesAt = state.state === "OPEN" && Number.isFinite(deadline)
    ? deadline
    : null;

  renderCountdown(now);

  giveawayElement.hidden = state.state === "HIDDEN";
  lotElement.textContent = state.lot ?? "";
  statusElement.textContent = state.state;
  participantsElement.textContent = String(state.participant_count);

  const winners = state.winners ?? [];

  winnerElement.textContent = winners
    .map((winner, index) => `${index + 1}. ${winner.display_name}`)
    .join(" • ");
}

function clearGiveaway() {
  closesAt = null;
  renderCountdown();

  giveawayElement.hidden = true;
  lotElement.textContent = "";
  statusElement.textContent = "";
  participantsElement.textContent = "0";
  winnerElement.textContent = "";
}
