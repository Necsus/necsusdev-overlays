const loadingState = document.querySelector("#loading-state");
const disconnectedState = document.querySelector("#disconnected-state");
const connectedState = document.querySelector("#connected-state");
const adminError = document.querySelector("#admin-error");
const streamerAvatar = document.querySelector("#streamer-avatar");
const avatarFallback = document.querySelector("#avatar-fallback");
const streamerDisplayName = document.querySelector("#streamer-display-name");
const streamerLogin = document.querySelector("#streamer-login");
const sidebarDisplayName = document.querySelector("#sidebar-display-name");
const sidebarLogin = document.querySelector("#sidebar-login");
const profileAvatars = [
  [streamerAvatar, avatarFallback],
  [document.querySelector("#sidebar-avatar"), document.querySelector("#sidebar-avatar-fallback")],
];
const activeStreamer = document.querySelector("#active-streamer");
const botLogin = document.querySelector("#bot-login");
const chatStatus = document.querySelector("#chat-status");
const overlayUrlInput = document.querySelector("#overlay-url");
const copyOverlayUrlButton = document.querySelector("#copy-overlay-url");
const copyButtonLabel = copyOverlayUrlButton.querySelector("span");
const copyStatus = document.querySelector("#copy-status");
const overlayAccessBadge = document.querySelector("#overlay-access-badge");
const overlayAccessLabel = document.querySelector("#overlay-access-label");
const rotateOverlayAccessButton = document.querySelector(
  "#rotate-overlay-access",
);
const rotateOverlayAccessLabel = document.querySelector(
  "#rotate-overlay-access-label",
);
const logoutButton = document.querySelector("#logout-button");
const retryButton = document.querySelector("#retry-button");
const logoutStatus = document.querySelector("#logout-status");

const OVERLAY_LINK_STORAGE_KEY = "necsus:giveaway:overlay-link:v1";
let overlayAccessConfigured = false;
let overlayOwnerId = null;
let cachedOverlayLink = null;
let overlayActionVersion = 0;

function parseOverlayUrl(value) {
  try {
    const url = new URL(value);
    return url.origin === window.location.origin &&
      url.pathname === "/plugins/giveaway/overlay" &&
      !url.username && !url.password && !url.search && url.hash.length > 1
      ? url.href
      : null;
  } catch {
    return null;
  }
}

function discardOverlayLink() {
  cachedOverlayLink = null;
  overlayUrlInput.value = "";
  overlayUrlInput.hidden = true;
  try {
    window.sessionStorage.removeItem(OVERLAY_LINK_STORAGE_KEY);
  } catch {
    // Le stockage peut être bloqué par le navigateur.
  }
}

function restoreOverlayIdentity(ownerId) {
  if (typeof ownerId !== "string" || !ownerId) {
    discardOverlayLink();
    throw new Error("Missing session identity");
  }
  if (overlayOwnerId === ownerId) {
    return;
  }
  overlayActionVersion += 1;
  overlayOwnerId = ownerId;
  overlayUrlInput.value = "";
  overlayUrlInput.hidden = true;
  try {
    cachedOverlayLink = JSON.parse(window.sessionStorage.getItem(OVERLAY_LINK_STORAGE_KEY));
  } catch {
    cachedOverlayLink = null;
  }
  if (cachedOverlayLink?.ownerId !== ownerId ||
      typeof cachedOverlayLink?.rotatedAt !== "string" ||
      !cachedOverlayLink.rotatedAt || !parseOverlayUrl(cachedOverlayLink.url)) {
    discardOverlayLink();
  }
}

function setOverlayCopyState(state, label) {
  copyOverlayUrlButton.dataset.copyState = state;
  copyOverlayUrlButton.title = label;
  copyOverlayUrlButton.disabled = state !== "ready";
  overlayAccessBadge.classList.toggle("status-success", state === "ready");
  overlayAccessBadge.classList.toggle("status-danger", state === "unavailable");
  overlayAccessBadge.classList.toggle("status-neutral", state === "pending");
  overlayAccessLabel.textContent = label;
}

const chatStatusLabels = {
  ready: "Opérationnel",
  degraded: "Dégradé",
  disabled: "Désactivé",
};
copyOverlayUrlButton.addEventListener("click", async () => {
  copyStatus.textContent = "";
  copyStatus.classList.remove("feedback-error");

  try {
    await navigator.clipboard.writeText(overlayUrlInput.value);
    copyButtonLabel.textContent = "Copié";
    copyStatus.textContent = "Lien copié. Collez-le dans OBS.";
    overlayUrlInput.hidden = true;

    window.setTimeout(() => {
      copyButtonLabel.textContent = "Copier le lien OBS";
    }, 2000);
  } catch {
    overlayUrlInput.hidden = false;
    overlayUrlInput.focus();
    overlayUrlInput.select();
    copyStatus.textContent = "Copiez manuellement le lien sélectionné.";
    copyStatus.classList.add("feedback-error");
  }
});

