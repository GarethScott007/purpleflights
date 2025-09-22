/* /public/js/i18n.js */
/* NEW FILE */

(function (global) {
  const KEY = "lang";
  const dict = {
    en: {
      heroTitle: "Find smart flights",
      resultsTitle: "Results",
      oneWay: "One-way",
      return: "Return",
      origin: "From",
      destination: "To",
      date: "Date",
      returnDate: "Return date",
      currency: "Currency",
      passengers: "Passengers",
      children: "Children",
      infants: "Infants",
      advanced: "Advanced",
      search: "Search",
      loadMore: "Load more",
      bookingKiwi: "Book (Kiwi)",
      bookingAvs: "Book (Aviasales)",
      hotels: "Hotels",
      noResults: "No results",
    },
    th: {
      heroTitle: "ค้นหาตั๋วเครื่องบินอย่างชาญฉลาด",
      resultsTitle: "ผลการค้นหา",
      oneWay: "เที่ยวเดียว",
      return: "ไป–กลับ",
      origin: "ต้นทาง",
      destination: "ปลายทาง",
      date: "วันที่",
      returnDate: "วันกลับ",
      currency: "สกุลเงิน",
      passengers: "ผู้โดยสาร",
      children: "เด็ก",
      infants: "ทารก",
      advanced: "ตัวเลือกเพิ่มเติม",
      search: "ค้นหา",
      loadMore: "โหลดเพิ่ม",
      bookingKiwi: "จอง (Kiwi)",
      bookingAvs: "จอง (Aviasales)",
      hotels: "โรงแรม",
      noResults: "ไม่พบผลลัพธ์",
    },
  };

  function getLang() {
    const v = (localStorage.getItem(KEY) || "").toLowerCase();
    return v === "th" ? "th" : "en";
  }

  function setLang(lang) {
    const l = lang === "th" ? "th" : "en";
    localStorage.setItem(KEY, l);
    document.dispatchEvent(new CustomEvent("langchange", { detail: { lang: l } }));
  }

  function t(key) {
    const l = getLang();
    return (dict[l] && dict[l][key]) || key;
  }

  global.i18n = { t, getLang, setLang, dict };
})(window);
