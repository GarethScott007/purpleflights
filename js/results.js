// /js/results.js
import { getLang, setLang, applyI18n } from '/js/i18n.js';

// footer year
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

/* Slug map for Kiwi path-style deep links.
   Add more over time; fallback to IATA if not found. */
const KIWI_SLUGS = {
  // Cities
  "LON": "london-united-kingdom",
  "BKK": "bangkok-thailand",
  "HKT": "phuket-thailand",
  "CNX": "chiang-mai-thailand",
  "SIN": "singapore-singapore",
  "KUL": "kuala-lumpur-malaysia",
  "HKG": "hong-kong-hong-kong",

  // Major airports
  "LHR": "heathrow-london-united-kingdom",
  "LGW": "gatwick-london-united-kingdom",
  "LTN": "luton-london-united-kingdom",
  "STN": "stansted-london-united-kingdom",
  "BKK_AIRPORT": "suvarnabhumi-bangkok-thailand",
  "DMK": "don-mueang-bangkok-thailand",
  "HKT_AIRPORT": "phuket-thailand",
  "CNX_AIRPORT": "chiang-mai-thailand",
  "SIN_AIRPORT": "changi-singapore",
  "KUL_AIRPORT": "kuala-lumpur-malaysia",
  "HKG_AIRPORT": "hong-kong-hong-kong"
};

/* Choose city slug if city code; otherwise airport slug when we know it. */
function kiwiSlug(iata, isAirport=false){
  if (!iata) return "";
  if (!isAirport) return KIWI_SLUGS[iata] || "";       // city code -> city slug
  // airport path keys use *_AIRPORT
  return KIWI_SLUGS[`${iata}_AIRPORT`] || KIWI_SLUGS[iata] || "";
}

const qs = new URLSearchParams(location.search);
const req = {
  from:(qs.get('from')||'').toUpperCase(),
  to:(qs.get('to')||'').toUpperCase(),
  date:qs.get('date')||'',
  ret:qs.get('ret')||'',
  adults:+(qs.get('adults')||1),
  children:+(qs.get('children')||0),
  infants:+(qs.get('infants')||0),
  currency:(qs.get('currency')||'USD').toUpperCase(),
};
document.getElementById('meta').textContent =
  `${req.from} → ${req.to} • ${req.date}${req.ret?(' → '+req.ret):''}`;

// Hotels pill
(function(){
  const h=document.getElementById('hotels');
  const u=new URL('https://hotels-comparer.com/');
  u.searchParams.set('marker','670577');
  if(req.date) u.searchParams.set('checkIn', req.date);
  if(req.ret)  u.searchParams.set('checkOut', req.ret);
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

/* Robust fetch: ensure JSON; show real error text if upstream misbehaves */
fetch('/api/search',{
  method:'POST',
  headers:{'content-type':'application/json'},
  body: JSON.stringify({from:req.from,to:req.to,date:req.date,ret:req.ret,currency:req.currency,max:60})
})
.then(async (r)=>{
  const ct = r.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    const text = await r.text();
    throw new Error(`HTTP ${r.status} non-JSON: ${text.slice(0,140)}`);
  }
  return r.json();
})
.then(data=>{
  if (data?.error) {
    resEl.innerHTML = `<div class="card" style="padding:16px">Search error: ${data.error}</div>`;
    return;
  }
  ALL = Array.isArray(data?.data) ? data.data : [];
  if (!ALL.length) {
    resEl.innerHTML = '<div class="card" style="padding:16px">No results.</div>';
    return;
  }
  resEl.innerHTML=''; idx=0; clicks=0; infScroll=false;
  renderMore(); toggleMore();
})
.catch(e=>{
  resEl.innerHTML = `<div class="card" style="padding:16px">Search failed: ${String(e?.message||e)}</div>`;
});

/* Prefer slug path (forces results list); fall back to IATA path */
function kiwiResultsURL(dep, arr, date, ret, adults, currency){
  // If dep/arr are city codes (e.g., LON/BKK), use city slugs.
  // If they’re airports (e.g., LHR/BKK), use airport slug when we have one; otherwise use city slug fallback.
  const depIsAirport = /^[A-Z]{3}$/.test(dep) && (dep !== 'LON' && dep !== 'BKK' && dep !== 'SIN' && dep !== 'KUL' && dep !== 'HKG');
  const arrIsAirport = /^[A-Z]{3}$/.test(arr) && (arr !== 'LON' && arr !== 'BKK' && arr !== 'SIN' && arr !== 'KUL' && arr !== 'HKG');

  const depSlug = kiwiSlug(dep, depIsAirport);
  const arrSlug = kiwiSlug(arr, arrIsAirport);

  let url;
  if (depSlug && arrSlug) {
    url = new URL(`https://www.kiwi.com/en/search/results/${depSlug}/${arrSlug}/${date}${ret?`/${ret}`:''}`);
  } else {
    // Fallback to IATA path
    url = new URL(`https://www.kiwi.com/en/search/results/${dep}-${arr}/${date}${ret?`/${ret}`:''}`);
  }
  url.searchParams.set("adults", String(adults));
  url.searchParams.set("cabin", "M");         // economy
  url.searchParams.set("currency", currency);
  url.searchParams.set("sortBy", "price");
  url.searchParams.set("limit", "60");
  url.searchParams.set("affilid", "c111.travelpayouts.com");
  return url.toString();
}

moreBtn?.addEventListener('click',()=>{
  renderMore(); toggleMore(); clicks++;
  if(clicks>=3 && !infScroll) enableInfiniteScroll();
});
function toggleMore(){ moreWrap.style.display = (idx < ALL.length && !infScroll) ? '' : 'none'; }

function renderMore(){
  const end = Math.min(idx + PAGE, ALL.length);
  for(let i=idx;i<end;i++){
    const o=ALL[i];
    const dep=o.origin||req.from, arr=o.destination||req.to;
    const price=o.price, cur=(o.currency||req.currency||'USD').toUpperCase();
    const code=(o.airline||'').toUpperCase()||'–';
    const name=AIRLINES[code] || '';

    const kiwiHref = kiwiResultsURL(dep, arr, req.date, req.ret, req.adults, cur);

    // Aviasales via /api/book
    const base = new URLSearchParams({
      from:dep,to:arr,date:req.date,return:req.ret,
      adults:String(req.adults),currency:cur,redirect:'1'
    });
    const aviaHref='/api/book?p=aviasales&'+base.toString();

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
      <div class="row">
        <a class="btn grad-kiwi no-affiliate" href="${kiwiHref}" target="_blank" rel="noopener">Book (Kiwi) — ${price} ${cur}</a>
        <a class="btn grad-avia no-affiliate" href="${aviaHref}" target="_blank" rel="noopener">Book (Aviasales) — ${price} ${cur}</a>
      </div>`;

    if (qs.get('debug') === '1') {
      const dbg = document.createElement('div');
      dbg.className='small muted'; dbg.style.marginTop='8px'; dbg.style.wordBreak='break-all';
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
