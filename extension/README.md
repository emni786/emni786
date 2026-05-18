# Xenonowledge — Chrome Extension

Manifest V3 extension that saves the current tab into your Xenonowledge library.

## Install (developer mode)

1. In the web app, go to **Settings → Browser Extension → Generate token**, copy the token.
2. Zip this folder (or use the "Download Extension (.zip)" button in the app).
3. In Chrome / Edge: `chrome://extensions` → enable **Developer mode** → **Load unpacked** → choose the unzipped folder.
4. Click the extension icon in the toolbar, then "Open settings", paste your project URL + token.
5. Browse to any page and click the toolbar icon → "Save current tab".

## Files

```
manifest.json        MV3 manifest
src/background.js    service worker, POSTs to /functions/v1/ingest-link
src/popup.html|js    toolbar popup UI
src/options.html|js  settings page
icons/               16 / 48 / 128 PNG (placeholders here; replace with your branding)
```

## Privacy

- Your token is stored in `chrome.storage.local` on **this device only**.
- The extension only sends the active tab's URL when you click "Save".
