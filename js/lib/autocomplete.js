// js/lib/autocomplete.js
const cache = new Map();

function makeMenu(input) {
  const wrap = document.createElement('div');
  wrap.style.position = 'relative';
  input.parentNode.insertBefore(wrap, input);
  wrap.appendChild(input);

  const menu = document.createElement('div');
  menu.style.position = 'absolute';
  menu.style.left = '0'; menu.style.right = '0';
  menu.style.top = 'calc(100% + 6px)';
  menu.style.background = '#fff';
  menu.style.border = '1px solid #e5e7eb';
  menu.style.borderRadius = '12px';
  menu.style.boxShadow = '0 12px 24px rgba(0,0,0,.08)';
  menu.style.maxHeight = '280px';
  menu.style.overflow = 'auto';
  menu.hidden = true;
  wrap.appendChild(menu);
  return menu;
}

async function query(term) {
  const key = term.toLowerCase();
  if (cache.has(key)) return cache.get(key);
  const r = await fetch('/api/locations?q=' + encodeURIComponent(term));
  const j = await r.json();
  cache.set(key, j);
  return j;
}

function rank(q, item) {
  const t = (item.name + ' ' + (item.country || '') + ' ' + item.code).toLowerCase();
  const s = t.indexOf(q.toLowerCase());
  return s < 0 ? 999 : s;
}

export function attachAutocomplete(input) {
  input.setAttribute('autocomplete', 'off');
  const menu = makeMenu(input);
  let items = [];
  let idx = -1;

  input.addEventListener('input', async () => {
    const q = input.value.trim();
    input.dataset.code = '';
    input.dataset.city = '';
    if (q.length < 2) { menu.hidden = true; return; }

    const list = await query(q);
    items = (Array.isArray(list) ? list : [])
      .map(x => ({
        name: x.name,
        code: x.code,
        type: x.type || '',
        city_code: x.city_code || '',
        country: x.country || ''
      }))
      .filter(x => x.code && x.name)
      .sort((a, b) => rank(q, a) - rank(q, b))
      .slice(0, 12);

    menu.innerHTML = '';
    items.forEach((it, i) => {
      const label = it.type === 'airport' && it.city_code ? `${it.name} • ${it.city_code}` : it.name;
      const d = document.createElement('div');
      d.style.padding = '10px 12px';
      d.style.borderBottom = '1px solid #f3f4f6';
      d.style.cursor = 'pointer';
      d.innerHTML = `<strong>${label}</strong> <span style="color:#6b7280">(${it.code}) • ${it.country}</span>`;
      d.addEventListener('mouseenter', () => highlight(i));
      d.addEventListener('click', () => select(i));
      menu.appendChild(d);
    });
    if (menu.lastChild) menu.lastChild.style.borderBottom = 'none';
    idx = -1;
    menu.hidden = items.length === 0;

    function highlight(i) {
      [...menu.children].forEach((c, k) => c.style.background = k === i ? '#f3f4ff' : '#fff');
      idx = i;
    }
    function select(i) {
      const it = items[i];
      input.value = `${it.name} (${it.code})`;
      input.dataset.code = it.code;                 // airport OR city
      input.dataset.city = it.city_code || it.code; // prefer city code (LON/NYC/PAR)
      menu.hidden = true;
    }
  });

  input.addEventListener('keydown', (e) => {
    if (menu.hidden) return;
    if (e.key === 'ArrowDown') {
      idx = Math.min(idx + 1, items.length - 1);
      [...menu.children].forEach((c, k) => c.style.background = k === idx ? '#f3f4ff' : '#fff');
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      idx = Math.max(idx - 1, 0);
      [...menu.children].forEach((c, k) => c.style.background = k === idx ? '#f3f4ff' : '#fff');
      e.preventDefault();
    } else if (e.key === 'Enter') {
      if (idx >= 0) {
        const it = items[idx];
        input.value = `${it.name} (${it.code})`;
        input.dataset.code = it.code;
        input.dataset.city = it.city_code || it.code;
        menu.hidden = true;
        e.preventDefault();
      }
    } else if (e.key === 'Escape') {
      menu.hidden = true;
    }
  });

  document.addEventListener('click', (e) => {
    if (!input.parentElement.contains(e.target)) menu.hidden = true;
  });
}
