// /js/results.js
import { getLang, setLang, applyI18n } from '/js/i18n.js';
{ const y=document.getElementById('y'); if(y) y.textContent=new Date().getFullYear(); }

const lang = getLang(); applyI18n(lang);
document.getElementById('lang-en')?.addEventListener('click',()=>setLang('en'));
document.getElementById('lang-th')?.addEventListener('click',()=>setLang('th'));

const AIRLINES = {
  "TG":"Thai Airways","FD":"Thai AirAsia","SL":"Thai Lion Air","3K":"Jetstar Asia",
  "JL":"Japan Airlines","NH":"ANA","SQ":"Singapore Airlines","TR":"Scoot",
  "CX":"Cathay Pacific","UO":"HK Express","BR":"EVA Air","CI":"China Airlines",
  "QF":"Qantas","EK":"Emirates","EY":"Etihad","QR":"Qatar Airways","BA":"British Airways",
  "AF":"Air France","KL":"KLM","LH":"Lufthansa","LX":"SWISS","OS":"Austrian",
  "VN":"Vietnam Airlines","VJ":"VietJet Air","AI":"Air India","UK":"Vistara",
  "KE":"Korean Air","OZ":"Asiana","DL":"Delta","UA":"United","AA":"American Airlines",
  "NZ":"Air New Zealand","HU":"Hainan Airlines","CZ":"China Southern","CA":"Air China","ZH":"Shenzhen Airlines","PC":"Pegasus"
};
const logoURL = code => `https://images.kiwi.com/airlines/64/${encodeURIComponent(code)}.png`;

/* Slug map for Kiwi – cities + airports */
const KIWI_SLUGS = {
  "LON": "london-united-kingdom",   "BKK": "bangkok-thailand",
  "HKT": "phuket-thailand",         "CNX": "chiang-mai-thailand",
  "SIN": "singapore-singapore",     "KUL": "kuala-lumpur-malaysia",
  "HKG": "hong-kong-hong-kong",
  "LHR": "heathrow-london-united-kingdom", "LGW": "gatwick-london-united-kingdom",
  "LTN": "luton-london-united-kingdom",    "STN": "stansted-london-united-kingdom",
  "BKK_AIRPORT": "suvarnabhumi-bangkok-thailand",
  "DMK": "don-mueang-bangkok-thailand"
};
function citySlug(code){ return KIWI_SLUGS[code]||""; }
function airportSlug(code){ return KIWI_SLUGS[`${code}_AIRPORT`]||KIWI_SLUGS[code]||""; }

const qs = new URLSearchParams(location.search);
const req = {
  from:(qs.get('from')||'').toUpperCase(),
  to:(qs.get('to')||'').toUpperCase(),
  date:qs.get('date')||'',
  ret:qs.get('ret')||'',
  adults:+(qs.get('adults')||1),
  currency:(qs.get('currency')||'USD').toUpperCase(),
};
document.getElementById('meta').textContent = `${req.from} → ${req.to} • ${req.date}${req.ret?(' → '+req.ret):''}`;

// Hotels pill
(function(){
  const h=document.getElementById('hotels');
  const u=new URL('https://hotels-comparer.com/'); u.searchParams.set('marker','670577');
  if(req.date) u.searchParams.set('checkIn', req.date); if(req.ret) u.searchParams.set('checkOut', req.ret);
  h.href=u.toString();
})();

// Copy link pill
document.getElementById('copyLink')?.addEventListener('click',(e)=>{
  e.preventDefault();
  const url = `${location.origin}/flights/results.html?${qs.toString()}`;
  navigator.clipboard?.writeText(url).then(()=>{
    const el=e.currentTarget; const old=el.textContent;
    el.textContent = (lang==='th') ? 'คัดลอกแล้ว' : 'Copied!';
    setTimeout(()=>{ el.textContent=old; }, 1200);
  });
});

const resEl=document.getElementById('results');
const moreWrap=document.getElementById('moreWrap');
const moreBtn=document.getElementById('moreBtn');
let ALL=[], idx=0, PAGE=12, clicks=0, infScroll=false;

resEl.innerHTML='<div class="card" style="padding:16px">Searching…</div>';

/* Robust fetch */
fetch('/api/search',{
  method:'POST',
  headers:{'content-type':'application/json'},
  body: JSON.stringify({from:req.from,to:req.to,date:req.date,ret:req.ret,currency:req.currency,max:60})
})
.then(async (r)=>{
  const ct = r.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    const text = await r.text(); throw new Error(`HTTP ${r.status} non-JSON: ${text.slice(0,140)}`);
  }
  return r.json();
})
.then(data=>{
  if (data?.error) { resEl.innerHTML = `<div class="card" style="padding:16px">Search error: ${data.error}</div>`; return; }
  ALL = Array.isArray(data?.data) ? data.data : [];
  if (!ALL.length) {
    // Helpful alternatives when backend is sparse
    const tip = document.createElement('div');
    tip.className='card'; tip.style.padding='16px';
    const flex = flexUrl(req.from, req.to, req.date, req.ret, req.adults, req.currency);
    tip.innerHTML = `
      <div style="margin-bottom:8px">No results for the exact dates. Try:</div>
      <div class="row" style="gap:8px;flex-wrap:wrap">
        <a class="pill gradient" href="${flex}" target="_blank" rel="noopener">Open Kiwi (±3 days)</a>
        <a class="pill gradient" href="/api/book?p=aviasales&from=${req.from}&to=${req.to}&date=${req.date}&return=${req.ret}&adults=${req.adults}&currency=${req.currency}&redirect=1">Open Aviasales</a>
      </div>`;
    resEl.replaceChildren(tip);
    return;
  }
  resEl.innerHTML=''; idx=0; clicks=0; infScroll=false;
  renderMore(); toggleMore();
})
.catch(e=>{ resEl.innerHTML = `<div class="card" style="padding:16px">Search failed: ${String(e?.message||e)}</div>`; });

