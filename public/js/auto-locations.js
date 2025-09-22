/* /public/js/auto-locations.js */
/* REPLACE existing file with this version — adds #from and #to selectors */

(function () {
  // 👇 This is the only important change: now includes '#from' and '#to'
  const SELS = [
    '#from', '#to',                 // your IDs on /flights/index.html
    '#origin', '#destination',
    'input[name="origin"]', 'input[name="destination"]',
    'input[name="from"]', 'input[name="to"]',
    'input[placeholder*="From" i]', 'input[placeholder*="To" i]'
  ];

  const LANG = () => (window.i18n ? window.i18n.getLang() : (localStorage.getItem('lang') || 'en'));
  const cache = new Map();

  function $(sel, root = document) { return root.querySelector(sel); }
  function create(tag, cls) { const el = document.createElement(tag); if (cls) el.className = cls; return el; }

  function attach(input) {
    if (!input || input.dataset.autocompleteAttached) return;
    input.dataset.autocompleteAttached = '1';
    input.setAttribute('autocomplete', 'off');
    input.classList.add('plf-ac-input');

    const wrap = create('div', 'plf-ac-wrap');
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);

    const list = create('div', 'plf-ac-list');
    wrap.appendChild(list);

    let activeIndex = -1;
    let currentItems = [];

    function clearList() {
      list.innerHTML = '';
      activeIndex = -1;
      currentItems = [];
      list.style.display = 'none';
    }

    function render(items) {
      list.innerHTML = '';
      currentItems = items;
      if (!items.length) { clearList(); return; }
      items.forEach((it) => {
        const row = create('button', 'plf-ac-item');
        row.type = 'button';
        row.innerHTML = `
          <span class="plf-ac-code">${it.code}</span>
          <span class="plf-ac-main">${it.city}</span>
          <span class="plf-ac-sub">${it.name}</span>
          <span class="plf-ac-cty">${it.country}</span>
        `;
        row.addEventListener('click', () => {
          input.value = it.code;
          clearList();
          input.dispatchEvent(new Event('change'));
        });
        list.appendChild(row);
      });
      list.style.display = 'block';
    }

    async function search(q) {
      const lang = LANG();
      const key = `${q}|${lang}`;
      if (cache.has(key)) return cache.get(key);
      const url = new URL('/api/locations', window.location.origin);
      url.searchParams.set('q', q);
      url.searchParams.set('lang', lang);
      url.searchParams.set('limit', '20');
      const res = await fetch(url.toString());
      const json = await res.json().catch(() => ({ results: [] }));
      const items = Array.isArray(json.results) ? json.results : [];
      cache.set(key, items);
      return items;
    }

    let debounceTimer = 0;
    input.addEventListener('input', () => {
      const q = input.value.trim();
      clearTimeout(debounceTimer);
      if (!q) { clearList(); return; }
      debounceTimer = setTimeout(async () => {
        const items = await search(q);
        render(items);
      }, 120);
    });

    input.addEventListener('keydown', (e) => {
      const max = currentItems.length - 1;
      if (!currentItems.length) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeIndex = Math.min(max, activeIndex + 1);
        updateActive();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIndex = Math.max(0, activeIndex - 1);
        updateActive();
      } else if (e.key === 'Enter') {
        if (activeIndex >= 0) {
          e.preventDefault();
          const it = currentItems[activeIndex];
          input.value = it.code;
          clearList();
          input.dispatchEvent(new Event('change'));
        }
      } else if (e.key === 'Escape') {
        clearList();
      }
    });

    function updateActive() {
      [...list.children].forEach((el, i) => el.classList.toggle('is-active', i === activeIndex));
      const el = list.children[activeIndex];
      if (el) el.scrollIntoView({ block: 'nearest' });
    }

    document.addEventListener('click', (e) => {
      if (!wrap.contains(e.target)) clearList();
    });

    document.addEventListener('langchange', () => {
      if (input.value.trim()) {
        search(input.value.trim()).then(render);
      }
    });
  }

  function init() {
    const inputs = SELS.map((s) => $(s)).filter(Boolean);
    inputs.forEach(attach);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
