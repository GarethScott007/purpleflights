/* /functions/api/locations.js */
/* REPLACE the entire file with this version */

export const onRequestGet = async ({ request }) => {
  // Minimal, stable shape many autocomplete widgets expect.
  // results: [{ code, iata, value, label, title, city, name, country }]
  const DATA = [
    { code: "BKK", city: "Bangkok",      name: "Suvarnabhumi",  country: "TH" },
    { code: "DMK", city: "Bangkok",      name: "Don Mueang",    country: "TH" },
    { code: "HKT", city: "Phuket",       name: "Phuket",        country: "TH" },
    { code: "CNX", city: "Chiang Mai",   name: "Chiang Mai",    country: "TH" },
    { code: "HDY", city: "Hat Yai",      name: "Hat Yai",       country: "TH" },
    { code: "UTH", city: "Udon Thani",   name: "Udon Thani",    country: "TH" },
    { code: "URT", city: "Surat Thani",  name: "Surat Thani",   country: "TH" },
    { code: "USM", city: "Ko Samui",     name: "Samui",         country: "TH" },
    { code: "KBV", city: "Krabi",        name: "Krabi",         country: "TH" },
    { code: "UTP", city: "Pattaya",      name: "U-Tapao",       country: "TH" },
    { code: "SIN", city: "Singapore",    name: "Changi",        country: "SG" },
    { code: "KUL", city: "Kuala Lumpur", name: "Kuala Lumpur",  country: "MY" },
    { code: "HKG", city: "Hong Kong",    name: "Hong Kong",     country: "HK" },
  ];

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").trim().toLowerCase();
  const limitRaw = parseInt(url.searchParams.get("limit") || "20", 10);
  const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 20, 1), 50);

  let results = DATA;
  if (q) {
    results = results.filter((r) =>
      r.code.toLowerCase().includes(q) ||
      r.city.toLowerCase().includes(q) ||
      r.name.toLowerCase().includes(q)
    );
  }

  const shaped = results.slice(0, limit).map((r) => {
    const label = `${r.city} — ${r.name} (${r.code})`;
    return {
      code: r.code,
      iata: r.code,     // alias used by some widgets
      value: r.code,    // alias used by some widgets
      label,            // display text
      title: label,     // alias used by some widgets
      city: r.city,
      name: r.name,
      country: r.country,
    };
  });

  return new Response(JSON.stringify({ count: shaped.length, results: shaped }), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=600",
    },
  });
};
