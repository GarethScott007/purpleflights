// /js/results.js
import { getLang, setLang, applyI18n } from '/js/i18n.js';

document.getElementById('y')?.textContent = new Date().getFullYear();

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
  "NZ":"Air New Zealand"
};
const logoURL = code => `https://images.kiwi.com/airlines/64/${encodeURIComponent(code)}.png`;

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

// Copy link button
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

fetch('/api/search',{
  method:'POST',
  headers:{'content-type':'application/json'},
  body: JSON.stringify({from:req.from,to:req.to,date:req.date,ret:req.ret,currency:req.currency,max:60})
})
.then(r=>r.json())
.then(data=>{
  if(data?.error){ resEl.innerHTML=`<div class="card" style="padding:16px">Search error: ${data.error}</div>`; return; }
  ALL = Array.isArray(data?.data) ? data.data : [];
  if(!ALL.length){ resEl.innerHTML='<div class="card" style="padding:16px">No results.</div>'; return; }
  resEl.innerHTML=''; idx=0; clicks=0; infScroll=false;
  renderMore(); toggleMore();
})
.catch(e=>{ resEl.innerHTML=`<div class="card" style="padding:16px">Search failed: ${e.message}</div>`; });

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

    const base = new URLSearchParams({
      from:dep,to:arr,date:req.date,return:req.ret,
      adults:String(req.adults),currency:cur,redirect:'1'
    });
    const kiwiHref='/api/book?p=kiwi&'+base.toString();
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
        <a class="btn gradient no-affiliate" href="${kiwiHref}" target="_blank" rel="noopener">Book (Kiwi) — ${price} ${cur}</a>
        <a class="btn gradient no-affiliate" href="${aviaHref}" target="_blank" rel="noopener">Book (Aviasales) — ${price} ${cur}</a>
      </div>`;
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
