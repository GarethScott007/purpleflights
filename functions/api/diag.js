// functions/api/diag.js
const JH = { "content-type":"application/json; charset=utf-8", "cache-control":"no-store" };

export const onRequestGet = async ({ request, env }) => {
  const u = new URL(request.url);
  const from = (u.searchParams.get("from") || "BKK").toUpperCase();
  const to   = (u.searchParams.get("to")   || "LON").toUpperCase();
  const date =  u.searchParams.get("date") || "2025-10-01";
  const ret  =  u.searchParams.get("ret")  || "2025-11-01";
  const cur  = (u.searchParams.get("currency") || "GBP").toUpperCase();

  // Aviasales direct deep link (with marker & currency)
  const avs = new URL("https://www.aviasales.com/search");
  avs.searchParams.set("origin_iata", from);
  avs.searchParams.set("destination_iata", to);
  avs.searchParams.set("depart_date", date);
  if (ret) avs.searchParams.set("return_date", ret);
  avs.searchParams.set("currency", cur);
  if (env.TP_PARTNER_ID) avs.searchParams.set("marker", String(env.TP_PARTNER_ID));

  // Kiwi direct deep link (with affilid slug)
  const kiwi = new URL(`https://www.kiwi.com/en/search/results/${from}-${to}/${date}${ret?`/${ret}`:''}`);
  kiwi.searchParams.set("adults", "1");
  kiwi.searchParams.set("cabin", "M");
  kiwi.searchParams.set("currency", cur);
  if (env.KIWI_AFFILIATE_ID) kiwi.searchParams.set("affilid", String(env.KIWI_AFFILIATE_ID));

  // Same routes via your redirector
  const base = new URLSearchParams({ from, to, date, return: ret, currency: cur, redirect: "1" });
  const bookKiwi = `/api/book?p=kiwi&${base.toString()}`;
  const bookAvs  = `/api/book?p=aviasales&${base.toString()}`;

  return new Response(JSON.stringify({
    ok: true,
    env: {
      BOOK_PROVIDER: String(env.BOOK_PROVIDER || "kiwi"),
      TP_TOKEN: !!env.TP_TOKEN,
      TP_PARTNER_ID: !!env.TP_PARTNER_ID,
      KIWI_AFFILIATE_ID: !!env.KIWI_AFFILIATE_ID
    },
    sample: { from, to, date, ret, currency: cur },
    urls: {
      kiwi: kiwi.toString(),
      aviasales: avs.toString(),
      redirects: { kiwi: bookKiwi, aviasales: bookAvs }
    }
  }), { headers: JH });
};