/* Build two Kiwi links: city-slug and iata path; prefer slug when available */
function kiwiUrl(dep, arr, date, ret, adults, currency){
  const depCity = citySlug(dep), arrCity = citySlug(arr);
  let url;
  if (depCity && arrCity) {
    url = new URL(`https://www.kiwi.com/en/search/results/${depCity}/${arrCity}/${date}${ret?`/${ret}`:''}`);
  } else {
    // Attempt airport slugs (LHR/BKK_AIRPORT etc.)
    const depAir = airportSlug(dep) || dep;
    const arrAir = airportSlug(arr) || arr;
    url = new URL(`https://www.kiwi.com/en/search/results/${depAir}/${arrAir}/${date}${ret?`/${ret}`:''}`);
  }
  url.searchParams.set("adults", String(adults));
  url.searchParams.set("cabin", "M");
  url.searchParams.set("currency", currency);
  url.searchParams.set("sortBy", "price");
  url.searchParams.set("limit", "60");
  url.searchParams.set("affilid", "c111.travelpayouts.com");
  return url.toString();
}

/* Flexible date link (±3d) – tends to show results even when exact dates don’t */
function flexUrl(dep, arr, date, ret, adults, currency){
  const base = kiwiUrl(dep, arr, date, ret, adults, currency);
  const u = new URL(base);
  // Query style supports +/- flex
  u.searchParams.set('dateFrom', date);
  u.searchParams.set('dateTo',   date);
  if (ret) { u.searchParams.set('returnFrom', ret); u.searchParams.set('returnTo', ret); }
  u.searchParams.set('flexDays', '3'); // Kiwi accepts flexDays in many contexts
  return u.toString();
}

moreBtn?.addEventListener('click',()=>{ renderMore(); toggleMore(); clicks++; if(clicks>=3 && !infScroll) enableInfiniteScroll(); });
function toggleMore(){ moreWrap.style.display = (idx < ALL.length && !infScroll) ? '' : 'none'; }

function renderMore(){
  const end = Math.min(idx + PAGE, ALL.length);
  for(let i=idx;i<end;i++){
    const o=ALL[i];
    const dep=o.origin||req.from, arr=o.destination||req.to;
    const price=o.price, cur=(o.currency||req.currency||'USD').toUpperCase();
    const code=(o.airline||'').toUpperCase()||'–';
    const name=AIRLINES[code] || '';

    const kiwiHref = kiwiUrl(dep, arr, req.date, req.ret, req.adults, cur);
    const aviaHref = `/api/book?p=aviasales&from=${dep}&to=${arr}&date=${req.date}&return=${req.ret}&adults=${req.adults}&currency=${cur}&redirect=1`;

    const card=document.createElement('div'); card.className='card';
    card.innerHTML = `
      <div class="row" style="justify-content:space-between">
        <div class="row" style="gap:10px">
          <span class="chip" style="padding:0">
            <img src="${logoURL(code)}" alt="${code}"
                 onerror="this.onerror=null;this.remove();this.parentNode.textContent='${code}'"
                 style="width:100%;height:100%;border-radius:999px;object-fit:cover"/>
          </span>
          <div>
            <strong>${dep} → ${arr}</strong>
            <div class="small muted">${name || code}</div>
          </div>
        </div>
      </div>
      <div class="muted small" style="margin:8px 0 14px">Indicative fare</div>
      <div class="row" style="gap:8px;flex-wrap:wrap">
        <a class="btn grad-kiwi no-affiliate" href="${kiwiHref}" target="_blank" rel="noopener">Book (Kiwi) — ${price} ${cur}</a>
        <a class="btn grad-avia no-affiliate" href="${aviaHref}" target="_blank" rel="noopener">Book (Aviasales) — ${price} ${cur}</a>
        <a class="pill gradient no-affiliate" href="${flexUrl(dep, arr, req.date, req.ret, req.adults, cur)}" target="_blank" rel="noopener">Kiwi (±3d)</a>
      </div>`;

    if (qs.get('debug') === '1') {
      const dbg=document.createElement('div'); dbg.className='small muted'; dbg.style.marginTop='8px'; dbg.style.wordBreak='break-all';
      dbg.innerHTML = `<div>Kiwi: <a href="${kiwiHref}" target="_blank" rel="noopener">${kiwiHref}</a></div>
                       <div>Avia: <a href="${aviaHref}" target="_blank" rel="noopener">${aviaHref}</a></div>`;
      card.appendChild(dbg);
    }
    resEl.appendChild(card);
  }
  idx = end;
}

function enableInfiniteScroll(){
  infScroll = true;
  moreWrap.style.display = 'none';
  window.addEventListener('scroll', onScroll, { passive:true });
}
function onScroll(){
  const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 200;
  if(nearBottom && idx < ALL.length){ renderMore(); }
  if(idx >= ALL.length){ window.removeEventListener('scroll', onScroll); }
}
