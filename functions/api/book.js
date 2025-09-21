// functions/api/book.js
const JH = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

export const onRequestGet = async ({ request, env }) => {
  const u = new URL(request.url);

  // provider: kiwi | aviasales (default from env if missing)
  const provider = (u.searchParams.get("p") || String(env.BOOK_PROVIDER || "kiwi"))
    .toLowerCase();

  const from = (u.searchParams.get("from") || "").toUpperCase();
  const to   = (u.searchParams.get("to") || "").toUpperCase();
  const date = u.searchParams.get("date") || "";
  const ret  = u.searchParams.get("return") || "";
  const adults = clamp(u.searchParams.get("adults"), 1, 9, 1);
  const currency = (u.searchParams.get("currency") || "USD").toUpperCase();

  // Validate
  if (!/^[A-Z]{3}$/.test(from) || !/^[A-Z]{3}$/.test(to) || !date) {
    return json({ ok: false, error: "missing/invalid params" }, 400);
  }

  if (provider === "aviasales") {
    // Aviasales deep link
    const q = new URLSearchParams();
    q.set("origin_iata", from);
    q.set("destination_iata", to);
    q.set("depart_date", date);
    if (ret) q.set("return_date", ret);
    q.set("currency", currency);
    if (env.TP_PARTNER_ID) q.set("marker", String(env.TP_PARTNER_ID)); // your TP marker
    return json({ ok: true, url: "https://www.aviasales.com/search?" + q.toString() });
  }

  // Default: Kiwi deep link
  const seg = `${from}-${to}/${date}${ret ? `/${ret}` : ""}`;
  const q = new URLSearchParams();
  q.set("adults", String(adults));
  q.set("cabin", "M"); // economy
  q.set("currency", currency);
  if (env.KIWI_AFFILIATE_ID) q.set("affilid", String(env.KIWI_AFFILIATE_ID)); // your Kiwi/TP affil id
  return json({ ok: true, url: `https://www.kiwi.com/en/search/results/${seg}?` + q.toString() });
};

function clamp(v, min, max, def) {
  const n = parseInt(v || "", 10);
  if (Number.isNaN(n)) return def;
  return Math.max(min, Math.min(max, n));
}
function json(obj, code = 200) {
  return new Response(JSON.stringify(obj), { status: code, headers: JH });
}
