const previewFrame = document.querySelector("#giveaway-preview-frame");

async function loadPreviewSource(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Chargement de l'aperçu impossible : ${response.status}`);
  }

  return response.text();
}

async function initializeGiveawayPreview() {
  const [rendererSource, previewDataSource] = await Promise.all([
    loadPreviewSource("/plugins/giveaway/static/giveaway-renderer.js"),
    loadPreviewSource("/plugins/giveaway/static/giveaway-preview-data.js"),
  ]);

  const nonce = Array.from(
    crypto.getRandomValues(new Uint8Array(16)),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");

  const trustedSource = [
    rendererSource,
    previewDataSource,
    "renderGiveaway(giveawayPreviewStates.openTimed, previewNow);",
  ].join("\n").replace(/<\/script/gi, "<\\/script");

  previewFrame.srcdoc = `
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
initializeGiveawayPreview().catch(() => {
  document.querySelector("#giveaway-preview-note")
    .textContent = "Impossible de charger la prévisualisation";
});
