// /api/locations/[[path]].js - API Route Handler
export async function onRequestGet(context) {
  try {
    const { request, params } = context;
    const url = new URL(request.url);
    const query = url.searchParams.get('q') || '';
    const version = url.searchParams.get('v') || '3';
    
    if (!query || query.length < 2) {
      return new Response(JSON.stringify([]), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Forward to TravelPayouts API
    const backendUrl = `https://api.travelpayouts.com/data/v${version}/cities.json`;
    const response = await fetch(backendUrl);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const cities = await response.json();
    const filtered = cities.filter(city => 
      city.name && (
        city.name.toLowerCase().includes(query.toLowerCase()) ||
        city.code.toLowerCase().includes(query.toLowerCase())
      )
    ).slice(0, 10);

    return new Response(JSON.stringify(filtered), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
