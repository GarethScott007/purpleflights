// functions/api/search.js
const JH = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };

export const onRequestPost = async ({ request, env }) => {
  try {
    const b = await safeJSON(request);
    const { from, to, date, ret = '', currency = 'USD', max = 50 } = b || {};

    const F = s => String(s || '').trim().toUpperCase();
    const from3 = F(from), to3 = F(to), cur = F(currency);
    if (!/^[A-Z]{3}$/.test(from3) || !/^[A-Z]{3}$/.test(to3)) {
      return ok({ data: [], error: 'Invalid from/to IATA (3 letters required)' });
    }
    if (!date) return ok({ data: [], error: 'from,to,date required' });

    const token = env.TP_TOKEN;
    if (!token) return ok({ data: [], error: 'Missing TP_TOKEN env var' });

    const depMonth = date.slice(0, 7), retMonth = ret.slice(0, 7);

    // Try round-trip month, then calendar, then one-way month
    const tries = [];
    if (retMonth) tries.push(() => pricesForDates({ token, origin: from3, destination: to3, departure_at: depMonth, return_at: retMonth, currency: cur, limit: max }));
    tries.push(() => pricesForCalendar({ token, origin: from3, destination: to3, month: depMonth, currency: cur, limit: max }));
    tries.push(() => pricesForDates({ token, origin: from3, destination: to3, departure_at: depMonth, return_at: '', currency: cur, limit: max }));

    for (const fn of tries) {
      const r = await fn();
      if (r.error) return ok({ data: [], error: r.error });
      if (r.data?.length) return ok({ data: r.data });
    }
    return ok({ data: [] });
  } catch (e) {
    return ok({ data: [], error: `server exception: ${String(e && e.message || e)}` });
  }
};

// ---- helpers ----
async function pricesForDates({ token, origin, destination, departure_at, return_at, currency, limit }) {
  const u = new URL('https://api.travelpayouts.com/aviasales/v3/prices_for_dates');
  u.searchParams.set('origin', origin);
  u.searchParams.set('destination', destination);
  if (departure_at) u.searchParams.set('departure_at', departure_at);   // YYYY-MM
  if (return_at)    u.searchParams.set('return_at', return_at);         // YYYY-MM
  u.searchParams.set('unique', 'false');
  u.searchParams.set('sorting', 'price');
  u.searchParams.set('limit', String(Math.min(Number(limit) || 30, 50)));
  u.searchParams.set('token', token);
  u.searchParams.set('currency', currency.toLowerCase());
  return safeFetchMap(u, currency);
}

async function pricesForCalendar({ token, origin, destination, month, currency, limit }) {
  const u = new URL('https://api.travelpayouts.com/aviasales/v3/prices_for_calendar');
  u.searchParams.set('origin', origin);
  u.searchParams.set('destination', destination);
  if (month) u.searchParams.set('month', month);          // YYYY-MM
  u.searchParams.set('calendar_type', 'departure_date');
  u.searchParams.set('limit', String(Math.min(Number(limit) || 30, 50)));
  u.searchParams.set('token', token);
  u.searchParams.set('currency', currency.toLowerCase());
  return safeFetchMap(u, currency);
}

async function safeFetchMap(url, cur) {
  try {
    const r = await fetch(url.toString(), { headers: { accept: 'application/json' }, cf: { cacheTtl: 300, cacheEverything: true } });
    const ct = r.headers.get('content-type') || '';
    const raw = await r.text();
    if (!r.ok) {
      return { data: [], error: `upstream ${r.status} ${r.statusText} — ${raw.slice(0, 160).replace(/\s+/g, ' ')}` };
    }
    if (!ct.includes('application/json')) {
      return { data: [], error: `upstream non-JSON (${r.status}) — ${raw.slice(0, 160).replace(/\s+/g, ' ')}` };
    }
    let j;
    try { j = JSON.parse(raw); }
    catch (e) { return { data: [], error: `JSON parse failed — ${String(e && e.message || e)}` }; }

    const arr = Array.isArray(j?.data) ? j.data : [];
    const out = arr.map(t => ({
      origin: t.origin,
      destination: t.destination,
      price: t.price,
      currency: j.currency || cur || 'USD',
      depart_date: t.departure_at || t.depart_date || null,
      return_date: t.return_at || '',
      duration: t.duration || null,
      airline: (t.airline || t.validating_carrier || '').toUpperCase() || null,
    }));
    return { data: out };
  } catch (e) {
    return { data: [], error: `fetch failed — ${String(e && e.message || e)}` };
  }
}

function ok(obj){ return new Response(JSON.stringify(obj), { status: 200, headers: JH }); }
async function safeJSON(req){ try { return await req.json(); } catch { return null; } }
