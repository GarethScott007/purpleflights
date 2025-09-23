// /js/flights.js
import { getLang, setLang, applyI18n } from '/js/i18n.js';
import { attachAutocomplete } from '/js/lib/autocomplete.js';

const lang = getLang(); applyI18n(lang);
document.getElementById('lang-en')?.addEventListener('click',()=>setLang('en'));
document.getElementById('lang-th')?.addEventListener('click',()=>setLang('th'));

// Autocomplete
const fromEl = document.getElementById('from');
const toEl   = document.getElementById('to');
attachAutocomplete(fromEl);
attachAutocomplete(toEl);

// Currency default
const curSel = document.getElementById('currency');
(function(){
  const l=(navigator.language||'en-US').toLowerCase();
  const guess = l.startsWith('th')?'THB' : l.endsWith('-gb')?'GBP' : l.endsWith('-au')?'AUD'
    : l.endsWith('-ca')?'CAD' : l.endsWith('-sg')?'SGD' : (/-de|-fr|-es|-it|-nl|-pt|-ie|-be|-fi|-at/.test(l)?'EUR':'USD');
  if ([...curSel.options].some(o=>o.value===guess)) curSel.value=guess;
})();

// Trip toggle
const tripSel = document.getElementById('trip');
const retWrap = document.getElementById('retWrap');
function syncTrip(){ retWrap.style.display = tripSel.value==='oneway' ? 'none' : ''; }
tripSel.addEventListener('change', syncTrip); syncTrip();

// Advanced toggle
const adv = document.getElementById('advanced'), advBtn = document.getElementById('advToggle');
advBtn.addEventListener('click',()=>{
  const open=!adv.classList.contains('open');
  adv.classList.toggle('open', open);
  advBtn.setAttribute('aria-expanded', String(open));
});

// Helpers
function pickCode(input){
  const a=(input.dataset.city||'').toUpperCase(), b=(input.dataset.code||'').toUpperCase();
  if(/^[A-Z]{3}$/.test(a)) return a; if(/^[A-Z]{3}$/.test(b)) return b;
  const v=(input.value||'').trim().toUpperCase(); const m=v.match(/\(([A-Z]{3})\)/); if(m) return m[1];
  const t=v.replace(/[^A-Z]/g,''); return /^[A-Z]{3}$/.test(t)?t:'';
}

// Submit
document.getElementById('search')?.addEventListener('submit',e=>e.preventDefault());
document.getElementById('go')?.addEventListener('click',()=>{
  const retVal = tripSel.value==='oneway' ? '' : (document.getElementById('ret').value||'');
  const qs=new URLSearchParams({
    from:pickCode(fromEl), to:pickCode(toEl),
    date:document.getElementById('date').value||'', ret:retVal,
    adults:document.getElementById('adults').value||'1',
    children:document.getElementById('children')?.value||'0',
    infants:document.getElementById('infants')?.value||'0',
    cabin:document.getElementById('cabin').value||'ECONOMY',
    currency:(curSel?.value||'USD').toUpperCase()
  });
  if(!qs.get('from')||!qs.get('to')||!qs.get('date')){
    alert(lang==='th'?'กรุณากรอกต้นทาง ปลายทาง และวันที่ออกเดินทาง':'Fill From, To, and Depart.');
    return;
  }
  window.open('/flights/results.html?'+qs.toString(),'_blank','noopener');
});
