const btn = document.getElementById('save');
const out = document.getElementById('out');

document.getElementById('open-options').addEventListener('click', (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

btn.addEventListener('click', async () => {
  btn.disabled = true;
  out.textContent = 'Saving…';
  out.className = 'out';
  const reply = await chrome.runtime.sendMessage({ type: 'save-active-tab' });
  if (reply?.ok) {
    out.textContent = reply.duplicate ? 'Already saved (count incremented).' : 'Saved! AI is analysing it now.';
    out.className = 'out ok';
  } else {
    out.textContent = reply?.error ?? 'Failed.';
    out.className = 'out err';
  }
  btn.disabled = false;
});
