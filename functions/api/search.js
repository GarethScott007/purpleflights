// functions/api/search.js
const JH = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };

export const onRequestPost = async ({ request, env }) => {
  const b = await safeJSON(request);
  const { from, to, date, ret = '', currency = 'USD', max = 30 } = b || {};

  // --- strict IATA (3 letters) guard + normalize ---
  const F = (s) => String(s || '').trim().toUpperCase();
  const from3 = F(from), to3 = F(to);
  if (!/^[A-Z]{3}$/.test(from3) || !/^[A-Z]{3}$/.test(to3)) {
    return json({ ok: false, error: 'Invalid from/to: must be 3-letter IATA (e.g., BKK, LON, SIN)' }, 400);
  }
  if (!date) return json({ ok: false, error: 'from,to,date required' }, 400);

  const token = env.TP_TOKEN;
  if (!token) return json({ ok: false, error: 'Missing TP_TOKEN env var' }, 500);

  // broaden to month (YYYY-MM) for better hit rate
  const depMonth = (date || '').slice(0, 7);
  const retMonth = (ret || '').slice(0, 7);

  // 1) round-trip month (if return provided)
  if (retMonth) {
    const r1 = await searchByPrice({ token, from: from3, to: to3, departure_at: depMonth, return_at: retMonth, currency, max });
    if (r1.data.length) return json(r1);
  }

  // 2) one-way month
  const r2 = await searchByPrice({ token, from: from3, to: to3, departure_at: depMonth, return_at: '', currency, max });
  return json(r2);
};

async function searchByPrice({ token, from, to, departure_at, return_at, currency, max }) {
  const u = new URL('https://api.travelpayouts.com/aviasales/v3/search_by_price');
  u.searchParams.set('origin', from);
  u.searchParams.set('destination', to);
  u.searchParams.set('one_way', String(!return_at));
  if (departure_at) u.searchParams.set('departure_at', departure_at); // YYYY-MM
  if (return_at) u.searchParams.set('return_at', return_at);          // YYYY-MM
  u.searchParams.set('currency', String(currency || 'usd').toLowerCase());
  u.searchParams.set('limit', String(Math.min(Number(max) || 30, 50)));
  u.searchParams.set('token', token);

  try {
    const r = await fetch(u, { cf: { cacheTtl: 180, cacheEverything: true } });
    // If the API ever returns non-JSON, this will throw and we surface a clean error above.
    const j = await r.json();
    const tickets = Array.isArray(j?.data) ? j.data.map(t => ({
      origin: t.origin,
      destination: t.destination,
      price: t.price,
      currency: j.currency || currency || 'USD',
      depart_date: t.departure_at || departure_at,
      return_date: t.return_at || return_at || '',
      duration: t.duration || null,
      airline: (t.airline || t.validating_carrier || '').toUpperCase() || null,
    })) : [];
    return { data: tickets };
  } catch (e) {
    return { data: [], error: e.message || 'search failed' };
  }
}

function json(obj, code = 200) {
  return new Response(JSON.stringify(obj), { status: code, headers: JH });
}
async function safeJSON(req) { try { return await req.json(); } catch { return null; } }
