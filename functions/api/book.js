// functions/api/book.js
const JH = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };

export const onRequestGet = async ({ request, env }) => {
  const u = new URL(request.url);
  const from = (u.searchParams.get('from') || '').toUpperCase();
  const to = (u.searchParams.get('to') || '').toUpperCase();
  const date = u.searchParams.get('date') || '';
  const ret = u.searchParams.get('return') || '';
  if (!from || !to || !date) return json({ ok: false, error: 'missing params' }, 400);

  const qs = new URLSearchParams();
  qs.set('origin_iata', from);
  qs.set('destination_iata', to);
  qs.set('depart_date', date);
  if (ret) qs.set('return_date', ret);
  if (env.TP_PARTNER_ID) qs.set('marker', String(env.TP_PARTNER_ID));

  const url = 'https://www.aviasales.com/search?' + qs.toString();
  return json({ ok: true, url });
};

function json(obj, code = 200) {
  return new Response(JSON.stringify(obj), { status: code, headers: JH });
}
