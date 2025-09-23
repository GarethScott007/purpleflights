// functions/api/locations.js
const JH = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store" // disable caching while we stabilize
};

// Fallback list (includes CITY + AIRPORT rows so "bang" / "london" work)
const FALLBACK = [
  // Bangkok
  { code:"BKK", name:"Bangkok",      country:"Thailand",        type:"city",    city_code:"BKK" },
  { code:"BKK", name:"Suvarnabhumi", country:"Thailand",        type:"airport", city_code:"BKK" },
  { code:"DMK", name:"Don Mueang",   country:"Thailand",        type:"airport", city_code:"BKK" },
  // Phuket / Chiang Mai
  { code:"HKT", name:"Phuket",       country:"Thailand",        type:"city",    city_code:"HKT" },
  { code:"HKT", name:"Phuket",       country:"Thailand",        type:"airport", city_code:"HKT" },
  { code:"CNX", name:"Chiang Mai",   country:"Thailand",        type:"city",    city_code:"CNX" },
  { code:"CNX", name:"Chiang Mai",   country:"Thailand",        type:"airport", city_code:"CNX" },

  // London
  { code:"LON", name:"London (All Airports)", country:"United Kingdom", type:"city",    city_code:"LON" },
  { code:"LHR", name:"Heathrow",     country:"United Kingdom", type:"airport", city_code:"LON" },
  { code:"LGW", name:"Gatwick",      country:"United Kingdom", type:"airport", city_code:"LON" },
  { code:"LTN", name:"Luton",        country:"United Kingdom", type:"airport", city_code:"LON" },
  { code:"STN", name:"Stansted",     country:"United Kingdom", type:"airport", city_code:"LON" },

  // Region neighbors
  { code:"SIN", name:"Singapore",    country:"Singapore",       type:"city",    city_code:"SIN" },
  { code:"SIN", name:"Changi",       country:"Singapore",       type:"airport", city_code:"SIN" },
  { code:"KUL", name:"Kuala Lumpur", country:"Malaysia",        type:"city",    city_code:"KUL" },
  { code:"KUL", name:"Kuala Lumpur", country:"Malaysia",        type:"airport", city_code:"KUL" },
  { code:"HKG", name:"Hong Kong",    country:"Hong Kong SAR",   type:"city",    city_code:"HKG" },
  { code:"HKG", name:"Hong Kong",    country:"Hong Kong SAR",   type:"airport", city_code:"HKG" }
];

export const onRequestGet = async ({ request }) => {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").trim();
  const limit = clamp(parseInt(url.searchParams.get("limit") || "20", 10), 1, 50);

  // Require 2+ chars to limit noise; still returns [] not an object
  if (q.length < 2) return json([]);

  try {
    // Travelpayouts cities + airports
    const api = `https://autocomplete.travelpayouts.com/places2?term=${encodeURIComponent(q)}&locale=en&types[]=city&types[]=airport`;
    const r = await fetch(api, { cf: { cacheTtl: 120, cacheEverything: true } });
    if (!r.ok) throw new Error("upstream not ok");
    const arr = await r.json();

    let list = Array.isArray(arr) ? arr.map(normalize).filter(validRow) : [];
    // Rank: city that startsWith(q) > airport startsWith > contains
    const ql = q.toLowerCase();
    list.sort((a,b) => score(a, ql) - score(b, ql) || a.name.localeCompare(b.name));

    // De-dupe by (code|name)
    const seen = new Set();
    list = list.filter(x => {
      const k = `${x.code}|${x.name}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    // Return plain array (your autocomplete expects an array, not {results:...})
    return json(list.slice(0, limit));
  } catch {
    // Fallback while upstream is unavailable or blocked
    const ql = q.toLowerCase();
    let list = FALLBACK.filter(r =>
      r.code.toLowerCase().includes(ql) ||
      r.name.toLowerCase().includes(ql) ||
      (r.country||"").toLowerCase().includes(ql)
    );
    list.sort((a,b) => score(a, ql) - score(b, ql) || a.name.localeCompare(b.name));
    return json(list.slice(0, limit));
  }
};

/* ---------- helpers ---------- */
function normalize(x){
  const type = (x.type || "").toLowerCase() === "city" ? "city" : "airport";
  const code = String(x.code || x.iata_code || x.iata || "").toUpperCase();
  const cityCode = String(x.city_code || (type === "city" ? code : "")).toUpperCase();
  const country = x.country_name || x.country || x.country_code || "";
  const name = (type === "city" ? (x.name || x.city_name || "") : (x.name || x.city_name || "")) || "";
  return { code, name, country, type, city_code: cityCode || code };
}
function validRow(r){
  return !!(r && r.code && r.name);
}
function score(item, ql){
  // lower is better
  const name = (item.name||"").toLowerCase();
  const code = (item.code||"").toLowerCase();
  const city = (item.city_code||"").toLowerCase();

  const starts = (name.startsWith(ql) || code.startsWith(ql) || city.startsWith(ql)) ? 0 : 1;
  const contains = (name.includes(ql) || code.includes(ql) || city.includes(ql)) ? 0 : 1;
  const kind = item.type === "city" ? 0 : 1; // prefer city over airport on ties
  return starts*10 + kind*2 + contains;
}
function clamp(n,min,max){ n = Number.isFinite(n)?n:min; return Math.max(min, Math.min(max, n)); }
function json(data){ return new Response(JSON.stringify(data), { headers: JH }); }
