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
    // Aviasales deep link
    const q = new URLSearchParams();
    q.set("origin_iata", from);
    q.set("destination_iata", to);
    q.set("depart_date", date);
    if (ret) q.set("return_date", ret);
    q.set("currency", currency);
    if (env.TP_PARTNER_ID) q.set("marker", String(env.TP_PARTNER_ID));
    url = "https://www.aviasales.com/search?" + q.toString();
  } else {
    // Kiwi results URL (deep)
    const seg = `${from}-${to}/${date}${ret ? `/${ret}` : ""}`;
    const kiwiDeep = `https://www.kiwi.com/en/search/results/${seg}?adults=${adults}&cabin=M&currency=${currency}`;

    // Prefer TP click wrapper if provided AND valid for this project.
    // If TP rejects it, the link will still open the click host but show "custom url is not valid".
    // To avoid that, we only use click wrapper when the env is set AND a plain allowlist fallback isn't requested.
    if (env.KIWI_TP_CLICK_BASE) {
      const base = String(env.KIWI_TP_CLICK_BASE).trim();
      const prefix = base.endsWith("custom_url=") ? base : base + (base.includes("?") ? "" : "?") + "custom_url=";
      url = prefix + encodeURIComponent(kiwiDeep);
    } else if (env.KIWI_AFFILIATE_ID) {
      // Fallback: plain Kiwi with affilid (works even if TP click blocks the custom URL)
      const q = new URLSearchParams();
      q.set("adults", String(adults));
      q.set("cabin", "M");
      q.set("currency", currency);
      q.set("affilid", String(env.KIWI_AFFILIATE_ID)); // e.g. c111.travelpayouts.com
      url = `https://www.kiwi.com/en/search/results/${seg}?` + q.toString();
    } else {
      // No tracking configured; still deep-link
      url = kiwiDeep;
    }
  }

  if (redirect) return Response.redirect(url, 302);
  return json({ ok:true, url });
};

function clamp(v,min,max,def){ const n=parseInt(v||"",10); if(Number.isNaN(n)) return def; return Math.max(min,Math.min(max,n)); }
function json(obj,code=200){ return new Response(JSON.stringify(obj),{ status:code, headers:JH }); }
