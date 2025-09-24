.then(data=>{
  if (data?.error) {
    resEl.innerHTML = `<div class="card" style="padding:16px">Search error: ${data.error}</div>`;
    return;
  }
  ALL = Array.isArray(data?.data) ? data.data : [];
  if (!ALL.length) {
    // Friendly fallback when API is sparse or dates are far apart
    const tip = document.createElement('div');
    tip.className='card'; tip.style.padding='16px'; tip.style.marginBottom='12px';
    const flex = flexUrl(req.from, req.to, req.date, req.ret, req.adults, req.currency);
    const avia = `/api/book?p=aviasales&from=${req.from}&to=${req.to}&date=${req.date}&return=${req.ret}&adults=${req.adults}&currency=${req.currency}&redirect=1`;
    tip.innerHTML = `
      <div style="margin-bottom:8px">We couldn’t load prices for those exact dates. Try:</div>
      <div class="row" style="gap:8px;flex-wrap:wrap">
        <a class="pill gradient" href="${flex}" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">
          Kiwi (±3 days)
        </a>
        <a class="pill gradient" href="${avia}" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">
          Aviasales (same dates)
        </a>
      </div>`;
    // Render the tip and stop; page still looks helpful
    resEl.replaceChildren(tip);
    return;
  }
  resEl.innerHTML=''; idx=0; clicks=0; infScroll=false;
  renderMore(); toggleMore();
})
