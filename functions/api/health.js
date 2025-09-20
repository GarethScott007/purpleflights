export const onRequestGet = async () => {
  return new Response(JSON.stringify({ ok: true, msg: "PurpleFlights is alive ✅" }), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
};
