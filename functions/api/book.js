# /functions/api/book.js  (REPLACE WHOLE FILE)
const JH = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };

export const onRequestGet = async ({ request, env }) => {
  const u = new URL(request.url);
  const p  = (u.searchParams.get('p') || String(env.BOOK_PROVIDER || 'kiwi')).toLowerCase();
  const from = (u.searchParams.get('from')||'').toUpperCase();
  const to   = (u.searchParams.get('to')||'').toUpperCase();
  const date = u.searchParams.get('date') || '';
  const ret  = u.searchParams.get('return') || '';
  const adults = clamp(u.searchParams.get('adults'),1,9,1);
  const currency = (u.searchParams.get('currency') || 'USD').toUpperCase();

  // Fail fast to avoid bad deep links
  if (!/^[A-Z]{3}$/.test(from) || !/^[A-Z]{3}$/.test(to) || !date) {
    return json({ ok:false, error:'missing/invalid params' }, 400);
  }

  if (p === 'aviasales') {
    const q = new URLSearchParams();
    q.set('origin_iata', from);
    q.set('destination_iata', to);
    q.set('depart_date', date);
    if (ret) q.set('return_date', ret);
    if (currency) q.set('currency', currency);
    // Travelpayouts marker for Aviasales
    if (env.TP_PARTNER_ID) q.set('marker', String(env.TP_PARTNER_ID));
    return json({ ok:true, url:'https://www.aviasales.com/search?' + q.toString() });
  }

  // default: KIWI
  const seg = `${from}-${to}/${date}${ret?`/${ret}`:''}`;
  const q = new URLSearchParams();
  q.set('adults', String(adults));
  q.set('cabin', 'M');
  q.set('currency', currency);
  // Kiwi affiliate id (Travelpayouts or Kiwi direct)
  if (env.KIWI_AFFILIATE_ID) q.set('affilid', String(env.KIWI_AFFILIATE_ID));
  return json({ ok:true, url:`https://www.kiwi.com/en/search/results/${seg}?` + q.toString() });
};

function clamp(v,min,max,def){ const n=parseInt(v||'',10); if(Number.isNaN(n)) return def; return Math.max(min,Math.min(max,n)); }
function json(obj,code=200){ return new Response(JSON.stringify(obj), { status:code, headers:JH }); }

# /flights/results.html  (REPLACE WHOLE FILE)
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Results — PurpleFlights</title>
  <style>
    body{font-family:system-ui,Arial,sans-serif;margin:0;background:#f7f7fb;color:#191a1f}
    .container{max-width:960px;margin:0 auto;padding:16px}
    .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px}
    .card{background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:16px;box-shadow:0 6px 12px rgba(0,0,0,.05)}
    .tag{display:inline-block;background:#eef2ff;border:1px solid #e0e7ff;color:#3730a3;font-size:12px;padding:2px 8px;border-radius:999px}
    .btn{display:inline-block;padding:10px 14px;border-radius:999px;border:1px solid #e5e7eb;text-decoration:none;color:#fff;background:#1f2937}
    .btn.ghost{background:#fff;color:#1f2937}
    .muted{color:#6b7280}.small{font-size:12px}
    .row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
    h1{margin:16px 0 8px}
  </style>
</head>
<body>
  <main class="container">
    <h1>Results</h1>
    <div id="meta" class="muted small"></div>
    <div id="results" class="grid"></div>
  </main>

  <script>
    const qs = new URLSearchParams(location.search);
    const req = {
      from: (qs.get('from')||'').toUpperCase(),
      to: (qs.get('to')||'').toUpperCase(),
      date: qs.get('date')||'',
      ret: qs.get('ret')||'',
      adults: +(qs.get('adults')||1),
      cabin: qs.get('cabin')||'ECONOMY',
      currency: (qs.get('currency')||'USD').toUpperCase(),
    };
    document.getElementById('meta').textContent =
      `${req.from} → ${req.to} • ${req.date}${req.ret?(' → '+req.ret):''}`;

    const resEl = document.getElementById('results');
    resEl.innerHTML = '<div class="card">Searching…</div>';

    fetch('/api/search', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ from: req.from, to: req.to, date: req.date, ret: req.ret, currency: req.currency })
    })
    .then(r => r.json())
    .then(data => {
      if (data && data.error) {
        resEl.innerHTML = `<div class="card">Search error: ${data.error}</div>`;
        return;
      }
      const offers = Array.isArray(data?.data) ? data.data : [];
      if (!offers.length) { resEl.innerHTML = '<div class="card">No results.</div>'; return; }
      resEl.innerHTML = '';
      offers.slice(0, 30).forEach(o => {
        const dep = o.origin || req.from;
        const arr = o.destination || req.to;
        const price = o.price;
        const currency = (o.currency || req.currency || 'USD').toUpperCase();
        const airline = (o.airline || '').toUpperCase() || '—';

        const card = document.createElement('div'); card.className='card';
        card.innerHTML = `
          <div class="row"><span class="tag">${airline}</span><strong style="margin-left:8px">${dep} → ${arr}</strong></div>
          <div class="muted small" style="margin:6px 0 12px">Indicative fare</div>
          <div class="row">
            <a class="btn" data-p="kiwi">Book — ${price} ${currency}</a>
            <a class="btn ghost" data-p="aviasales">Book (Aviasales)</a>
          </div>
        `;

        // Both buttons use /api/book with provider. Keeps your page open.
        const btnKiwi = card.querySelector('a[data-p="kiwi"]');
        const btnAvs  = card.querySelector('a[data-p="aviasales"]');
        for (const a of [btnKiwi, btnAvs]) {
          a.href = '#';
          a.target = '_blank'; a.rel='noopener';
          const provider = a.dataset.p;
          a.addEventListener('click', async (ev) => {
            ev.preventDefault();
            const q2 = new URLSearchParams({
              p: provider,
              from: dep, to: arr,
              date: req.date, return: req.ret,
              adults: String(req.adults),
              currency: currency
            });
            try {
              const r = await fetch('/api/book?' + q2.toString());
              const j = await r.json();
              if (j.ok && j.url) window.open(j.url, '_blank', 'noopener');
            } catch {}
          });
        }

        resEl.appendChild(card);
      });
    })
    .catch(e => { resEl.innerHTML = `<div class="card">Search failed: ${e.message}</div>`; });
  </script>
</body>
</html>
