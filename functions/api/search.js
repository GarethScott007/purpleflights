// functions/api/search.js
const JH = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };

export const onRequestPost = async ({ request, env }) => {
  const b = await safeJSON(request);
  const { from, to, date, ret = '', currency = 'USD', max = 50 } = b || {};

  const F = s => String(s || '').trim().toUpperCase();
  const from3 = F(from), to3 = F(to), cur = F(currency);
  if (!/^[A-Z]{3}$/.test(from3) || !/^[A-Z]{3}$/.test(to3)) return json({ ok:false, error:'Invalid from/to IATA' }, 400);
  if (!date) return json({ ok:false, error:'from,to,date required' }, 400);

  const token = env.TP_TOKEN; if (!token) return json({ ok:false, error:'Missing TP_TOKEN' }, 500);

  const depMonth = date.slice(0,7), retMonth = ret.slice(0,7);
  const tries = [];
  if (retMonth) tries.push(() => pricesForDates({ token, origin: from3, destination: to3, departure_at: depMonth, return_at: retMonth, currency: cur, limit: max }));
  tries.push(() => pricesForCalendar({ token, origin: from3, destination: to3, month: depMonth, currency: cur, limit: max }));
  tries.push(() => pricesForDates({ token, origin: from3, destination: to3, departure_at: depMonth, return_at: '', currency: cur, limit: max }));

  for (const fn of tries) {
    const r = await fn();
    if (r.error) return json(r, 502);
    if (r.data?.length) return json(r);
  }
  return json({ data: [] });
};

async function pricesForDates({ token, origin, destination, departure_at, return_at, currency, limit }) {
  const u = new URL('https://api.travelpayouts.com/aviasales/v3/prices_for_dates');
  u.searchParams.set('origin', origin); u.searchParams.set('destination', destination);
  if (departure_at) u.searchParams.set('departure_at', departure_at);
  if (return_at)    u.searchParams.set('return_at', return_at);
  u.searchParams.set('unique', 'false'); u.searchParams.set('sorting', 'price');
  u.searchParams.set('limit', String(Math.min(Number(limit) || 30, 50)));
  u.searchParams.set('token', token); u.searchParams.set('currency', currency.toLowerCase());
  return safeFetchMap(u, j => (Array.isArray(j?.data) ? j.data : []).map(t => ({
    origin: t.origin, destination: t.destination, price: t.price,
    currency: j.currency || currency || 'USD',
    depart_date: t.departure_at || null, return_date: t.return_at || '', duration: t.duration || null,
    airline: (t.airline || t.validating_carrier || '').toUpperCase() || null,
  })));
}
async function pricesForCalendar({ token, origin, destination, month, currency, limit }) {
  const u = new URL('https://api.travelpayouts.com/aviasales/v3/prices_for_calendar');
  u.searchParams.set('origin', origin); u.searchParams.set('destination', destination);
  if (month) u.searchParams.set('month', month);
  u.searchParams.set('calendar_type', 'departure_date');
  u.searchParams.set('limit', String(Math.min(Number(limit) || 30, 50)));
  u.searchParams.set('token', token); u.searchParams.set('currency', currency.toLowerCase());
  return safeFetchMap(u, j => (Array.isArray(j?.data) ? j.data : []).map(t => ({
    origin: t.origin, destination: t.destination, price: t.price,
    currency: j.currency || currency || 'USD',
    depart_date: t.departure_at || t.depart_date || month, return_date: t.return_at || '', duration: t.duration || null,
    airline: (t.airline || t.validating_carrier || '').toUpperCase() || null,
  })));
}
async function safeFetchMap(url, mapFn){
  try{
    const r = await fetch(url.toString(),{ headers:{ accept:'application/json' }, cf:{ cacheTtl:300, cacheEverything:true } });
    const ct = r.headers.get('content-type') || ''; const raw = await r.text();
    if (!ct.includes('application/json')) { const preview = raw.slice(0,120).replace(/\s+/g,' ').trim(); return { data:[], error:`Upstream non-JSON (${r.status}) — ${preview||'no body'}` }; }
    let j; try{ j = JSON.parse(raw); }catch(e){ return { data:[], error:`Upstream JSON parse failed — ${e.message}` }; }
    return { data: mapFn(j) || [] };
  }catch(e){ return { data:[], error:e.message || 'fetch failed' }; }
}
function json(obj, code=200){ return new Response(JSON.stringify(obj),{ status:code, headers:JH }); }
async function safeJSON(req){ try{ return await req.json(); }catch{ return null; } }
