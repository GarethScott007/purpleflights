// functions/api/book.js
const JH = { "content-type":"application/json; charset=utf-8", "cache-control":"no-store" };

export const onRequestGet = async ({ request, env }) => {
  const u = new URL(request.url);
  const p = (u.searchParams.get("p") || String(env.BOOK_PROVIDER || "kiwi")).toLowerCase();

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
  if (p === "aviasales") {
    const q = new URLSearchParams();
    q.set("origin_iata", from);
    q.set("destination_iata", to);
    q.set("depart_date", date);
    if (ret) q.set("return_date", ret);
    q.set("currency", currency);
    if (env.TP_PARTNER_ID) q.set("marker", String(env.TP_PARTNER_ID));
    url = "https://www.aviasales.com/search?" + q.toString();
  } else {
    // Kiwi: query-style deep link that goes straight to RESULTS
    const k = new URL("https://www.kiwi.com/en/search/results");
    // Trip window – pin to the chosen day
    k.searchParams.set("from", from);
    k.searchParams.set("to", to);
    k.searchParams.set("dateFrom", date);
    k.searchParams.set("dateTo", date);
    if (ret) { k.searchParams.set("returnFrom", ret); k.searchParams.set("returnTo", ret); }

    // Passengers & prefs
    k.searchParams.set("adults", String(adults));
    k.searchParams.set("cabinClass", "economy");
    k.searchParams.set("currency", currency);
    // Optional hints that often help load results view immediately
    k.searchParams.set("sortBy", "price");
    k.searchParams.set("limit", "60");

    // Attribution
    if (env.KIWI_AFFILIATE_ID) k.searchParams.set("affilid", String(env.KIWI_AFFILIATE_ID));

    url = k.toString();
  }

  if (redirect) return Response.redirect(url, 302);
  return json({ ok:true, url });
};

function clamp(v,min,max,def){ const n=parseInt(v||"",10); if(Number.isNaN(n)) return def; return Math.max(min,Math.min(max,n)); }
function json(obj,code=200){ return new Response(JSON.stringify(obj),{ status:code, headers:JH }); }
