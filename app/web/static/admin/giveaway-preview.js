const previewFrame = document.querySelector("#giveaway-preview-frame");
const scenarioSelect = document.querySelector("#giveaway-preview-scenario");
const previewCss = document.querySelector("#giveaway-preview-css");
const applyCssButton = document.querySelector("#giveaway-preview-apply");
const previewNote = document.querySelector("#giveaway-preview-note");

const PREVIEW_SCENARIOS = new Set([
  "hidden",
  "openTimed",
  "waiting",
  "open",
  "winner",
  "multipleWinners",
]);

async function loadPreviewSource(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Chargement de l'aperçu impossible : ${response.status}`);
  }

  return response.text();
}

function buildPreviewDocument(rendererSource, previewDataSource, scenarioKey, cssText) {
  const nonce = Array.from(
    crypto.getRandomValues(new Uint8Array(16)),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");

  const previewStyle = String(cssText).replace(/<\/style/gi, "<\\/style");
  const trustedSource = [
    rendererSource,
    previewDataSource,
    `renderGiveaway(giveawayPreviewStates[${JSON.stringify(scenarioKey)}], previewNow);`,
  ].join("\n").replace(/<\/script/gi, "<\\/script");

  return `
      <!doctype html>
      <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <meta
           http-equiv="Content-Security-Policy"
           content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"
         >
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Aperçu Giveaway</title>
          <style>${previewStyle}</style>
        </head>
        <body>
          <main id="giveaway" hidden>
            <div id="lot"></div>
            <div id="status"></div>
            <div id="participants"></div>
            <div id="countdown" hidden></div>
            <div id="winner"></div>
          </main>
          <script nonce="${nonce}">
           ${trustedSource}
          </script>
        </body>
      </html>
   `;
}

async function initializeGiveawayPreview() {
  const [rendererSource, previewDataSource] = await Promise.all([
    loadPreviewSource("/plugins/giveaway/static/giveaway-renderer.js"),
    loadPreviewSource("/plugins/giveaway/static/giveaway-preview-data.js"),
  ]);

  function showScenario(key) {
    const scenarioKey = PREVIEW_SCENARIOS.has(key) ? key : "waiting";
    previewFrame.srcdoc = buildPreviewDocument(
      rendererSource,
      previewDataSource,
      scenarioKey,
      previewCss.value,
    );
    previewNote.textContent = scenarioKey === "hidden"
      ? "État masqué : l'overlay reste invisible. Données fictives — aucun effet sur le giveaway réel."
      : "Données fictives - aucun effet sur le giveaway réel.";
  }

  scenarioSelect.addEventListener("change", () => {
    showScenario(scenarioSelect.value);
  });

  applyCssButton.addEventListener("click", () => {
    showScenario(scenarioSelect.value);
  });

  showScenario(scenarioSelect.value);
}

initializeGiveawayPreview().catch(() => {
  document.querySelector("#giveaway-preview-note")
    .textContent = "Impossible de charger la prévisualisation";
});
