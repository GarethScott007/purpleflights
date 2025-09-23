// functions/api/locations.js
const JH = {
  "content-type": "application/json; charset=utf-8",
  // short cache; tweak if you want
  "cache-control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
};

// Small fallback (Thailand + neighbors) if API is down
const FALLBACK = [
  { code: "BKK", name: "Bangkok", country: "Thailand", type: "city",    city_code: "BKK" },
  { code: "BKK", name: "Suvarnabhumi", country: "Thailand", type: "airport", city_code: "BKK" },
  { code: "DMK", name: "Don Mueang",   country: "Thailand", type: "airport", city_code: "BKK" },
  { code: "HKT", name: "Phuket",       country: "Thailand", type: "city",    city_code: "HKT" },
  { code: "HKT", name: "Phuket",       country: "Thailand", type: "airport", city_code: "HKT" },
  { code: "CNX", name: "Chiang Mai",   country: "Thailand", type: "city",    city_code: "CNX" },
  { code: "SIN", name: "Singapore",    country: "Singapore",type: "city",    city_code: "SIN" },
  { code: "SIN", name: "Changi",       country: "Singapore",type: "airport", city_code: "SIN" },
  { code: "KUL", name: "Kuala Lumpur", country: "Malaysia", type: "city",    city_code: "KUL" },
  { code: "KUL", name: "Kuala Lumpur", country: "Malaysia", type: "airport", city_code: "KUL" },
  { code: "LON", name: "London",       country: "United Kingdom", type: "city", city_code: "LON" },
  { code: "LHR", name: "Heathrow",     country: "United Kingdom", type: "airport", city_code: "LON" },
  { code: "LGW", name: "Gatwick",      country: "United Kingdom", type: "airport", city_code: "LON" },
];

export const onRequestGet = async ({ request }) => {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").trim();
  const limit = clamp(parseInt(url.searchParams.get("limit") || "20", 10), 1, 50);

  // guard
  if (q.length < 2) {
    return new Response(JSON.stringify([]), { headers: JH });
  }

  try {
    const api = `https://autocomplete.travelpayouts.com/places2?term=${encodeURIComponent(q)}&locale=en&types[]=city&types[]=airport`;
    const r = await fetch(api, { cf: { cacheTtl: 300, cacheEverything: true } });
    if (!r.ok) throw new Error("upstream not ok");
    const raw = await r.json();

    // Shape to the exact structure your autocomplete.js expects
    let list = Array.isArray(raw) ? raw.map(x => normalize(x)) : [];
    list = list.filter(x => x.code && x.name);

    // De-duplicate (code + name)
    const seen = new Set();
    list = list.filter(x => {
      const key = `${x.code}|${x.name}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Rank: city that starts-with > airport that starts-with > contains
    const ql = q.toLowerCase();
    list.sort((a, b) => score(a, ql) - score(b, ql) || a.name.localeCompare(b.name));

    return new Response(JSON.stringify(list.slice(0, limit)), { headers: JH });
  } catch {
    // fallback (still searchable)
    const ql = q.toLowerCase();
    let list = FALLBACK.filter(r =>
      r.code.toLowerCase().includes(ql) ||
      r.name.toLowerCase().includes(ql) ||
      (r.country || "").toLowerCase().includes(ql)
    );
    list.sort((a, b) => score(a, ql) - score(b, ql) || a.name.localeCompare(b.name));
    return new Response(JSON.stringify(list.slice(0, limit)), { headers: JH });
  }
};

// ------- helpers -------
function normalize(x) {
  // Travelpayouts places2 fields vary: name, code, type ('city'|'airport'), country_name, city_name, city_code, iata_code
  const code = (x.code || x.iata_code || x.iata || "").toUpperCase();
  const type = (x.type || "").toLowerCase() === "city" ? "city" : "airport";
  const cityCode = (x.city_code || (type === "city" ? code : (x.city_code || ""))).toUpperCase();
  const country = x.country_name || x.country || x.country_code || "";
  // Prefer city name when type is city; for airports prefer airport name, fallback to city_name
  const name =
    (type === "city"
      ? (x.name || x.city_name || "")
      : (x.name || x.city_name || "")) || "";

  return {
    code,
    name,
    country,
    type,        // 'city' | 'airport'
    city_code: cityCode || code,
  };
}

function score(item, ql) {
  const n = (item.name || "").toLowerCase();
  const c = (item.code || "").toLowerCase();
  const city = (item.city_code || "").toLowerCase();

  // starts-with (city/city_code/name/code) gets priority; cities rank before airports on ties
  const starts =
    (n.startsWith(ql) || c.startsWith(ql) || city.startsWith(ql)) ? 0 : 1;
  const contains =
    (n.includes(ql) || c.includes(ql) || city.includes(ql)) ? 0 : 1;

  // city preferred
  const kind = item.type === "city" ? 0 : 1;

  // total: lower is better
  return starts * 10 + kind * 2 + contains;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, Number.isFinite(n) ? n : min));
}