rotateOverlayAccessButton.addEventListener("click", async () => {
  if (overlayAccessConfigured) {
    const confirmed = window.confirm(
      "Régénérer ce lien invalidera immédiatement l’ancienne source OBS. Continuer ?",
    );

    if (!confirmed) {
      return;
    }
  }

  if (!overlayOwnerId) {
    return;
  }
  const ownerId = overlayOwnerId;
  const actionVersion = ++overlayActionVersion;
  const isCurrentAction = () => ownerId === overlayOwnerId && actionVersion === overlayActionVersion;
  discardOverlayLink();
  rotateOverlayAccessButton.disabled = true;
  setOverlayCopyState("pending", "Préparation du lien…");
  copyStatus.classList.remove("feedback-error");
  copyStatus.textContent = overlayAccessConfigured
    ? "Régénération du lien sécurisé…"
    : "Génération du lien sécurisé…";

  try {
    const response = await fetch(
      "/api/admin/plugins/giveaway/overlay-access/rotate",
      {
        method: "POST",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
        },
      },
    );

    if (!isCurrentAction()) {
      return;
    }
    if (response.status === 401) {
      showDisconnectedState();
      return;
    }

    if (!response.ok) {
      throw new Error("Unable to rotate the overlay access key");
    }

    const data = await response.json();
    if (!isCurrentAction()) {
      return;
    }
    const overlayUrl = parseOverlayUrl(data.overlay_url);
    if (!overlayUrl || typeof data.rotated_at !== "string" || !data.rotated_at) {
      throw new Error("Invalid overlay response");
    }

    cachedOverlayLink = { ownerId, rotatedAt: data.rotated_at, url: overlayUrl };
    if (!await loadOverlayAccessStatus() || !isCurrentAction() || !cachedOverlayLink) {
      return;
    }

    try {
      window.sessionStorage.setItem(OVERLAY_LINK_STORAGE_KEY, JSON.stringify(cachedOverlayLink));
      copyStatus.textContent = "Lien conservé dans cet onglet.";
    } catch {
      copyStatus.textContent = "Stockage bloqué. Copiez le lien avant de recharger.";
    }
    copyStatus.classList.remove("feedback-error");
  } catch {
    if (!isCurrentAction()) {
      return;
    }
    discardOverlayLink();
    setOverlayCopyState("unavailable", "Lien indisponible");
    copyStatus.textContent =
      "Impossible de générer le lien OBS. Réessayez plus tard.";
    copyStatus.classList.add("feedback-error");
  } finally {
    if (isCurrentAction() && !connectedState.hidden) {
      rotateOverlayAccessButton.disabled = false;
    }
  }
});

retryButton.addEventListener("click", () => {
  window.location.reload();
});

document.querySelector("#delete-account-button").addEventListener("click", () => {
  document.querySelector("#delete-account-dialog").showModal();
});

logoutButton.addEventListener("click", async () => {
  logoutButton.disabled = true;
  logoutStatus.textContent = "";
  overlayActionVersion += 1;
  discardOverlayLink();
  setOverlayCopyState("unavailable", "Copie locale effacée");
  rotateOverlayAccessButton.disabled = true;

  try {
    const response = await fetch("/auth/logout", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
      }
    });

    if (response.status !== 204) {
      throw new Error("Unable to close the admin session");
    }

    window.location.reload();
  } catch {
    logoutButton.disabled = false;
    rotateOverlayAccessButton.disabled = false;
    logoutStatus.textContent = "Impossible de fermer la session. Réessayez plus tard.";
  }
});

function showDisconnectedState() {
  overlayActionVersion += 1;
  overlayOwnerId = null;
  discardOverlayLink();
  setOverlayCopyState("unavailable", "Session déconnectée");
  loadingState.hidden = true;
  disconnectedState.hidden = false;
  connectedState.hidden = true;
  adminError.hidden = true;
}

function showErrorState() {
  loadingState.hidden = true;
  disconnectedState.hidden = true;
  connectedState.hidden = true;
  adminError.hidden = false;
}

function showConnectedState(data) {
  const session = data.session;
  restoreOverlayIdentity(session.twitch_user_id);

  streamerDisplayName.textContent = session.display_name;
  streamerLogin.textContent = `@${session.login}`;
  sidebarDisplayName.textContent = session.display_name;
  sidebarLogin.textContent = `@${session.login}`;
  chatStatus.textContent = chatStatusLabels[data.chat.status] ?? "Inconnu";
  chatStatus.dataset.status = data.chat.status;

  for (const [avatar, fallback] of profileAvatars) {
    if (session.profile_image_url) {
      avatar.src = session.profile_image_url;
      avatar.hidden = false;
      fallback.hidden = true;
    } else {
      avatar.removeAttribute("src");
      avatar.hidden = true;
      fallback.hidden = false;
    }
  }
  streamerAvatar.alt = session.profile_image_url
    ? `Avatar Twitch de ${session.display_name}`
    : "";

  if (data.active_streamer === null) {
    activeStreamer.textContent = "Aucun streamer actif";
  } else {
    activeStreamer.textContent =
      `${data.active_streamer.display_name} ` +
      `(@${data.active_streamer.login})`;
  }

  botLogin.textContent = `@${data.bot.login}`;

  loadingState.hidden = true;
  disconnectedState.hidden = true;
  connectedState.hidden = false;
  adminError.hidden = true;
}

