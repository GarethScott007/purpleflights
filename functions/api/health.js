// functions/api/health.js
export const onRequestGet = async ({ env }) => {
  const have = {
    TP_TOKEN: !!env.TP_TOKEN,
    TP_PARTNER_ID: !!env.TP_PARTNER_ID,
  };
  return new Response(JSON.stringify({ ok: true, have }), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
};
