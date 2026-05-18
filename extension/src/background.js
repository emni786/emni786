// MV3 service worker. Receives requests from popup.js and POSTs to /functions/v1/ingest-link.

async function getConfig() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['projectUrl', 'accessToken'], (cfg) => resolve(cfg || {}));
  });
}

async function saveActiveTab() {
  const cfg = await getConfig();
  if (!cfg.projectUrl || !cfg.accessToken) {
    chrome.runtime.openOptionsPage();
    return { ok: false, error: 'Configure project URL and token first.' };
  }
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return { ok: false, error: 'No active tab.' };

  try {
    const res = await fetch(`${cfg.projectUrl.replace(/\/$/, '')}/functions/v1/ingest-link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-extension-token': cfg.accessToken,
      },
      body: JSON.stringify({ url: tab.url, source: 'extension' }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data.error ?? `HTTP ${res.status}` };
    return { ok: true, duplicate: !!data.duplicate };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'save-active-tab') {
    saveActiveTab().then(sendResponse);
    return true; // keep channel open for async response
  }
});
