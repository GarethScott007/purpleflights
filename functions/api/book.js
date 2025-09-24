// functions/api/book.js
const JH = { "content-type":"application/json; charset=utf-8", "cache-control":"no-store" };

export const onRequestGet = async ({ request, env }) => {
  const u = new URL(request.url);
  const provider = (u.searchParams.get("p") || String(env.BOOK_PROVIDER || "kiwi")).toLowerCase();

  const from = (u.searchParams.get("from") || "").toUpperCase();
  const to   = (u.searchParams.get("to") || "").toUpperCase();
  const date = u.searchParams.get("date") || "";
  const ret  = u.searchParams.get("return") || "";
  const adults = clamp(u.searchParams.get("adults"), 1, 9, 1);
  const currency = (u.searchParams.get("currency") || "USD").toUpperCase();
  const redirect = u.searchParams.get("redirect") === "1";

  if (!/^[A-Z]{3}$/.test(from) || !/^[A-Z]{3}$/.test(to) || !date) {
    return json({ ok:false, error:"missing/invalid params" }, 400);
  }

  let url = "";

  if (provider === "aviasales") {
    const q = new URLSearchParams();
    q.set("origin_iata", from);
    q.set("destination_iata", to);
    q.set("depart_date", date);
    if (ret) q.set("return_date", ret);
    q.set("currency", currency);
    if (env.TP_PARTNER_ID) q.set("marker", String(env.TP_PARTNER_ID));
    url = "https://www.aviasales.com/search?" + q.toString();
  } else {
    // --- KIWI: path-style deep link to RESULTS ---
    // This format typically opens the results list directly and overrides any previous session.
    const seg = `${from}-${to}/${date}${ret ? `/${ret}` : ""}`;
    const k = new URL(`https://www.kiwi.com/en/search/results/${seg}`);

    k.searchParams.set("adults", String(adults));
    // "cabin" is the param used by the path-style deeplink
    k.searchParams.set("cabin", "M");             // M = economy
    k.searchParams.set("currency", currency);
    // Quality-of-life hints
    k.searchParams.set("sortBy", "price");
    k.searchParams.set("limit", "60");

    if (env.KIWI_AFFILIATE_ID) {
      k.searchParams.set("affilid", String(env.KIWI_AFFILIATE_ID)); // e.g., c111.travelpayouts.com
    }

    url = k.toString();
  }

  if (redirect) return Response.redirect(url, 302);
  return json({ ok:true, url });
};

function clamp(v,min,max,def){ const n=parseInt(v||"",10); if(Number.isNaN(n)) return def; return Math.max(min,Math.min(max,n)); }
function json(obj,code=200){ return new Response(JSON.stringify(obj),{ status:code, headers:JH }); }
