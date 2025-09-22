/* /functions/api/locations.js */
/* REPLACE FILE — compatible response for existing autocomplete + caching */

export const onRequestGet = async ({ request }) => {
  const LOCATIONS = [
    { code: "BKK", city_en: "Bangkok", city_th: "กรุงเทพฯ", name_en: "Suvarnabhumi", name_th: "สุวรรณภูมิ", country: "TH" },
    { code: "DMK", city_en: "Bangkok", city_th: "กรุงเทพฯ", name_en: "Don Mueang", name_th: "ดอนเมือง", country: "TH" },
    { code: "HKT", city_en: "Phuket",  city_th: "ภูเก็ต",     name_en: "Phuket",      name_th: "ภูเก็ต",    country: "TH" },
    { code: "CNX", city_en: "Chiang Mai", city_th: "เชียงใหม่", name_en: "Chiang Mai", name_th: "เชียงใหม่", country: "TH" },
    { code: "HDY", city_en: "Hat Yai", city_th: "หาดใหญ่",      name_en: "Hat Yai",    name_th: "หาดใหญ่",   country: "TH" },
    { code: "UTH", city_en: "Udon Thani", city_th: "อุดรธานี",  name_en: "Udon Thani", name_th: "อุดรธานี",  country: "TH" },
    { code: "URT", city_en: "Surat Thani", city_th: "สุราษฎร์ธานี", name_en: "Surat Thani", name_th: "สุราษฎร์ธานี", country: "TH" },
    { code: "USM", city_en: "Ko Samui", city_th: "เกาะสมุย",    name_en: "Samui",      name_th: "สมุย",     country: "TH" },
    { code: "KBV", city_en: "Krabi",   city_th: "กระบี่",       name_en: "Krabi",      name_th: "กระบี่",    country: "TH" },
    { code: "UTP", city_en: "Pattaya", city_th: "พัทยา",        name_en: "U-Tapao",    name_th: "อู่ตะเภา",   country: "TH" },
    { code: "SIN", city_en: "Singapore", city_th: "สิงคโปร์", name_en: "Changi", name_th: "ชางงี", country: "SG" },
    { code: "KUL", city_en: "Kuala Lumpur", city_th: "กัวลาลัมเปอร์", name_en: "Kuala Lumpur", name_th: "กัวลาลัมเปอร์", country: "MY" },
    { code: "HKG", city_en: "Hong Kong", city_th: "ฮ่องกง", name_en: "Hong Kong", name_th: "ฮ่องกง", country: "HK" },
  ];

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").trim().toLowerCase();
  const lang = (url.searchParams.get("lang") || "en").toLowerCase() === "th" ? "th" : "en";
  const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "20", 10) || 20, 1), 50);

  const pick = (loc) => {
    const city = lang === "th" ? loc.city_th : loc.city_en;
    const name = lang === "th" ? loc.name_th : loc.name_en;
    const label = `${city} — ${name} (${loc.code})`;
    // Include multiple aliases so older widgets are happy.
    return {
      // old/common fields
      code: loc.code,            // "BKK"
      iata: loc.code,            // alias
      value: loc.code,           // alias
      label,                     // "Bangkok — Suvarnabhumi (BKK)"
      title: label,              // alias some libs use
      city,                      // "Bangkok" / "กรุงเทพฯ"
      name,                      // "Suvarnabhumi" / "สุวรรณภูมิ"
      country: loc.country,

      // new fields (harmless extras)
      city_en: loc.city_en,
      city_th: loc.city_th,
      name_en: loc.name_en,
      name_th: loc.name_th,
    };
  };

  let results = LOCATIONS;
  if (q) {
    results = results.filter((l) =>
      l.code.toLowerCase().includes(q) ||
      l.city_en.toLowerCase().includes(q) ||
      l.city_th.toLowerCase().includes(q) ||
      l.name_en.toLowerCase().includes(q) ||
      l.name_th.toLowerCase().includes(q)
    );
  }

  const body = JSON.stringify({
    query: { q, lang, limit },
    count: Math.min(results.length, limit),
    results: results.slice(0, limit).map(pick),
  });

  return new Response(body, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=600",
    },
  });
};
