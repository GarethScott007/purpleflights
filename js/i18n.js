// /js/i18n.js
const I18N = {
  en: {
    brand: "PurpleFlights",
    nav_home: "Home",
    nav_flights: "Flights",
    nav_groups: "Group Trips",
    nav_contact: "Contact",
    nav_hotels: "Hotels",
    trip: "Trip",
    trip_return: "Return",
    trip_oneway: "One-way",
    from: "From",
    to: "To",
    depart: "Depart",
    ret: "Return",
    cabin: "Cabin",
    adults: "Adults",
    children: "Children",
    infants: "Infants",
    currency: "Currency",
    advanced: "Advanced",
    search: "Search",
    results: "Results",
    show_more: "Show more",
  },
  th: {
    brand: "เพอร์เพิลไฟลท์",
    nav_home: "หน้าแรก",
    nav_flights: "ตั๋วเครื่องบิน",
    nav_groups: "ทริปสำหรับกลุ่ม",
    nav_contact: "ติดต่อ",
    nav_hotels: "ที่พัก",
    trip: "รูปแบบการเดินทาง",
    trip_return: "ไป-กลับ",
    trip_oneway: "เที่ยวเดียว",
    from: "ต้นทาง",
    to: "ปลายทาง",
    depart: "ออกเดินทาง",
    ret: "ขากลับ",
    cabin: "ชั้นโดยสาร",
    adults: "ผู้ใหญ่",
    children: "เด็ก",
    infants: "ทารก",
    currency: "สกุลเงิน",
    advanced: "ตัวเลือกเพิ่มเติม",
    search: "ค้นหา",
    results: "ผลลัพธ์",
    show_more: "แสดงเพิ่มเติม",
  }
};

function getLang() {
  const saved = localStorage.getItem("lang");
  if (saved) return saved;
  return (navigator.language || "en").toLowerCase().startsWith("th") ? "th" : "en";
}
function setLang(lang) {
  localStorage.setItem("lang", lang);
  applyI18n(lang);
}
function t(key, lang) {
  return (I18N[lang] && I18N[lang][key]) || I18N.en[key] || key;
}
function applyI18n(lang) {
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    el.textContent = t(key, lang);
  });
  document.querySelectorAll("[data-i18n-ph]").forEach(el => {
    const key = el.getAttribute("data-i18n-ph");
    el.setAttribute("placeholder", t(key, lang));
  });
  // Try to keep page titles sensible
  const ttl = document.querySelector("[data-i18n-title]");
  if (ttl) document.title = `${t(ttl.getAttribute("data-i18n-title"), lang)} — ${t("brand", lang)}`;
}

export { getLang, setLang, applyI18n, t };
