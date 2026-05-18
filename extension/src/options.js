const projectUrl = document.getElementById('projectUrl');
const accessToken = document.getElementById('accessToken');
const ok = document.getElementById('ok');

chrome.storage.local.get(['projectUrl', 'accessToken'], (cfg) => {
  if (cfg.projectUrl) projectUrl.value = cfg.projectUrl;
  if (cfg.accessToken) accessToken.value = cfg.accessToken;
});

document.getElementById('save').addEventListener('click', () => {
  chrome.storage.local.set(
    { projectUrl: projectUrl.value.trim(), accessToken: accessToken.value.trim() },
    () => {
      ok.textContent = 'Saved.';
      setTimeout(() => (ok.textContent = ''), 2000);
    }
  );
});
