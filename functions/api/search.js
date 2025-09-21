// functions/api/search.js
const JH = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };

export const onRequestPost = async ({ request, env }) => {
  const b = await safeJSON(request);
  const { from, to, date, ret = '', currency = 'USD', max = 30 } = b || {};

  // --- strict IATA guard + normalize ---
  const F = (s) => String(s || '').trim().toUpperCase();
  const from3 = F(from), to3 = F(to);
  if (!/^[A-Z]{3}$/.test(from3) || !/^[A-Z]{3}$/.test(to3)) {
    return json({ ok: false, error: 'Invalid from/to: must be 3-letter IATA (e.g., BKK, LON, SIN)' }, 400);
  }
  if (!date) return json({ ok: false, error: 'from,to,date required' }, 400);

  const token = env.TP_TOKEN;
  if (!token) return json({ ok: false, error: 'Missing TP_TOKEN env var' }, 500);

  // month-broadened YYYY-MM
  const depMonth = date.slice(0, 7);
  const retMonth = ret.slice(0, 7);

  // Try endpoints in order (stop on first non-empty data)
  const tries = [];

  // 1) Roundtrip month (prices_for_dates)
  if (retMonth) tries.push(() => pricesForDates({ token, origin: from3, destination: to3, departure_at: depMonth, return_at: retMonth, currency, limit: max }));

  // 2) Calendar month (dense)
  tries.push(() => pricesForCalendar({ token, origin: from3, destination: to3, month: depMonth, currency, limit: max }));

  // 3) One-way month (prices_for_dates)
  tries.push(() => pricesForDates({ token, origin: from3, destination: to3, departure_at: depMonth, return_at: '', currency, limit: max }));

  for (const fn of tries) {
    const r = await fn();
    if (r.error) return json(r, 502);           // surface clear upstream error
    if (r.data && r.data.length) return json(r);
  }
  return json({ data: [] }); // empty but valid
};

/* ---------- Endpoint helpers ---------- */

async function pricesForDates({ token, origin, destination, departure_at, return_at, currency, limit }) {
  const u = new URL('https://api.travelpayouts.com/aviasales/v3/prices_for_dates');
  u.searchParams.set('origin', origin);
  u.searchParams.set('destination', destination);
  if (departure_at) u.searchParams.set('departure_at', departure_at);  // YYYY-MM or YYYY-MM-DD
  if (return_at)    u.searchParams.set('return_at', return_at);        // YYYY-MM or YYYY-MM-DD
  u.searchParams.set('unique', 'false');
  u.searchParams.set('sorting', 'price');
  u.searchParams.set('limit', String(Math.min(Number(limit) || 30, 50)));
  u.searchParams.set('token', token);
  if (currency) u.searchParams.set('currency', String(currency).toLowerCase());

  return safeFetchMap(u, (j) => {
    const arr = Array.isArray(j?.data) ? j.data : [];
    return arr.map(t => ({
      origin: t.origin,
      destination: t.destination,
      price: t.price,
      currency: j.currency || currency || 'USD',
      depart_date: t.departure_at || null,
      return_date: t.return_at || '',
      duration: t.duration || null,
      airline: (t.airline || t.validating_carrier || '').toUpperCase() || null,
    }));
  });
}

async function pricesForCalendar({ token, origin, destination, month, currency, limit }) {
  const u = new URL('https://api.travelpayouts.com/aviasales/v3/prices_for_calendar');
  u.searchParams.set('origin', origin);
  u.searchParams.set('destination', destination);
  if (month) u.searchParams.set('month', month);           // YYYY-MM
  u.searchParams.set('calendar_type', 'departure_date');   // denser coverage
  u.searchParams.set('limit', String(Math.min(Number(limit) || 30, 50)));
  u.searchParams.set('token', token);
  if (currency) u.searchParams.set('currency', String(currency).toLowerCase());

  return safeFetchMap(u, (j) => {
    const arr = Array.isArray(j?.data) ? j.data : [];
    return arr.map(t => ({
      origin: t.origin,
      destination: t.destination,
      price: t.price,
      currency: j.currency || currency || 'USD',
      depart_date: t.departure_at || t.depart_date || month,
      return_date: t.return_at || '',
      duration: t.duration || null,
      airline: (t.airline || t.validating_carrier || '').toUpperCase() || null,
    }));
  });
}

/* ---------- Shared fetch + robust JSON handling ---------- */
async function safeFetchMap(url, mapFn) {
  try {
    const r = await fetch(url.toString(), {
      headers: { 'accept': 'application/json' },
      cf: { cacheTtl: 300, cacheEverything: true },
    });
    const ct = r.headers.get('content-type') || '';
    const raw = await r.text();
    if (!ct.includes('application/json')) {
      const preview = raw.slice(0, 200).replace(/\s+/g, ' ').trim();
      return { data: [], error: `Upstream non-JSON (${r.status}) — ${preview || 'no body'}` };
    }
    let j; try { j = JSON.parse(raw); } catch (e) {
      return { data: [], error: `Upstream JSON parse failed — ${e.message}` };
    }
    const data = mapFn(j) || [];
    return { data };
  } catch (e) {
    return { data: [], error: e.message || 'fetch failed' };
  }
}

/* ---------- utils ---------- */
function json(obj, code = 200) { return new Response(JSON.stringify(obj), { status: code, headers: JH }); }
async function safeJSON(req) { try { return await req.json(); } catch { return null; } }
