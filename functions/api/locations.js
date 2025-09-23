// functions/api/locations.js
const JH = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };

export const onRequestGet = async ({ request }) => {
  const url = new URL(request.url);
  const q = (url.searchParams.get('q') || '').trim();
  if (!q) return new Response(JSON.stringify([]), { headers: JH });

  const api = `https://autocomplete.travelpayouts.com/places2?term=${encodeURIComponent(q)}&locale=en&types[]=city&types[]=airport&types[]=country`;
  const r = await fetch(api, { cf: { cacheTtl: 300, cacheEverything: true } });
  if (!r.ok) return new Response(JSON.stringify([]), { headers: JH });

  const list = await r.json();
  const data = (Array.isArray(list) ? list : []).map(x => ({
    code: x.code || x.iata_code || x.iata || '',
    name: x.name || x.city_name || x.city || x.country_name || '',
    country: x.country_name || x.country || '',
    type: x.type || '',
    city_code: x.city_code || (x.type === 'city' ? (x.code || '') : ''),
  })).filter(x => x.code && x.name);

  return new Response(JSON.stringify(data.slice(0, 20)), { headers: JH });
};