for (const [avatar, fallback] of profileAvatars) {
  avatar.addEventListener("error", () => {
    avatar.hidden = true;
    fallback.hidden = false;
  });
}

function renderOverlayAccessStatus(data) {
  overlayAccessConfigured = data.configured === true;

  const cachedUrl = cachedOverlayLink?.ownerId === overlayOwnerId &&
    overlayAccessConfigured && typeof data.rotated_at === "string" &&
    cachedOverlayLink.rotatedAt === data.rotated_at
    ? parseOverlayUrl(cachedOverlayLink.url)
    : null;

  if (cachedUrl) {
    overlayUrlInput.value = cachedUrl;
    setOverlayCopyState("ready", "Lien configuré");
  } else {
    discardOverlayLink();
    setOverlayCopyState(
      "unavailable",
      overlayAccessConfigured ? "Lien valide, copie indisponible" : "Lien à générer",
    );
  }

  rotateOverlayAccessLabel.textContent = overlayAccessConfigured
    ? "Régénérer"
    : "Générer";

  overlayUrlInput.hidden = true;
  rotateOverlayAccessButton.disabled = false;

  copyStatus.textContent = overlayAccessConfigured && !cachedUrl
    ? "Régénérez uniquement si vous avez besoin de le recopier."
    : "";
  copyStatus.classList.remove("feedback-error");
}

async function loadOverlayAccessStatus() {
  const ownerId = overlayOwnerId;
  const actionVersion = overlayActionVersion;
  const isCurrentRequest = () => ownerId === overlayOwnerId && actionVersion === overlayActionVersion;
  try {
    const response = await fetch(
      "/api/admin/plugins/giveaway/overlay-access",
      {
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      },
    );

    if (!isCurrentRequest()) {
      return;
    }
    if (response.status === 401) {
      showDisconnectedState();
      return;
    }

    if (!response.ok) {
      throw new Error("Unable to load the overlay access status");
    }

    const data = await response.json();
    if (!isCurrentRequest()) {
      return;
    }
    renderOverlayAccessStatus(data);
    return true;
  } catch {
    if (!isCurrentRequest()) {
      return;
    }
    overlayUrlInput.value = "";
    overlayUrlInput.hidden = true;
    setOverlayCopyState("unavailable", "Statut indisponible");
    rotateOverlayAccessButton.disabled = true;

    copyStatus.textContent = "Impossible de charger l’accès OBS.";
    copyStatus.classList.add("feedback-error");
  }
}

async function loadAdminSession() {
  try {
    const response = await fetch("/api/admin/session", {
      headers: {
        Accept: "application/json",
      },
    });

    if (response.status === 401) {
      showDisconnectedState();
      return;
    }

    if (!response.ok) {
      throw new Error("Unable to load the admin session");
    }

    const data = await response.json();
    showConnectedState(data);
    await loadOverlayAccessStatus();
  } catch {
    showErrorState();
  }
}

// Navigation locale uniquement : aucun appel métier ni reconstruction des aperçus.
function initializeAdminNavigation() {
  const pages = document.querySelectorAll("[data-admin-page]");
  const links = document.querySelectorAll("[data-admin-link]");
  const routes = new Map([
    ["account", { page: "account", heading: "account-title", title: "Compte & connexion" }],
    ["giveaway", { page: "giveaway", heading: "plugin-giveaway-title", title: "Giveaway" }],
    ["chat", { page: "chat", heading: "chat-plugin-title", title: "Chat (prévu)" }],
  ]);

  function showRoute(moveFocus = false) {
    const requested = window.location.hash.slice(1);
    const routeKey = routes.has(requested) ? requested : "giveaway";
    const route = routes.get(routeKey);

    for (const page of pages) {
      page.hidden = page.dataset.adminPage !== route.page;
    }
    for (const link of links) {
      const key = link.dataset.adminLink;
      if (key === routeKey) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    }

    document.title = `${route.title} · NecsusDevOverlays`;
    if (moveFocus && !connectedState.hidden) {
      document.getElementById(route.heading).focus();
    }
  }

  document.querySelector(".skip-link").addEventListener("click", (event) => {
    event.preventDefault();
    document.getElementById("admin-content").focus();
  });
  window.addEventListener("hashchange", () => showRoute(true));
  showRoute();
}

initializeAdminNavigation();
loadAdminSession();
