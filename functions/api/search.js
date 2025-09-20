// functions/api/search.js
const JH = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };

export const onRequestPost = async ({ request, env }) => {
  const b = await safeJSON(request);
  const { from, to, date, ret = '', currency = 'USD', max = 20 } = b || {};
  if (!from || !to || !date) return json({ ok: false, error: 'from,to,date required' }, 400);

  // Travelpayouts (Aviasales) v3 – indicative prices
  const token = env.TP_TOKEN;
  if (!token) return json({ ok: false, error: 'Missing TP_TOKEN env var' }, 500);

  const u = new URL('https://api.travelpayouts.com/aviasales/v3/search_by_price');
  u.searchParams.set('origin', from.toUpperCase());
  u.searchParams.set('destination', to.toUpperCase());
  u.searchParams.set('one_way', String(!ret));
  u.searchParams.set('departure_at', date);
  if (ret) u.searchParams.set('return_at', ret);
  u.searchParams.set('currency', String(currency || 'usd').toLowerCase());
  u.searchParams.set('limit', String(Math.min(Number(max) || 20, 50)));
  u.searchParams.set('token', token);

  try {
    const r = await fetch(u, { cf: { cacheTtl: 180, cacheEverything: true } });
    const j = await r.json();
    const tickets = Array.isArray(j?.data) ? j.data.map(t => ({
      origin: t.origin,
      destination: t.destination,
      price: t.price,
      currency: j.currency || currency || 'USD',
      depart_date: t.departure_at || date,
      return_date: t.return_at || '',
      duration: t.duration || null,
      airline: t.airline || t.validating_carrier || null,
    })) : [];
    return json({ data: tickets });
  } catch (e) {
    return json({ ok: false, error: e.message || 'search failed' }, 502);
  }
};

function json(obj, code = 200) {
  return new Response(JSON.stringify(obj), { status: code, headers: JH });
}
async function safeJSON(req) { try { return await req.json(); } catch { return null; } }
