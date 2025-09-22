/* /public/js/results-header.js */
/* NEW FILE */

(function () {
  function ensureHost() {
    const existing = document.querySelector("#results-header");
    if (existing) return existing;
    const h = document.createElement("div");
    h.id = "results-header";
    const target = document.querySelector("#results") || document.body;
    target.parentNode.insertBefore(h, target);
    return h;
  }

  const host = ensureHost();

  function render() {
    const title = window.i18n ? window.i18n.t("resultsTitle") : "Results";
    host.innerHTML = `
      <section class="results-hero">
        <div class="results-hero__bar">
          <h2 class="results-hero__title">${title}</h2>
          <div class="results-hero__controls">
            <select aria-label="Language" class="pill" id="results-lang">
              <option value="en"${window.i18n.getLang()==="en"?" selected":""}>EN</option>
              <option value="th"${window.i18n.getLang()==="th"?" selected":""}>TH</option>
            </select>
          </div>
        </div>
      </section>
    `;
    const sel = host.querySelector("#results-lang");
    sel.addEventListener("change", (e) => {
      window.i18n.setLang(e.target.value); // keep Flights and Results in sync
      render();
    });
  }

  render();
  document.addEventListener("langchange", render);
})();
