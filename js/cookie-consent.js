// /js/cookie-consent.js
(function () {
  try {
    if (localStorage.getItem('cookie-consent')) return;
  } catch { /* private mode */ }

  const bar = document.createElement('div');
  bar.style.cssText = `
    position:fixed;left:12px;right:12px;bottom:12px;z-index:9999;
    background:#fff;border:1px solid #e5e7eb;border-radius:16px;
    box-shadow:0 10px 20px rgba(0,0,0,.08);padding:12px;display:flex;gap:12px;align-items:center;flex-wrap:wrap;
    font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;color:#191a1f`;
  bar.innerHTML = `
    <div style="flex:1;min-width:260px">
      We use essential cookies to make this site work and remember your preferences.
      See our <a href="/legal/cookies.html" target="_blank" rel="noopener">Cookie Policy</a>.
    </div>
    <div style="display:flex;gap:8px">
      <button id="cc-accept" style="padding:10px 14px;border-radius:999px;border:1px solid #e5e7eb;background:#1f2937;color:#fff">OK</button>
      <a href="/legal/cookies.html" class="pill solid" style="display:inline-block">Learn more</a>
    </div>`;
  document.body.appendChild(bar);

  document.getElementById('cc-accept').addEventListener('click', () => {
    try { localStorage.setItem('cookie-consent','essential'); } catch {}
    bar.remove();
  });
})();
