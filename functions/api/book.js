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
    const seg = `${from}-${to}/${date}${ret ? `/${ret}` : ""}`;
    const q = new URLSearchParams();
    q.set("adults", String(adults));
    q.set("cabin", "M");
    q.set("currency", currency);
    if (env.KIWI_AFFILIATE_ID) q.set("affilid", String(env.KIWI_AFFILIATE_ID)); // e.g. c111.travelpayouts.com
    url = `https://www.kiwi.com/en/search/results/${seg}?` + q.toString();
  }

  if (redirect) return Response.redirect(url, 302);
  return json({ ok:true, url });
};

function clamp(v,min,max,def){ const n=parseInt(v||"",10); if(Number.isNaN(n)) return def; return Math.max(min,Math.min(max,n)); }
function json(obj,code=200){ return new Response(JSON.stringify(obj),{ status:code, headers:JH }); }
