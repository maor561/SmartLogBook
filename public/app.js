// ===== PWA: Service Worker Registration + Install Prompt + Offline Detection =====

// Inject manifest dynamically to avoid encoding issues
(function() {
  const base = window.location.origin;
  const manifest = {
    id: base + "/",
    name: "Smart Logbook Airline",
    short_name: "SmartLogbook",
    description: "מערכת ניהול חברת תעופה וירטואלית",
    start_url: base + "/",
    scope: base + "/",
    display: "standalone",
    orientation: "any",
    dir: "rtl",
    lang: "he",
    theme_color: "#0f172a",
    background_color: "#0f172a",
    icons: [
      {src: base + "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any"},
      {src: base + "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any"},
      {src: base + "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable"},
      {src: base + "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable"}
    ],
    shortcuts: [
      {name: "לוח בקרה", short_name: "Dashboard", url: base + "/?tab=dashboard", icons: [{src: base + "/icons/icon-192.png", sizes: "192x192"}]},
      {name: "ניתוח מחירים", short_name: "Pricing", url: base + "/?tab=pricing", icons: [{src: base + "/icons/icon-192.png", sizes: "192x192"}]},
      {name: "הגדרות", short_name: "Settings", url: base + "/?tab=settings", icons: [{src: base + "/icons/icon-192.png", sizes: "192x192"}]}
    ],
    categories: ["productivity", "utilities"]
  };

  const blob = new Blob([JSON.stringify(manifest)], {type: "application/json"});
  const url = URL.createObjectURL(blob);
  const link = document.createElement("link");
  link.rel = "manifest";
  link.href = url;
  document.head.appendChild(link);
  console.log('[PWA] Manifest injected dynamically');
})();

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => {
        console.log('[PWA] Service Worker registered, scope:', reg.scope);
        // Check for updates every 30 minutes
        setInterval(() => reg.update(), 30 * 60 * 1000);
      })
      .catch(err => console.error('[PWA] SW registration failed:', err));
  });
}

// Install Prompt
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const banner = document.getElementById('installBanner');
  if (banner) banner.style.display = 'block';
});

function installPWA() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  deferredPrompt.userChoice.then(choice => {
    if (choice.outcome === 'accepted') {
      console.log('[PWA] App installed');
    }
    deferredPrompt = null;
    const banner = document.getElementById('installBanner');
    if (banner) banner.style.display = 'none';
  });
}

window.addEventListener('appinstalled', () => {
  console.log('[PWA] App installed successfully');
  deferredPrompt = null;
  const banner = document.getElementById('installBanner');
  if (banner) banner.style.display = 'none';
});

// Offline/Online Detection
window.addEventListener('online', () => {
  const banner = document.getElementById('offlineBanner');
  if (banner) banner.style.display = 'none';
  console.log('[PWA] Back online');
});

window.addEventListener('offline', () => {
  const banner = document.getElementById('offlineBanner');
  if (banner) banner.style.display = 'block';
  console.log('[PWA] Went offline');
});

// ===== TRANSLATIONS =====
const TRANSLATIONS = {
  he: {
    headerTitle: 'מנהל חברת התעופה שלי',
    headerSubtitle: 'מערכת ניהול טיסות מתקדמת',
    tabDash: 'לוח בקרה',
    tabPricing: 'ניתוח מחירים',
    tabSett: 'הגדרות',
    loadBtn: 'טען טיסה מ-SimBrief',
    exportBtn: 'ייצוא Excel',
    importBtn: 'ייבוא Excel',
    statFlights: 'סה״כ טיסות',
    statPassengers: 'נוסעים',
    statDistance: 'מרחק (NM)',
    statHours: 'שעות טיסה',
    statProfit: 'רווח כולל',
    statFuel: 'דלק (ק״ג)',
    favoritesTitle: 'שדות מועדפים',
    mapTitle: 'מפת מסלולים',
    historyTitle: 'היסטוריית טיסות',
    emptyHistory: 'אין טיסות עדיין. טען טיסה מ-SimBrief להתחלה!',
    generalSett: 'הגדרות כלליות',
    pricingSett: 'הגדרות תמחור',
    langLabel: 'שפה / Language',
    simbriefIdLabel: '✈️ SimBrief User ID',
    ticketPriceBase: '💺 כרטיס - טווח קצר <500NM ($)',
    ticketPriceMedium: '💺 כרטיס - טווח בינוני 500-2000NM ($)',
    ticketPriceLong: '💺 כרטיס - טווח ארוך >2000NM ($)',
    cargoRate: '📦 מחיר מטען ($/ק״ג)',
    fuelCost: '⛽ עלות דלק ($/ק״ג)',
    crewCost: '👨‍✈️ עלות צוות ($/טיסה)',
    landingFeeSmall: '🛬 נחיתה - מטוס קטן ($)',
    landingFeeMedium: '🛬 נחיתה - מטוס בינוני ($)',
    landingFeeLarge: '🛬 נחיתה - מטוס גדול ($)',
    maintenanceCost: '🔧 עלות תחזוקה ($/שעה)',
    landingPenalty: '💥 קנס נחיתה קשה ($)',
    saveBtn: 'שמור הגדרות',
    resetBtn: 'אפס לברירת מחדל',
    confirmModalTitle: 'אישור טיסה',
    confirmModalDesc: 'הזן את קצב הירידה בנחיתה',
    fpmLabel: 'קצב ירידה (FPM):',
    cancelBtn: 'ביטול',
    confirmBtnText: 'אשר',
    confirmFlightBtn: 'אשר סיום טיסה',
    rankModalTitle: 'דרגות טייס',
    closeBtns: 'סגור',
    finAnalysis: 'ניתוח פיננסי',
    revenues: 'הכנסות',
    expenses: 'הוצאות',
    tickets: 'כרטיסים',
    cargo: 'מטען',
    fuel: 'דלק',
    crew: 'צוות',
    landing: 'נחיתה',
    maintenance: 'תחזוקה',
    penalty: 'קנס נחיתה קשה',
    totalRevenues: 'סה״כ הכנסות',
    totalExpenses: 'סה״כ הוצאות',
    netProfit: 'רווח נקי',
    hoursLabel: 'שעות',
    aircraft: 'מטוס',
    distance: 'מרחק',
    duration: 'זמן טיסה',
    passengers: 'נוסעים',
    fuelLabel: 'דלק',
    payload: 'מטען',
    favoriteDeparts: 'TOP 5 המראות 🛫',
    favoriteLandings: 'TOP 5 נחיתות 🛬',
    departures: 'המראות',
    landings: 'נחיתות',
    deleteConfirm: 'למחוק טיסה זו?',
    flightSaved: '✅ הטיסה נשמרה!',
    settingsSaved: '✅ ההגדרות נשמרו!',
    settingsReset: '🔄 ההגדרות אופסו',
    loadError: '❌ שגיאה בטעינת הטיסה מ-SimBrief',
    noSimbrief: '⚠️ הגדר SimBrief User ID בהגדרות',
    importConfirm: (n) => `ייבוא ${n} טיסות?`,
    importSuccess: (n) => `✅ יובאו ${n} טיסות`,
    importError: '❌ שגיאה בקריאת הקובץ',
    fpmPerfect: 'מושלם! ✨ (Butter Landing)',
    fpmGood: 'נחיתה טובה ✅',
    fpmRough: 'נחיתה קשה קלות ⚠️',
    fpmHard: 'נחיתה קשה! 💥 (קנס: $500)',
    hereLabel: '← אתה כאן',
    plusHours: '+ שעות',
    deleteBtn: 'מחק',
    mapPopupProfit: 'רווח',
    mapPopupTime: 'זמן',
    ranks: ['סטודנט','טייס מתחיל','טייס','טייס בכיר','קברניט','קברניט בכיר','אגדי'],
    chartTitles: {
      flights: '✈️ מספר טיסות מצטבר',
      passengers: '👥 נוסעים לאורך זמן',
      distance: '🌍 מרחק לאורך זמן (NM)',
      duration: '⏱️ זמן טיסה (דקות)',
      profit: '💰 רווח לאורך זמן ($)',
      fuel: '⛽ דלק לאורך זמן (ק״ג)'
    },
    periodDay: 'יום',
    periodWeek: 'שבוע',
    periodMonth: 'חודש',
    goalsSectionTitle: 'מטרות',
    goalsSettTitle: 'מטרות',
    goalFlightsLabel: '✈️ יעד טיסות',
    goalHoursLabel: '⏱️ יעד שעות טיסה',
    goalProfitLabel: '💰 יעד רווח ($)',
    goalPassengersLabel: '👥 יעד נוסעים',
    saveGoalsBtn: 'שמור מטרות',
    goalsSaved: '✅ המטרות נשמרו!',
    goalAchieved: '✅ הושג!',
    goalFlightsName: 'טיסות',
    goalHoursName: 'שעות',
    goalProfitName: 'רווח ($)',
    goalPassengersName: 'נוסעים',
    monthNames: ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'],
    errorFpmNotNumber: 'FPM חייב להיות מספר',
    errorFpmPositive: 'FPM חייב להיות שלילי או אפס (ירידה)',
    errorFpmTooHigh: 'קצב ירידה גבוה מדי (מקסימום -600)',
    errorDistanceNotNumber: 'מרחק חייב להיות מספר',
    errorDistanceZero: 'מרחק חייב להיות גדול מ-0',
    errorNegativeValue: 'ערכים לא יכולים להיות שליליים',
    analyticsSectionTitle: 'ניתוח מתקדם',
    analyticsBestRoute: 'מסלול הכי רווחי',
    analyticsBestAircraft: 'מטוס הכי רווחי',
    analyticsTrend: 'מגמת רווח',
    analyticsAvgProfit: 'רווח ממוצע לטיסה',
    analyticsFuelEff: 'יעילות דלק',
    analyticsLandStreak: 'סדרת נחיתות טובות',
    analyticsAvg: 'ממוצע',
    analyticsThisMonth: 'החודש',
    analyticsGoodLandings: 'נחיתות טובות ברצף',
    reportBtn: 'דוח חודשי',
    reportModalTitle: 'דוח חודשי',
    reportMonthLabel: 'בחר חודש:',
    generateReportBtn: 'צור דוח',
    reportTitle: 'דוח חודשי',
    reportTopRoutes: 'TOP 5 מסלולים',
    reportTopAircraft: 'TOP 5 מטוסים',
    reportFlightLog: 'יומן טיסות',
    reportDate: 'תאריך',
    reportRoute: 'מסלול',
    reportPrint: 'הדפס / שמור כ-PDF',
    reportNoFlights: 'אין טיסות בחודש זה',
    reportEmailLabel: '📧 אימייל לדוחות (לשימוש עתידי)',
    tabMissions: 'משימות',
    missionsPageTitle: 'משימות מיוחדות',
    missionsPageDesc: 'השלם משימות מיוחדות בשם מדינת ישראל וקבל בונוסים כספיים ודרגות!',
    activeMissionsTitle: 'משימות פעילות',
    completedMissionsTitle: 'משימות שהושלמו',
  },
  en: {
    headerTitle: 'My Airline Manager',
    headerSubtitle: 'Advanced Flight Management System',
    tabDash: 'Dashboard',
    tabPricing: 'Pricing Analytics',
    tabSett: 'Settings',
    loadBtn: 'Load Flight from SimBrief',
    exportBtn: 'Export Excel',
    importBtn: 'Import Excel',
    statFlights: 'Total Flights',
    statPassengers: 'Passengers',
    statDistance: 'Distance (NM)',
    statHours: 'Flight Hours',
    statProfit: 'Total Profit',
    statFuel: 'Fuel (kg)',
    favoritesTitle: 'Favorite Airports',
    mapTitle: 'Route Map',
    historyTitle: 'Flight History',
    emptyHistory: 'No flights yet. Load a flight from SimBrief to get started!',
    generalSett: 'General Settings',
    pricingSett: 'Pricing Settings',
    langLabel: 'Language / שפה',
    simbriefIdLabel: '✈️ SimBrief User ID',
    ticketPriceBase: '💺 Ticket - Short Haul <500NM ($)',
    ticketPriceMedium: '💺 Ticket - Medium Haul 500-2000NM ($)',
    ticketPriceLong: '💺 Ticket - Long Haul >2000NM ($)',
    cargoRate: '📦 Cargo Rate ($/kg)',
    fuelCost: '⛽ Fuel Cost ($/kg)',
    crewCost: '👨‍✈️ Crew Cost ($/flight)',
    landingFeeSmall: '🛬 Landing Fee - Small Aircraft ($)',
    landingFeeMedium: '🛬 Landing Fee - Medium Aircraft ($)',
    landingFeeLarge: '🛬 Landing Fee - Large Aircraft ($)',
    maintenanceCost: '🔧 Maintenance Cost ($/hour)',
    landingPenalty: '💥 Hard Landing Penalty ($)',
    saveBtn: 'Save Settings',
    resetBtn: 'Reset to Default',
    confirmModalTitle: 'Confirm Flight',
    confirmModalDesc: 'Enter your landing rate',
    fpmLabel: 'Landing Rate (FPM):',
    cancelBtn: 'Cancel',
    confirmBtnText: 'Confirm',
    confirmFlightBtn: 'Confirm Flight Complete',
    rankModalTitle: 'Pilot Ranks',
    closeBtns: 'Close',
    finAnalysis: 'Financial Analysis',
    revenues: 'Revenue',
    expenses: 'Expenses',
    tickets: 'Tickets',
    cargo: 'Cargo',
    fuel: 'Fuel',
    crew: 'Crew',
    landing: 'Landing',
    maintenance: 'Maintenance',
    penalty: 'Hard Landing Penalty',
    totalRevenues: 'Total Revenue',
    totalExpenses: 'Total Expenses',
    netProfit: 'Net Profit',
    hoursLabel: 'hours',
    aircraft: 'Aircraft',
    distance: 'Distance',
    duration: 'Duration',
    passengers: 'Passengers',
    fuelLabel: 'Fuel',
    payload: 'Payload',
    favoriteDeparts: 'TOP 5 Departures 🛫',
    favoriteLandings: 'TOP 5 Landings 🛬',
    departures: 'Departures',
    landings: 'Landings',
    deleteConfirm: 'Delete this flight?',
    flightSaved: '✅ Flight saved!',
    settingsSaved: '✅ Settings saved!',
    settingsReset: '🔄 Settings reset to default',
    loadError: '❌ Error loading flight from SimBrief',
    noSimbrief: '⚠️ Please set your SimBrief User ID in Settings',
    importConfirm: (n) => `Import ${n} flights?`,
    importSuccess: (n) => `✅ ${n} flights imported`,
    importError: '❌ Error reading file',
    fpmPerfect: 'Perfect! ✨ (Butter Landing)',
    fpmGood: 'Good Landing ✅',
    fpmRough: 'Slightly Hard ⚠️',
    fpmHard: 'Hard Landing! 💥 (Penalty: $500)',
    hereLabel: '← You are here',
    plusHours: '+ hours',
    deleteBtn: 'Delete',
    mapPopupProfit: 'Profit',
    mapPopupTime: 'Time',
    ranks: ['Student','Beginner Pilot','Pilot','Senior Pilot','Captain','Senior Captain','Legend'],
    chartTitles: {
      flights: '✈️ Cumulative Flights',
      passengers: '👥 Passengers Over Time',
      distance: '🌍 Distance Over Time (NM)',
      duration: '⏱️ Flight Duration (min)',
      profit: '💰 Profit Over Time ($)',
      fuel: '⛽ Fuel Over Time (kg)'
    },
    periodDay: 'Day',
    periodWeek: 'Week',
    periodMonth: 'Month',
    goalsSectionTitle: 'Goals',
    goalsSettTitle: 'Goals',
    goalFlightsLabel: '✈️ Flights Goal',
    goalHoursLabel: '⏱️ Flight Hours Goal',
    goalProfitLabel: '💰 Profit Goal ($)',
    goalPassengersLabel: '👥 Passengers Goal',
    saveGoalsBtn: 'Save Goals',
    goalsSaved: '✅ Goals saved!',
    goalAchieved: '✅ Achieved!',
    goalFlightsName: 'Flights',
    goalHoursName: 'Hours',
    goalProfitName: 'Profit ($)',
    goalPassengersName: 'Passengers',
    monthNames: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    errorFpmNotNumber: 'FPM must be a number',
    errorFpmPositive: 'FPM must be negative or zero (descent)',
    errorFpmTooHigh: 'Descent rate too high (max -600)',
    errorDistanceNotNumber: 'Distance must be a number',
    errorDistanceZero: 'Distance must be greater than 0',
    errorNegativeValue: 'Values cannot be negative',
    analyticsSectionTitle: 'Advanced Analytics',
    analyticsBestRoute: 'Most Profitable Route',
    analyticsBestAircraft: 'Best Aircraft',
    analyticsTrend: 'Profit Trend',
    analyticsAvgProfit: 'Avg Profit/Flight',
    analyticsFuelEff: 'Fuel Efficiency',
    analyticsLandStreak: 'Best Landing Streak',
    analyticsAvg: 'Avg',
    analyticsThisMonth: 'This month',
    analyticsGoodLandings: 'consecutive good landings',
    reportBtn: 'Monthly Report',
    reportModalTitle: 'Monthly Report',
    reportMonthLabel: 'Select month:',
    generateReportBtn: 'Generate Report',
    reportTitle: 'Monthly Report',
    reportTopRoutes: 'Top 5 Routes',
    reportTopAircraft: 'Top 5 Aircraft',
    reportFlightLog: 'Flight Log',
    reportDate: 'Date',
    reportRoute: 'Route',
    reportPrint: 'Print / Save as PDF',
    reportNoFlights: 'No flights this month',
    reportEmailLabel: '📧 Report Email (for future use)',
    tabMissions: 'Missions',
    missionsPageTitle: 'Special Missions',
    missionsPageDesc: 'Complete special missions for the State of Israel and earn cash bonuses and badges!',
    activeMissionsTitle: 'Active Missions',
    completedMissionsTitle: 'Completed Missions',
  }
};

// ===== CONSTANTS =====
const RANK_THRESHOLDS = [0, 10, 50, 100, 250, 500, 1000];
const DEFAULT_PRICING = {
  ticketPriceBase: 120,
  ticketPriceMedium: 200,
  ticketPriceLong: 350,
  cargoRate: 2.0,
  fuelCost: 0.85,
  crewCost: 800,
  landingFeeSmall: 150,
  landingFeeMedium: 350,
  landingFeeLarge: 600,
  maintenanceCost: 180,
  landingPenalty: 1000
};

const LARGE_AIRCRAFT = ['B744','B748','B77W','B77L','B772','B773','A388','A346','A345','A359','A35K','B789','B78X','A332','A333','A343'];
const SMALL_AIRCRAFT = ['E190','E195','E170','E175','CRJ9','CRJ7','A318','AT76','AT75','DH8D','B190','SF34','E135','E145','CRJ2'];

function getTicketPrice(distance) {
  if (distance <= 500) return pricing.ticketPriceBase || 120;
  if (distance <= 2000) return pricing.ticketPriceMedium || 200;
  return pricing.ticketPriceLong || 350;
}

function getLandingFee(aircraft) {
  const code = (aircraft || '').toUpperCase();
  if (LARGE_AIRCRAFT.some(a => code.includes(a))) return pricing.landingFeeLarge || 600;
  if (SMALL_AIRCRAFT.some(a => code.includes(a))) return pricing.landingFeeSmall || 150;
  return pricing.landingFeeMedium || 350;
}

// ===== STATE =====
let flights = [];
let pricing = { ...DEFAULT_PRICING };
let currentFlightData = null;
let currentLang = 'he';
let mapInstance = null;
let mapLayers = [];
let chartInstance = null;
let currentChartType = 'flights';
let currentChartPeriod = 'day';

// ===== MISSIONS DATA =====
const MISSIONS = [
  // 🏆 ספורט
  {id: 'sports-1', category: 'sports', emoji: '🏆', title: 'נבחרת ישראל בכדורגל - מיון UEFA', description: 'טוס עם נבחרת ישראל למדריד למשחק המיון של UEFA.', origin: 'LLBG', destination: 'LEMD', reward_cash: 5000, reward_badge: 'גיבור דיפלומטי', event: 'ספרד נגד ישראל - מיון UEFA'},
  {id: 'sports-2', category: 'sports', emoji: '🏆', title: 'נבחרת ישראל בכדורעף - הזמנה לפריז', description: 'טוס עם נבחרת ישראל בכדורעף לפריז לאליפות הזמנה.', origin: 'LLBG', destination: 'LFPG', reward_cash: 4500, reward_badge: 'שגריר ספורט', event: 'אליפות כדורעף פריז'},
  {id: 'sports-3', category: 'sports', emoji: '🏆', title: 'קבוצת כדורסל - EuroBasket', description: 'טוס עם קבוצת הכדורסל הישראלית לרומא לתחרות EuroBasket.', origin: 'LLBG', destination: 'LIRF', reward_cash: 5500, reward_badge: 'מאמן הקבוצה', event: 'טורניר EuroBasket'},
  {id: 'sports-4', category: 'sports', emoji: '🏆', title: 'אולימפיאדה - ספורטאים ישראלים לטוקיו', description: 'טוס עם הספורטאים הישראלים לטוקיו למשחקים האולימפיים.', origin: 'LLBG', destination: 'RJTT', reward_cash: 8000, reward_badge: 'אלוף אולימפי', event: 'אולימפיאדת טוקיו'},

  // 🎤 תרבות
  {id: 'culture-1', category: 'culture', emoji: '🎤', title: 'משלחת אירוויזיון - שטוקהולם', description: 'טוס עם משלחת האירוויזיון הישראלית לשטוקהולם.', origin: 'LLBG', destination: 'ESSA', reward_cash: 3500, reward_badge: 'שגריר תרבות', event: 'תחרות אירוויזיון'},
  {id: 'culture-2', category: 'culture', emoji: '🎤', title: 'התזמורת הפילהרמונית - ברלין', description: 'טוס עם התזמורת הפילהרמונית הישראלית לברלין לסיבוב הופעות.', origin: 'LLBG', destination: 'EDDB', reward_cash: 4000, reward_badge: 'חובב מוזיקה', event: 'סדרת הופעות ברלין'},
  {id: 'culture-3', category: 'culture', emoji: '🎤', title: 'להקת תיאטרון - ניו יורק', description: 'טוס עם להקת התיאטרון הישראלית לניו יורק להופעות בברודווי.', origin: 'LLBG', destination: 'KJFK', reward_cash: 6000, reward_badge: 'חסיד תיאטרון', event: 'פסטיבל תיאטרון ניו יורק'},

  // 🤝 דיפלומטיה
  {id: 'diplomatic-1', category: 'diplomatic', emoji: '🤝', title: 'שר החוץ - פסגת האו"ם', description: 'טוס עם שר החוץ לניו יורק לאסיפה הכללית של האו"ם.', origin: 'LLBG', destination: 'KJFK', reward_cash: 4500, reward_badge: 'דיפלומט', event: 'האסיפה הכללית של האו"ם'},
  {id: 'diplomatic-2', category: 'diplomatic', emoji: '🤝', title: 'משלחת סחר - בריסל', description: 'טוס עם המשלחת העסקית למשא ומתן סחר עם האיחוד האירופי.', origin: 'LLBG', destination: 'EBBR', reward_cash: 3500, reward_badge: 'מומחה סחר', event: 'פסגת סחר האיחוד האירופי'},
  {id: 'diplomatic-3', category: 'diplomatic', emoji: '🤝', title: 'משלחת שיחות שלום - קהיר', description: 'טוס עם המשלחת הדיפלומטית למשא ומתן שלום במצרים.', origin: 'LLBG', destination: 'HECA', reward_cash: 5000, reward_badge: 'עושה שלום', event: 'שיחות שלום קהיר'},
  {id: 'diplomatic-4', category: 'diplomatic', emoji: '🤝', title: 'פסגת היי-טק - סיליקון ואלי', description: 'טוס עם מנהיגי ההיי-טק הישראלי לכנס בקליפורניה.', origin: 'LLBG', destination: 'KSJC', reward_cash: 6500, reward_badge: 'חלוץ טכנולוגיה', event: 'כנס הטכנולוגיה בסיליקון ואלי'},

  // 🚨 חירום
  {id: 'emergency-1', category: 'emergency', emoji: '🚨', title: 'פינוי רפואי - קפריסין', description: 'פינוי דחוף של צוות רפואי ישראלי לקפריסין לסיוע הומניטרי.', origin: 'LLBG', destination: 'LCRA', reward_cash: 4000, reward_badge: 'מגיב חירום', event: 'מצב חירום רפואי בקפריסין'},
  {id: 'emergency-2', category: 'emergency', emoji: '🚨', title: 'סיוע הומניטרי - טורקיה', description: 'הבאת סיוע הומניטרי חירום לאחר רעידת האדמה בטורקיה.', origin: 'LLBG', destination: 'LTAC', reward_cash: 5500, reward_badge: 'גיבור הומניטרי', event: 'סיוע לרעידת האדמה בטורקיה'},
  {id: 'emergency-3', category: 'emergency', emoji: '🚨', title: 'פינוי אזרחים - סודן', description: 'פינוי חירום של אזרחים ישראלים מסודן.', origin: 'LLBG', destination: 'HSSS', reward_cash: 4500, reward_badge: 'מציל חיים', event: 'פינוי סודן'},

  // 👥 ממשלה
  {id: 'state-1', category: 'state', emoji: '👥', title: 'ביקור ראש הממשלה - וושינגטון', description: 'טוס עם ראש הממשלה לביקור רשמי בוושינגטון.', origin: 'LLBG', destination: 'KDCA', reward_cash: 7000, reward_badge: 'נציג ממשלתי', event: 'ביקור מדינה בוושינגטון'},
  {id: 'state-2', category: 'state', emoji: '👥', title: 'משלחת ממשלתית - פריז', description: 'טוס עם המשלחת הממשלתית לפגישות שיתוף פעולה ישראל-צרפת.', origin: 'LLBG', destination: 'LFPG', reward_cash: 5000, reward_badge: 'קישור ממשלתי', event: 'פסגה ממשלתית פריז'},
  {id: 'state-3', category: 'state', emoji: '👥', title: 'חילופי תרבות - מרוקו', description: 'טוס עם משלחת חילופי תרבות למרוקו.', origin: 'LLBG', destination: 'GMMC', reward_cash: 3500, reward_badge: 'גשר תרבות', event: 'חילופי תרבות עם מרוקו'},
];

let completedMissions = [];
let MISSIONS_FROM_API = []; // loaded from /api/missions

// ===== INPUT VALIDATION =====
function validateFPM(fpm) {
  const num = parseInt(fpm);
  if (isNaN(num)) {
    return { valid: false, error: t('errorFpmNotNumber') || 'FPM must be a number' };
  }
  if (num > 0) {
    return { valid: false, error: t('errorFpmPositive') || 'FPM must be negative or zero (descent)' };
  }
  if (Math.abs(num) > 600) {
    return { valid: false, error: t('errorFpmTooHigh') || 'Descent rate too high (max -600)' };
  }
  return { valid: true };
}

function validatePrice(value, fieldName) {
  const num = parseFloat(value);
  if (isNaN(num)) {
    return { valid: false, error: `${fieldName} must be a number` };
  }
  if (num < 0) {
    return { valid: false, error: `${fieldName} cannot be negative` };
  }
  return { valid: true };
}

function validateDistance(distance) {
  const num = parseInt(distance);
  if (isNaN(num)) {
    return { valid: false, error: t('errorDistanceNotNumber') || 'Distance must be a number' };
  }
  if (num <= 0) {
    return { valid: false, error: t('errorDistanceZero') || 'Distance must be greater than 0' };
  }
  return { valid: true };
}

function validateDate(dateStr) {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return { valid: false, error: 'Invalid date format' };
  }
  if (date > new Date()) {
    return { valid: false, error: 'Date cannot be in the future' };
  }
  return { valid: true };
}

function validateFlightData(flight) {
  const errors = [];
  if (flight.distance && flight.distance <= 0) {
    errors.push(t('errorDistanceZero') || 'Distance must be greater than 0');
  }
  if (flight.fpm !== undefined && flight.fpm !== null) {
    const fpmCheck = validateFPM(flight.fpm);
    if (!fpmCheck.valid) errors.push(fpmCheck.error);
  }
  return errors;
}

// ===== SERVER API =====
const API = {
  async getFlights() {
    const r = await fetch('/api/flights');
    const data = await r.json();
    console.log('[API] getFlights response:', data);

    // Airport coordinates database (ICAO code -> [lat, lon])
    const airportCoords = {
      'LLBG': [32.0055, 34.8747],  // Tel Aviv, Israel
      'OMDB': [25.2528, 55.3645],  // Dubai, UAE
      'LROP': [44.5711, 25.9995],  // Bucharest, Romania
      'EGLL': [51.4700, -0.4543],  // London, UK
      'LFPG': [49.0097, 2.5479],   // Paris, France
      'LEMD': [40.4719, -3.6289],  // Madrid, Spain
      'LIRF': [41.7994, 12.5949],  // Rome, Italy
      'UUWW': [55.4125, 37.9039],  // Moscow, Russia
      'KJFK': [40.6413, -73.7781], // New York, USA
      'KORD': [41.9742, -87.9073], // Chicago, USA
      'KLAX': [33.9425, -118.4081],// Los Angeles, USA
      'KSFO': [37.6213, -122.3790],// San Francisco, USA
      'RJTT': [35.5494, 139.7798], // Tokyo, Japan
      'WSSS': [1.3521, 103.8198],  // Singapore
      'ZGSZ': [22.6329, 113.8243], // Shenzhen, China
      'ZBAA': [40.0801, 116.5847], // Beijing, China
      'VHHH': [22.3193, 113.9150], // Hong Kong
      'RKSI': [37.4602, 127.1025], // Seoul, South Korea
      'VTBS': [13.6900, 100.7501], // Bangkok, Thailand
      'AUSY': [-33.9461, 151.1772],// Sydney, Australia
      'NZAA': [-37.0082, 174.7850],// Auckland, New Zealand
      'FAOR': [-25.3863, 28.2389], // Johannesburg, South Africa
      'EKCH': [55.6161, 12.6560],  // Copenhagen, Denmark
      'UUDD': [55.4131, 37.9010],  // Moscow (Domodedovo), Russia
      'VECC': [28.5647, 77.1029],  // Delhi, India
      'VIDP': [28.5562, 77.0992]   // Delhi (Indira Gandhi), India
    };

    // Convert string values from MySQL to numbers
    return (data.flights || []).map(f => {
      // Parse duration string "H:MM" to minutes if duration_mins is 0
      let mins = parseInt(f.duration_mins) || 0;
      if (mins === 0 && f.duration) {
        const parts = f.duration.split(':');
        if (parts.length === 2) {
          mins = (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0);
        }
      }
      // Treat all DB dates as UTC - add Z suffix so JS converts to local timezone
      let normalizedDate = f.date;
      if (normalizedDate && !normalizedDate.includes('Z') && !normalizedDate.includes('+')) {
        normalizedDate = normalizedDate.replace(' ', 'T') + 'Z';
      }

      // Get coordinates from database or use random coordinates
      const originCoords = airportCoords[f.origin] || [Math.random() * 180 - 90, Math.random() * 360 - 180];
      const destCoords = airportCoords[f.destination] || [Math.random() * 180 - 90, Math.random() * 360 - 180];

      return {
        ...f,
        date: normalizedDate,
        id: f.id || f._id || '',
        distance: parseInt(f.distance) || 0,
        duration_mins: mins,
        durationMins: mins,
        passengers: parseInt(f.passengers) || 0,
        fuel: parseInt(f.fuel) || 0,
        payload: parseInt(f.payload) || 0,
        fpm: parseInt(f.fpm) || 0,
        profit: parseInt(f.profit) || 0,
        originLat: originCoords[0],
        originLon: originCoords[1],
        destLat: destCoords[0],
        destLon: destCoords[1]
      };
    });
  },
  async addFlight(flight) {
    const r = await fetch('/api/flights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(flight)
    });
    return r.json();
  },
  async deleteFlight(id) {
    const r = await fetch(`/api/flights/${id}`, { method: 'DELETE' });
    if (!r.ok) throw new Error(`Delete failed: ${r.status}`);
    return r.json();
  },
  async saveFlight(flight) {
    const r = await fetch(`/api/flights/${flight.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(flight)
    });
    return r.json();
  },
  async importFlights(flightsArr) {
    const results = [];
    for (const flight of flightsArr) {
      const r = await fetch('/api/flights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(flight)
      });
      results.push(await r.json());
    }
    return results;
  },
  async getSettings() {
    const r = await fetch('/api/settings');
    const flat = await r.json();
    // Convert flat DB settings to structured format expected by app
    return {
      language: flat.lang || 'he',
      simbriefId: flat.simbriefId || '',
      reportEmail: flat.reportEmail || '',
      pricing: {
        ticketPriceBase: parseFloat(flat.pTicketBase) || 75,
        ticketPriceMedium: parseFloat(flat.pTicketMedium) || 125,
        ticketPriceLong: parseFloat(flat.pTicketLong) || 175,
        cargoRate: parseFloat(flat.pCargo) || 0.5,
        fuelCost: parseFloat(flat.pFuel) || 0.8,
        crewCost: parseFloat(flat.pCrew) || 200,
        landingFeeSmall: parseFloat(flat.pLandingSmall) || 100,
        landingFeeMedium: parseFloat(flat.pLandingMedium) || 250,
        landingFeeLarge: parseFloat(flat.pLandingLarge) || 500,
        maintenanceCost: parseFloat(flat.pMaint) || 50,
        landingPenalty: parseFloat(flat.pPenalty) || 500
      },
      goals: {
        flights: parseInt(flat.goalFlights) || 100,
        hours: parseInt(flat.goalHours) || 500,
        profit: parseInt(flat.goalProfit) || 100000,
        passengers: parseInt(flat.goalPassengers) || 10000
      }
    };
  },
  async saveSetting(key, value) {
    const r = await fetch(`/api/settings/${key}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: String(value) })
    });

    const data = await r.json();

    if (!r.ok) {
      const errorMsg = data.error || `HTTP ${r.status}`;
      throw new Error(`Failed to save ${key}: ${errorMsg}`);
    }

    return data;
  }
};

// ===== THEME MANAGEMENT =====
let currentTheme = 'dark';

function toggleTheme() {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
  applyTheme(currentTheme);
  localStorage.setItem('airliner_theme', currentTheme);

  // Update button text
  const btn = document.getElementById('themeToggle');
  if (btn) {
    btn.textContent = currentTheme === 'dark' ? '☀️' : '🌙';
    btn.title = currentTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
  }
}

function applyTheme(theme) {
  currentTheme = theme;
  if (theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    // Update theme color meta tag for mobile browser UI
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute('content', '#f8fafc');
  } else {
    document.documentElement.removeAttribute('data-theme');
    // Reset theme color meta tag to dark
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute('content', '#0f172a');
  }
}

function initTheme() {
  // Load saved theme preference
  const savedTheme = localStorage.getItem('airliner_theme') || 'dark';
  applyTheme(savedTheme);

  // Update button
  const btn = document.getElementById('themeToggle');
  if (btn) {
    btn.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
    btn.title = savedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
  }
}

// ===== INIT =====
async function init() {
  try {
    // Initialize theme first
    initTheme();

    const settings = await API.getSettings();
    currentLang = settings.language || 'en';

    if (settings.pricing) {
      // Backward compatibility: migrate old flat pricing to tiered
      if (settings.pricing.ticketPrice && !settings.pricing.ticketPriceBase) {
        settings.pricing.ticketPriceBase = settings.pricing.ticketPrice;
        settings.pricing.ticketPriceMedium = Math.round(settings.pricing.ticketPrice * 1.5);
        settings.pricing.ticketPriceLong = Math.round(settings.pricing.ticketPrice * 2.5);
        delete settings.pricing.ticketPrice;
      }
      if (settings.pricing.landingFee && !settings.pricing.landingFeeSmall) {
        settings.pricing.landingFeeSmall = Math.round(settings.pricing.landingFee * 0.5);
        settings.pricing.landingFeeMedium = settings.pricing.landingFee;
        settings.pricing.landingFeeLarge = Math.round(settings.pricing.landingFee * 2);
        delete settings.pricing.landingFee;
      }
      pricing = { ...DEFAULT_PRICING, ...settings.pricing };
    }

    // Apply language
    document.documentElement.lang = currentLang;
    document.documentElement.dir = currentLang === 'he' ? 'rtl' : 'ltr';

    applyTranslations();

    // Load flights
    flights = await API.getFlights();
    console.log('[Init] Flights loaded:', flights.length, 'flights');

    // Fill settings form
    document.getElementById('langSelect').value = currentLang;
    if (settings.simbriefId) document.getElementById('simbriefId').value = settings.simbriefId;
    if (settings.reportEmail) document.getElementById('reportEmail').value = settings.reportEmail;
    loadPricingForm();
    loadGoalsForm();

    updateUI();
    initMap();
    updateMap();  // Render routes now that map is initialized
    setupPeriodToggle();
  } catch(err) {
    console.error('Init error:', err);
    showToast('⚠️ Cannot connect to server', 'error');
  }
}

// ===== TRANSLATIONS =====
function t(key) {
  const val = TRANSLATIONS[currentLang][key];
  return val !== undefined ? val : (TRANSLATIONS['he'][key] || key);
}

function applyTranslations() {
  const L = TRANSLATIONS[currentLang];
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

  set('headerTitle', L.headerTitle);
  set('headerSubtitle', L.headerSubtitle);
  set('tabDashLabel', L.tabDash);
  set('tabPricingLabel', L.tabPricing);
  set('tabSettLabel', L.tabSett);
  set('loadBtnText', L.loadBtn);
  set('exportBtnText', L.exportBtn);
  set('importBtnText', L.importBtn);
  set('statFlightsLabel', L.statFlights);
  set('statPassengersLabel', L.statPassengers);
  set('statDistanceLabel', L.statDistance);
  set('statHoursLabel', L.statHours);
  set('statProfitLabel', L.statProfit);
  set('statFuelLabel', L.statFuel);
  set('favoritesTitle', L.favoritesTitle);
  set('mapTitle', L.mapTitle);
  set('historyTitle', L.historyTitle);
  set('emptyHistoryText', L.emptyHistory);
  set('generalSettTitle', L.generalSett);
  set('pricingSettTitle', L.pricingSett);
  set('langLabel', L.langLabel);
  set('simbriefIdLabel', L.simbriefIdLabel);
  set('ticketPriceBaseLabel', L.ticketPriceBase);
  set('ticketPriceMediumLabel', L.ticketPriceMedium);
  set('ticketPriceLongLabel', L.ticketPriceLong);
  set('cargoRateLabel', L.cargoRate);
  set('fuelCostLabel', L.fuelCost);
  set('crewCostLabel', L.crewCost);
  set('landingFeeSmallLabel', L.landingFeeSmall);
  set('landingFeeMediumLabel', L.landingFeeMedium);
  set('landingFeeLargeLabel', L.landingFeeLarge);
  set('maintenanceCostLabel', L.maintenanceCost);
  set('landingPenaltyLabel', L.landingPenalty);
  set('saveBtnText', L.saveBtn);
  set('resetBtnText', L.resetBtn);
  set('confirmModalTitle', L.confirmModalTitle);
  set('confirmModalDesc', L.confirmModalDesc);
  set('fpmLabel', L.fpmLabel);
  set('cancelBtn', L.cancelBtn);
  set('confirmBtnText', L.confirmBtnText);
  set('confirmFlightBtnText', L.confirmFlightBtn);
  set('rankModalTitle', L.rankModalTitle);
  set('closeChartBtn', L.closeBtns);
  set('closeRankBtn', L.closeBtns);
  set('finAnalysisTitle', L.finAnalysis);
  set('periodDay', L.periodDay);
  set('periodWeek', L.periodWeek);
  set('periodMonth', L.periodMonth);
  set('goalsSectionTitle', L.goalsSectionTitle);
  set('goalsSettTitle', L.goalsSettTitle);
  set('goalFlightsLabel', L.goalFlightsLabel);
  set('goalHoursLabel', L.goalHoursLabel);
  set('goalProfitLabel', L.goalProfitLabel);
  set('goalPassengersLabel', L.goalPassengersLabel);
  set('saveGoalsBtnText', L.saveGoalsBtn);
  set('analyticsSectionTitle', L.analyticsSectionTitle);
  set('reportBtnText', L.reportBtn);
  set('reportModalTitle', L.reportModalTitle);
  set('reportMonthLabel', L.reportMonthLabel);
  set('generateReportBtnText', L.generateReportBtn);
  set('cancelReportBtn', L.cancelBtn);
  set('reportEmailLabel', L.reportEmailLabel);
}

// ===== TAB =====
function switchTab(tab) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  document.getElementById(tab).classList.add('active');
  document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
  if (tab === 'dashboard') setTimeout(() => mapInstance && mapInstance.invalidateSize(), 150);
  if (tab === 'missions') renderMissions();
  if (tab === 'pricing') loadPricingHistory(30);
  if (tab === 'settings') loadGoalsForm();
}

// ===== SIMBRIEF LOAD =====
async function loadFromSimbrief() {
  const userId = document.getElementById('simbriefId').value.trim();
  if (!userId) { showToast(t('noSimbrief'), 'error'); switchTab('settings'); return; }

  const btn = document.getElementById('loadBtn');
  btn.disabled = true;
  btn.innerHTML = `<span class="loader"></span> Loading...`;

  try {
    const res = await fetch(`/api/simbrief?userid=${encodeURIComponent(userId)}`);
    if (!res.ok) throw new Error('SimBrief fetch failed');
    const data = await res.json();

    if (data.error) throw new Error(data.error);

    const times = data.times || {};
    const origin = data.origin || {};
    const destination = data.destination || {};
    const general = data.general || {};
    const fuel = data.fuel || {};
    const params = data.params || {};

    const durationSecs = parseInt(times.est_time_enroute || 0);
    const durationMins = Math.round(durationSecs / 60);
    const hours = Math.floor(durationMins / 60);
    const mins = durationMins % 60;

    // Fuel: SimBrief can return kgs or lbs depending on user account settings
    const fuelRaw = parseFloat(fuel.plan_ramp || fuel.plan_takeoff || 0);
    const isKgs = (params.units || '').toLowerCase() === 'kgs';
    const fuelKg = Math.round(isKgs ? fuelRaw : fuelRaw * 0.453592);

    const getFlag = (code) => {
      if (!code) return '🌍';
      try {
        return [...code.toUpperCase()].map(c =>
          String.fromCodePoint(0x1F1E6 - 65 + c.charCodeAt(0))
        ).join('');
      } catch(e) { return '🌍'; }
    };

    const payloadKg = parseFloat(data.weights?.payload || data.weights?.pax_weight || 0);

    currentFlightData = {
      origin: (origin.icao_code || '????').toUpperCase(),
      destination: (destination.icao_code || '????').toUpperCase(),
      originName: origin.name || '',
      destName: destination.name || '',
      originLat: parseFloat(origin.pos_lat || 0),
      originLon: parseFloat(origin.pos_long || 0),
      destLat: parseFloat(destination.pos_lat || 0),
      destLon: parseFloat(destination.pos_long || 0),
      aircraft: data.aircraft?.icaocode || data.aircraft?.base_type || 'Unknown',
      distance: parseInt(general.route_distance || general.gc_distance || 0),
      duration: `${hours}:${String(mins).padStart(2,'0')}`,
      durationMins: durationMins,
      passengers: parseInt(data.weights?.pax_count_actual || general.passengers || 0),
      fuel: fuelKg,
      payload: Math.round(payloadKg),
      originFlag: getFlag(origin.country_code),
      destFlag: getFlag(destination.country_code),
    };

    // Validate extracted flight data
    const flightErrors = validateFlightData(currentFlightData);
    if (flightErrors.length > 0) {
      showToast('⚠️ ' + flightErrors[0], 'warning');
    }

    // Auto-load dynamic pricing before displaying flight
    try {
      const pricingRes = await fetch('/api/pricing/update', { method: 'POST' });
      const pricingData = await pricingRes.json();
      if (pricingData.success) {
        const newSettings = await API.getSettings();
        if (newSettings.pricing) {
          pricing = { ...pricing, ...newSettings.pricing };
        }
        console.log('[Pricing] Auto-updated: cost index', pricingData.update?.costIndex, 'fuel', pricingData.update?.fuelCost);
      }
    } catch (e) {
      console.warn('[Pricing] Auto-update failed, using cached prices:', e);
    }

    displayCurrentFlight();
  } catch(err) {
    console.error(err);
    showToast(t('loadError'), 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<span>✈️</span> <span id="loadBtnText">${t('loadBtn')}</span>`;
  }
}

// ===== CURRENT FLIGHT DISPLAY =====
function displayCurrentFlight() {
  if (!currentFlightData) return;
  const d = currentFlightData;
  const L = TRANSLATIONS[currentLang];

  document.getElementById('cfOriginFlag').textContent = d.originFlag;
  document.getElementById('cfOrigin').textContent = d.origin;
  document.getElementById('cfDest').textContent = d.destination;
  document.getElementById('cfDestFlag').textContent = d.destFlag;
  document.getElementById('cfNames').textContent = d.originName && d.destName
    ? `${d.originName} → ${d.destName}` : '';

  const infoGrid = document.getElementById('cfInfoGrid');
  infoGrid.innerHTML = [
    { label: L.aircraft, value: d.aircraft },
    { label: L.distance, value: `${d.distance.toLocaleString()} NM` },
    { label: L.duration, value: d.duration },
    { label: L.passengers, value: d.passengers.toLocaleString() },
    { label: L.fuelLabel, value: `${d.fuel.toLocaleString()} kg` },
  ].map(item => `
    <div class="info-card">
      <div class="info-card-label">${item.label}</div>
      <div class="info-card-value">${item.value}</div>
    </div>
  `).join('');

  const fin = calcFinancials(d, 0);
  document.getElementById('finAnalysisContent').innerHTML = buildFinancialHTML(d, fin, false);

  const panel = document.getElementById('currentFlightPanel');
  panel.style.display = 'block';
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ===== FINANCIAL CALCULATIONS =====
function calcFinancials(d, fpm) {
  const ticketPrice = getTicketPrice(d.distance || 0);
  const landingFee = getLandingFee(d.aircraft || '');

  const ticketRevenue = d.passengers * ticketPrice;
  const cargoRevenue = (d.payload || 0) * pricing.cargoRate;
  const totalIncome = ticketRevenue + cargoRevenue;

  const fuelExpense = d.fuel * pricing.fuelCost;
  const crewExpense = pricing.crewCost;
  const landingExpense = landingFee;
  const maintenanceExpense = (d.durationMins / 60) * pricing.maintenanceCost;
  const penalty = Math.abs(fpm) > 400 ? pricing.landingPenalty : 0;
  const totalExpenses = fuelExpense + crewExpense + landingExpense + maintenanceExpense + penalty;
  const netProfit = Math.round(totalIncome - totalExpenses);

  return { ticketRevenue, cargoRevenue, totalIncome, fuelExpense, crewExpense, landingExpense, maintenanceExpense, penalty, totalExpenses, netProfit, ticketPrice, landingFee };
}

function buildFinancialHTML(d, fin, showPenalty) {
  const L = TRANSLATIONS[currentLang];
  const fmt = (n) => `$${Math.round(Math.abs(n)).toLocaleString()}`;

  return `
    <!-- Market Conditions Section -->
    <div style="background: rgba(99,102,241,0.1); padding: 10px; border-radius: 6px; margin-bottom: 12px; border-left: 3px solid #6366f1;">
      <div class="fin-section-title" style="margin-bottom: 8px;">📊 תנאי שוק:</div>
      <div class="fin-row" style="font-size: 0.9rem;">
        <span class="label">⛽ עלות דלק</span>
        <span style="color: #f97316;">$${pricing.fuelCost}/ק"ג</span>
      </div>
      <div class="fin-row" style="font-size: 0.9rem;">
        <span class="label">📈 מדד עלויות</span>
        <span style="color: #8b5cf6;">נורמלי (50)</span>
      </div>
      <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 6px;">
        ✅ מחירים דינמיים מעודכנים אוטומטית
      </div>
    </div>
    <hr class="fin-divider">

    <div class="fin-section-title">${L.revenues}:</div>
    <div class="fin-row">
      <span class="label">${L.tickets}: ${d.passengers} × $${fin.ticketPrice}</span>
      <span class="value-positive">+${fmt(fin.ticketRevenue)}</span>
    </div>
    ${fin.cargoRevenue > 0 ? `
    <div class="fin-row">
      <span class="label">${L.cargo}: ${(d.payload || 0).toLocaleString()} × $${pricing.cargoRate}</span>
      <span class="value-positive">+${fmt(fin.cargoRevenue)}</span>
    </div>
    ` : ''}
    <div class="fin-row" style="font-weight:700;margin-top:2px">
      <span class="label">${L.totalRevenues}</span>
      <span class="value-positive">+${fmt(fin.totalIncome)}</span>
    </div>
    <hr class="fin-divider">
    <div class="fin-section-title">${L.expenses}:</div>
    <div class="fin-row">
      <span class="label">${L.fuel}: ${d.fuel.toLocaleString()} × $${pricing.fuelCost}</span>
      <span class="value-negative">-${fmt(fin.fuelExpense)}</span>
    </div>
    <div class="fin-row">
      <span class="label">${L.crew}</span>
      <span class="value-negative">-${fmt(fin.crewExpense)}</span>
    </div>
    <div class="fin-row">
      <span class="label">${L.landing}</span>
      <span class="value-negative">-${fmt(fin.landingExpense)}</span>
    </div>
    <div class="fin-row">
      <span class="label">${L.maintenance}: ${(d.durationMins/60).toFixed(2)}h × $${pricing.maintenanceCost}</span>
      <span class="value-negative">-${fmt(fin.maintenanceExpense)}</span>
    </div>
    ${showPenalty && fin.penalty > 0 ? `
    <div class="fin-row">
      <span class="label">${L.penalty}</span>
      <span class="value-negative">-${fmt(fin.penalty)}</span>
    </div>` : ''}
    <div class="fin-row" style="font-weight:700;margin-top:2px">
      <span class="label">${L.totalExpenses}</span>
      <span class="value-negative">-${fmt(fin.totalExpenses)}</span>
    </div>
    <hr class="fin-divider">
    <div class="fin-total">
      <span>${L.netProfit}:</span>
      <span class="${fin.netProfit >= 0 ? 'profit-positive' : 'profit-negative'}">
        ${fin.netProfit >= 0 ? '+' : '-'}${fmt(fin.netProfit)} ${fin.netProfit >= 0 ? '✅' : '❌'}
      </span>
    </div>

    <!-- Pricing Impact Summary -->
    <hr class="fin-divider">
    <div style="background: rgba(34,197,94,0.08); padding: 10px; border-radius: 6px; border-left: 3px solid #22c55e;">
      <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 6px;">
        🎯 <strong>השפעת מחירים דינמיים:</strong>
      </div>
      <div style="font-size: 0.8rem; color: var(--text-secondary);">
        💰 דלק: ${fmt(fin.fuelExpense)} | 🪑 קרו: ${fmt(fin.crewExpense)} | 🛬 נחיתה: ${fmt(fin.landingExpense)}<br>
        🔧 תחזוקה: ${fmt(fin.maintenanceExpense)} ${fin.penalty > 0 ? `| 💥 קנס: ${fmt(fin.penalty)}` : ''}
      </div>
    </div>
  `;
}

// ===== CONFIRM MODAL =====
function openConfirmModal() {
  if (!currentFlightData) return;
  document.getElementById('fpmInput').value = '';
  const fb = document.getElementById('fpmFeedback');
  fb.textContent = t('fpmGood');
  fb.className = 'fpm-feedback fpm-good';
  document.getElementById('confirmModal').style.display = 'flex';
  setTimeout(() => document.getElementById('fpmInput').focus(), 150);
}

function updateFpmFeedback() {
  const val = parseInt(document.getElementById('fpmInput').value) || 0;
  const abs = Math.abs(val);
  const fb = document.getElementById('fpmFeedback');
  if (abs <= 100) { fb.textContent = t('fpmPerfect'); fb.className = 'fpm-feedback fpm-perfect'; }
  else if (abs <= 200) { fb.textContent = t('fpmGood'); fb.className = 'fpm-feedback fpm-good'; }
  else if (abs <= 400) { fb.textContent = t('fpmRough'); fb.className = 'fpm-feedback fpm-rough'; }
  else {
    // Show actual penalty from current pricing settings
    const penaltyText = t('fpmHard').replace('$500', `$${pricing.landingPenalty}`);
    fb.textContent = penaltyText;
    fb.className = 'fpm-feedback fpm-hard';
  }
}

// ===== UPDATE FLIGHT PRICING =====
async function updateFlightPricing() {
  const statusEl = document.getElementById('flightPricingStatus');

  try {
    statusEl.style.display = 'block';
    statusEl.innerHTML = '⏳ מעדכן מחירים דינמיים...';

    // Fetch latest pricing
    const r = await fetch('/api/pricing/update', { method: 'POST' });
    const data = await r.json();

    if (!r.ok) {
      throw new Error(data.error || 'עדכון נכשל');
    }

    // Reload settings to get new prices
    const newSettings = await API.getSettings();
    const newPricing = newSettings.pricing;

    // Update global pricing object
    pricing = { ...pricing, ...newPricing };

    // Recalculate financials with new pricing
    const fpm = parseInt(document.getElementById('fpmInput').value) || 0;
    const fin = calcFinancials(currentFlightData, fpm);

    // Update current flight data
    currentFlightData.profit = fin.netProfit;

    // Show updated status
    const update = data.update;
    statusEl.innerHTML = `
      ✅ <strong>מחירים עודכנו!</strong><br>
      💰 דלק: $${update.fuelCost}/ק"ג | 📊 אינדקס: ${update.costIndex}<br>
      💵 רווח חדש: $${fin.netProfit.toLocaleString()}
    `;

    // Recalculate and show financial breakdown
    updateFpmFeedback();
    showToast('✅ מחירים עודכנו! חשב מחדש עם הערכים החדשים', 'success');

  } catch (err) {
    console.error('Flight pricing update error:', err);
    statusEl.innerHTML = `❌ שגיאה: ${err.message}`;
    showToast('❌ כישלון בעדכון המחירים', 'error');
  }
}

async function confirmFlight() {
  if (!currentFlightData) return;
  const fpm = parseInt(document.getElementById('fpmInput').value) || 0;

  // Validate FPM
  const fpmCheck = validateFPM(fpm);
  if (!fpmCheck.valid) {
    showToast('❌ ' + fpmCheck.error, 'error');
    return;
  }

  const d = currentFlightData;
  const fin = calcFinancials(d, fpm);

  const flight = {
    date: new Date().toISOString(),
    origin: d.origin,
    destination: d.destination,
    originName: d.originName,
    destName: d.destName,
    originLat: d.originLat,
    originLon: d.originLon,
    destLat: d.destLat,
    destLon: d.destLon,
    aircraft: d.aircraft,
    distance: d.distance,
    duration: d.duration,
    durationMins: d.durationMins,
    passengers: d.passengers,
    fuel: d.fuel,
    payload: d.payload,
    fpm: fpm,
    profit: fin.netProfit,
  };

  try {
    const result = await API.addFlight(flight);
    flight.id = result.id;
    flights.unshift(flight);

    closeModal('confirmModal');
    document.getElementById('currentFlightPanel').style.display = 'none';
    currentFlightData = null;

    // Check if this flight completes any mission
    checkMissionCompletion(flight);

    updateUI();
    showToast(t('flightSaved'), 'success');
  } catch(err) {
    console.error(err);
    showToast('❌ Error saving flight', 'error');
  }
}

// ===== UI UPDATE =====
function updateUI() {
  updateStats();
  updateAnalytics();
  updateHistory();
  updateRank();
  updateFavorites();
  updateMap();
  renderGoals();
}

// ===== STATS =====
function updateStats() {
  const total = flights.length;
  const pax = flights.reduce((s, f) => s + (f.passengers || 0), 0);
  const dist = flights.reduce((s, f) => s + (f.distance || 0), 0);
  const mins = flights.reduce((s, f) => s + (f.durationMins || 0), 0);
  const profit = flights.reduce((s, f) => s + (f.profit || 0), 0);
  const fuel = flights.reduce((s, f) => s + (f.fuel || 0), 0);
  const h = Math.floor(mins / 60), m = mins % 60;

  console.log('[Stats] Total flights:', total, 'Pax:', pax, 'Dist:', dist, 'Fuel:', fuel, 'Profit:', profit);

  // Calculate averages
  const avgPax = total > 0 ? Math.round(pax / total) : 0;
  const avgDist = total > 0 ? Math.round(dist / total) : 0;
  const avgFuel = total > 0 ? Math.round(fuel / total) : 0;

  console.log('[Stats] Avg Pax:', avgPax, 'Avg Dist:', avgDist, 'Avg Fuel:', avgFuel);

  const fmt = (n) => n >= 1e6 ? `${(n/1e6).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(1)}K` : n.toLocaleString();

  // Update totals
  document.getElementById('statFlights').textContent = total.toLocaleString();
  document.getElementById('statPassengers').textContent = fmt(pax);
  document.getElementById('statDistance').textContent = fmt(dist);
  document.getElementById('statHours').textContent = `${h}:${String(m).padStart(2,'0')}`;
  document.getElementById('statProfit').textContent = profit >= 1e6 ? `$${(profit/1e6).toFixed(1)}M` : profit >= 1000 ? `$${Math.round(profit/1000)}K` : `$${profit.toLocaleString()}`;
  document.getElementById('statFuel').textContent = fmt(fuel);

  // Update averages
  if (document.getElementById('statPassengersAvgDisplay')) {
    document.getElementById('statPassengersAvgDisplay').textContent = avgPax.toLocaleString();
  }
  if (document.getElementById('statDistanceAvgDisplay')) {
    document.getElementById('statDistanceAvgDisplay').textContent = avgDist.toLocaleString();
  }
  if (document.getElementById('statFuelAvgDisplay')) {
    document.getElementById('statFuelAvgDisplay').textContent = fmt(avgFuel);
  }
  if (document.getElementById('statHoursAvgDisplay')) {
    const avgMins = total > 0 ? Math.round(mins / total) : 0;
    const avgH = Math.floor(avgMins / 60);
    const avgM = avgMins % 60;
    document.getElementById('statHoursAvgDisplay').textContent = `${avgH}:${String(avgM).padStart(2,'0')}`;
  }
  if (document.getElementById('statProfitAvgDisplay')) {
    const avgProfit = total > 0 ? Math.round(profit / total) : 0;
    document.getElementById('statProfitAvgDisplay').textContent = avgProfit >= 1e6 ? `$${(avgProfit/1e6).toFixed(1)}M` : avgProfit >= 1000 ? `$${Math.round(avgProfit/1000)}K` : `$${avgProfit.toLocaleString()}`;
  }
}

// ===== ANALYTICS =====
function updateAnalytics() {
  const section = document.getElementById('analyticsSection');
  const grid = document.getElementById('analyticsGrid');
  const L = TRANSLATIONS[currentLang];

  if (flights.length < 1) {
    section.style.display = 'none';
    return;
  }
  section.style.display = '';

  // 1. Most Profitable Route
  const routeProfit = {};
  const routeCount = {};
  flights.forEach(f => {
    const route = `${f.origin || '?'}-${f.destination || '?'}`;
    routeProfit[route] = (routeProfit[route] || 0) + (f.profit || 0);
    routeCount[route] = (routeCount[route] || 0) + 1;
  });
  let bestRoute = '-', bestRouteAvg = 0;
  for (const [route, total] of Object.entries(routeProfit)) {
    const avg = total / routeCount[route];
    if (avg > bestRouteAvg) { bestRouteAvg = avg; bestRoute = route; }
  }

  // 2. Best Aircraft
  const acProfit = {};
  const acCount = {};
  flights.forEach(f => {
    const ac = f.aircraft || '?';
    acProfit[ac] = (acProfit[ac] || 0) + (f.profit || 0);
    acCount[ac] = (acCount[ac] || 0) + 1;
  });
  let bestAc = '-', bestAcAvg = 0;
  for (const [ac, total] of Object.entries(acProfit)) {
    const avg = total / acCount[ac];
    if (avg > bestAcAvg) { bestAcAvg = avg; bestAc = ac; }
  }

  // 3. Profit Trend (this month vs last month)
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  let thisMonthProfit = 0, lastMonthProfit = 0;
  flights.forEach(f => {
    const d = new Date(f.date);
    if (d.getFullYear() === thisYear && d.getMonth() === thisMonth) thisMonthProfit += (f.profit || 0);
    const lm = thisMonth === 0 ? 11 : thisMonth - 1;
    const ly = thisMonth === 0 ? thisYear - 1 : thisYear;
    if (d.getFullYear() === ly && d.getMonth() === lm) lastMonthProfit += (f.profit || 0);
  });
  let trendPct = 0, trendArrow = '→';
  if (lastMonthProfit > 0) {
    trendPct = Math.round(((thisMonthProfit - lastMonthProfit) / lastMonthProfit) * 100);
    trendArrow = trendPct > 0 ? '↑' : trendPct < 0 ? '↓' : '→';
  } else if (thisMonthProfit > 0) {
    trendPct = 100;
    trendArrow = '↑';
  }

  // 4. Avg FPM
  const totalFPM = flights.reduce((s, f) => s + (f.fpm || 0), 0);
  const avgFPM = flights.length > 0 ? Math.round(totalFPM / flights.length) : 0;

  // 5. Fuel Efficiency
  const totalFuel = flights.reduce((s, f) => s + (f.fuel || 0), 0);
  const totalDist = flights.reduce((s, f) => s + (f.distance || 0), 0);
  const fuelEff = totalDist > 0 ? (totalFuel / totalDist).toFixed(2) : '0';

  // 6. Best Landing Streak (consecutive FPM <= 400)
  let bestStreak = 0, curStreak = 0;
  const sorted = [...flights].sort((a, b) => new Date(a.date) - new Date(b.date));
  sorted.forEach(f => {
    if (Math.abs(f.fpm || 0) <= 400) { curStreak++; bestStreak = Math.max(bestStreak, curStreak); }
    else curStreak = 0;
  });

  const fmtMoney = (n) => n >= 1e6 ? `$${(n/1e6).toFixed(1)}M` : n >= 1000 ? `$${Math.round(n/1000)}K` : `$${n.toLocaleString()}`;

  grid.innerHTML = `
    <div class="analytics-card">
      <div class="analytics-label">${L.analyticsBestRoute || 'Most Profitable Route'}</div>
      <div class="analytics-value">${bestRoute}</div>
      <div class="analytics-sub">${L.analyticsAvg || 'Avg'}: ${fmtMoney(Math.round(bestRouteAvg))}</div>
    </div>
    <div class="analytics-card">
      <div class="analytics-label">${L.analyticsBestAircraft || 'Best Aircraft'}</div>
      <div class="analytics-value">${bestAc}</div>
      <div class="analytics-sub">${L.analyticsAvg || 'Avg'}: ${fmtMoney(Math.round(bestAcAvg))}</div>
    </div>
    <div class="analytics-card">
      <div class="analytics-label">${L.analyticsTrend || 'Profit Trend'}</div>
      <div class="analytics-value">${trendArrow} ${trendPct >= 0 ? '+' : ''}${trendPct}%</div>
      <div class="analytics-sub">${L.analyticsThisMonth || 'This month'}: ${fmtMoney(thisMonthProfit)}</div>
    </div>
    <div class="analytics-card">
      <div class="analytics-label">ממוצע FPM</div>
      <div class="analytics-value">${avgFPM}</div>
      <div class="analytics-sub">ft/min</div>
    </div>
    <div class="analytics-card">
      <div class="analytics-label">${L.analyticsFuelEff || 'Fuel Efficiency'}</div>
      <div class="analytics-value">${fuelEff}</div>
      <div class="analytics-sub">kg/NM</div>
    </div>
    <div class="analytics-card">
      <div class="analytics-label">${L.analyticsLandStreak || 'Best Landing Streak'}</div>
      <div class="analytics-value">${bestStreak}</div>
      <div class="analytics-sub">${L.analyticsGoodLandings || 'consecutive good landings'}</div>
    </div>
  `;
}

// ===== RANK =====
function updateRank() {
  const mins = flights.reduce((s, f) => s + (f.durationMins || 0), 0);
  const totalH = mins / 60;
  const L = TRANSLATIONS[currentLang];

  let idx = 0;
  for (let i = RANK_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalH >= RANK_THRESHOLDS[i]) { idx = i; break; }
  }

  document.getElementById('rankBadge').textContent = L.ranks[idx];
  const hInt = Math.floor(mins / 60), mInt = Math.floor(mins % 60);
  document.getElementById('hoursDisplay').textContent = `${hInt}:${String(mInt).padStart(2,'0')} ${L.hoursLabel}`;
}
// ===== HISTORY =====
function updateHistory() {
  const list = document.getElementById('historyList');
  const L = TRANSLATIONS[currentLang];

  if (flights.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="icon">✈️</div><p>${L.emptyHistory}</p></div>`;
    return;
  }

  list.innerHTML = flights.map((f) => {
    const date = new Date(f.date);
    const dateStr = `${String(date.getDate()).padStart(2,'0')}.${String(date.getMonth()+1).padStart(2,'0')}.${String(date.getFullYear()).slice(-2)}`;
    const timeStr = `${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
    const pc = f.profit >= 0 ? 'var(--green)' : 'var(--red)';
    const ps = f.profit >= 0 ? '+' : '';

    return `
      <div class="history-item" data-flight-id="${f.id}">
        <div style="font-size:1.4rem">✈️</div>
        <div class="history-main">
          <div class="history-route">${f.origin} → ${f.destination}</div>
          <div class="history-sub">📅 ${dateStr} ${timeStr} &bull; ⏱️ ${f.duration} &bull; ✈️ ${f.aircraft}</div>
        </div>
        <div class="history-stats">
          <div class="history-stat">👥 ${(f.passengers||0).toLocaleString()}</div>
          <div class="history-stat">🌍 ${(f.distance||0).toLocaleString()}</div>
          <div class="history-stat">⛽ ${(f.fuel||0).toLocaleString()}</div>
        </div>
        <div class="history-profit" style="color:${pc}">${ps}$${Math.abs(f.profit||0).toLocaleString()}</div>
        <button class="btn btn-primary" onclick="openEditFlight('${f.id}')">✏️ Edit</button>
        <button class="btn btn-danger" onclick="deleteFlight('${f.id}')">${L.deleteBtn}</button>
      </div>
    `;
  }).join('');
}

// ===== EDIT FLIGHT =====
let editingFlightId = null;

function openEditFlight(id) {
  const flight = flights.find(f => f.id === id);
  if (!flight) return;

  editingFlightId = id;
  document.getElementById('editFpm').value = flight.fpm || '';
  document.getElementById('editPassengers').value = flight.passengers || '';
  document.getElementById('editFuel').value = flight.fuel || '';
  document.getElementById('editPayload').value = flight.payload || '';

  // Update FPM feedback
  updateEditFpmFeedback();

  openModal('editModal');
}

function updateEditFpmFeedback() {
  const fpm = parseInt(document.getElementById('editFpm').value) || 0;
  const L = TRANSLATIONS[currentLang];
  const feedback = document.getElementById('editFpmFeedback');

  if (fpm === 0 || Math.abs(fpm) <= 100) {
    feedback.textContent = L.fpmPerfect;
    feedback.className = 'fpm-feedback fpm-perfect';
  } else if (Math.abs(fpm) <= 200) {
    feedback.textContent = L.fpmGood;
    feedback.className = 'fpm-feedback fpm-good';
  } else if (Math.abs(fpm) <= 400) {
    feedback.textContent = L.fpmRough;
    feedback.className = 'fpm-feedback fpm-rough';
  } else {
    feedback.textContent = L.fpmHard;
    feedback.className = 'fpm-feedback fpm-hard';
  }
}

async function saveFlightEdit() {
  if (editingFlightId === null) return;

  const fpm = parseInt(document.getElementById('editFpm').value) || 0;
  const passengers = parseInt(document.getElementById('editPassengers').value) || 0;
  const fuel = parseInt(document.getElementById('editFuel').value) || 0;
  const payload = parseInt(document.getElementById('editPayload').value) || 0;

  // Validate FPM
  const fpmCheck = validateFPM(fpm);
  if (!fpmCheck.valid) {
    showToast('❌ ' + fpmCheck.error, 'error');
    return;
  }

  // Validate positive numbers
  if (passengers < 0 || fuel < 0 || payload < 0) {
    showToast('❌ ' + (t('errorNegativeValue') || 'Values cannot be negative'), 'error');
    return;
  }

  const flightIdx = flights.findIndex(f => f.id === editingFlightId);
  if (flightIdx === -1) return;

  flights[flightIdx].fpm = fpm;
  flights[flightIdx].passengers = passengers;
  flights[flightIdx].fuel = fuel;
  flights[flightIdx].payload = payload;

  // Recalculate profit
  const fin = calcFinancials(flights[flightIdx], fpm);
  flights[flightIdx].profit = fin.netProfit;

  // Save to server
  await API.saveFlight(flights[flightIdx]);

  closeModal('editModal');
  updateUI();
  showToast(t('flightSaved'), 'success');
}

// ===== DELETE FLIGHT =====
async function deleteFlight(id) {
  if (!confirm(t('deleteConfirm'))) return;
  await API.deleteFlight(id);
  flights = flights.filter(f => f.id !== id);
  updateUI();
}

// ===== FAVORITES =====
function updateFavorites() {
  const L = TRANSLATIONS[currentLang];
  const dep = {}, land = {};
  flights.forEach(f => {
    dep[f.origin] = (dep[f.origin] || 0) + 1;
    land[f.destination] = (land[f.destination] || 0) + 1;
  });

  const topDep = Object.entries(dep).sort((a,b) => b[1]-a[1]).slice(0,5);
  const topLand = Object.entries(land).sort((a,b) => b[1]-a[1]).slice(0,5);

  const buildList = (items, icon, countWord) => {
    if (items.length === 0) return `<div style="color:var(--text-muted);font-size:0.82rem;padding:6px">-</div>`;
    return items.map((item, i) => `
      <div class="fav-item">
        <div>
          <div class="fav-icao">${item[0]}</div>
          <div class="fav-count">${item[1]} ${countWord}</div>
        </div>
        <div style="text-align:center">
          <div class="fav-icon">${icon}</div>
          <div class="fav-rank">#${i+1}</div>
        </div>
      </div>
    `).join('');
  };

  document.getElementById('favoritesContent').innerHTML = `
    <div>
      <div class="fav-section-title">${L.favoriteDeparts}</div>
      ${buildList(topDep, '🛫', L.departures)}
    </div>
    <div>
      <div class="fav-section-title">${L.favoriteLandings}</div>
      ${buildList(topLand, '🛬', L.landings)}
    </div>
  `;
}

// ===== MAP =====
function initMap() {
  if (mapInstance) return;
  mapInstance = L.map('map', { zoomControl: true, attributionControl: false });
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 18
  }).addTo(mapInstance);
  mapInstance.setView([30, 15], 2);
}

function updateMap() {
  if (!mapInstance) return;
  mapLayers.forEach(l => mapInstance.removeLayer(l));
  mapLayers = [];

  if (flights.length === 0) return;

  const L_tr = TRANSLATIONS[currentLang];
  const bounds = [];

  flights.forEach(f => {
    if (!f.originLat && !f.destLat) return;
    const from = [f.originLat, f.originLon];
    const to = [f.destLat, f.destLon];
    const color = f.profit >= 0 ? '#10b981' : '#ef4444';
    const ps = f.profit >= 0 ? '+' : '';

    const line = L.polyline([from, to], { color, weight: 4, opacity: 1, dashArray: '5, 5' });
    line.bindPopup(`
      <div class="map-popup-route">${f.origin} → ${f.destination}</div>
      <div class="${f.profit >= 0 ? 'map-popup-pos' : 'map-popup-neg'}">${L_tr.mapPopupProfit}: ${ps}$${Math.abs(f.profit||0).toLocaleString()}</div>
      <div>${L_tr.mapPopupTime}: ${f.duration}</div>
    `);
    line.addTo(mapInstance);
    mapLayers.push(line);

    [from, to].forEach((pos, idx) => {
      const isOrigin = idx === 0;
      const code = isOrigin ? f.origin : f.destination;
      const mk = L.circleMarker(pos, { radius: 12, fillColor: isOrigin ? '#f59e0b' : '#6366f1', color: '#ffffff', fillOpacity: 1, weight: 3 });
      mk.bindPopup(`<div style="font-weight:bold">${code}</div>`);
      mk.addTo(mapInstance);
      mapLayers.push(mk);
    });

    bounds.push(from, to);
  });

  if (bounds.length > 0) {
    try { mapInstance.fitBounds(bounds, { padding: [30, 30] }); } catch(e) {}
  }
}

// ===== CHARTS =====
function openChartModal(type) {
  if (flights.length === 0) return;
  const L = TRANSLATIONS[currentLang];
  currentChartType = type;
  currentChartPeriod = 'day';

  // Reset toggle buttons to "day"
  document.querySelectorAll('.period-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.period === 'day');
  });

  document.getElementById('chartModalTitle').textContent = L.chartTitles[type];
  document.getElementById('chartModal').style.display = 'flex';
  setTimeout(() => renderChart(type, 'day'), 60);
}

// Period toggle event listeners (attached once after DOM is ready)
function setupPeriodToggle() {
  document.querySelectorAll('.period-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentChartPeriod = btn.dataset.period;
      renderChart(currentChartType, currentChartPeriod);
    });
  });
}

function renderChart(type, period = 'day') {
  if (chartInstance) { chartInstance.destroy(); chartInstance = null; }

  const ctx = document.getElementById('mainChart').getContext('2d');
  const sorted = [...flights].sort((a, b) => new Date(a.date) - new Date(b.date));
  const L = TRANSLATIONS[currentLang];

  // ── Key functions by period ──────────────────────────────────────────────
  const dayKey = (f) => {
    const d = new Date(f.date);
    return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getFullYear()).slice(-2)}`;
  };

  const weekKey = (f) => {
    const d = new Date(f.date);
    d.setHours(0,0,0,0);
    d.setDate(d.getDate() + 3 - (d.getDay()+6)%7);
    const week1 = new Date(d.getFullYear(), 0, 4);
    const weekNum = 1 + Math.round(((d - week1) / 86400000 - 3 + (week1.getDay()+6)%7) / 7);
    return `W${weekNum}/${String(d.getFullYear()).slice(-2)}`;
  };

  const monthKey = (f) => {
    const d = new Date(f.date);
    return `${L.monthNames[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`;
  };

  const keyFn = period === 'month' ? monthKey : period === 'week' ? weekKey : dayKey;

  // Build ordered map: periodKey → [flights...]
  const dayMap = new Map();
  sorted.forEach(f => {
    const k = keyFn(f);
    if (!dayMap.has(k)) dayMap.set(k, []);
    dayMap.get(k).push(f);
  });

  // One entry per unique day, in chronological order
  const days = Array.from(dayMap.entries()).map(([k, group]) => ({
    label: k,                                                          // "18.02.25"
    count: group.length,
    passengers:  group.reduce((s, f) => s + (f.passengers  || 0), 0),
    distance:    group.reduce((s, f) => s + (f.distance    || 0), 0),
    durationMins:group.reduce((s, f) => s + (f.durationMins|| 0), 0),
    profit:      group.reduce((s, f) => s + (f.profit      || 0), 0),
    fuel:        group.reduce((s, f) => s + (f.fuel        || 0), 0),
    flights:     group,
  }));

  const labels = days.map(d => d.label);

  let data, label, color, pointColors;
  switch(type) {
    case 'flights':
      data = days.map(d => d.count);
      label = L.statFlights; color = '#3b82f6'; break;
    case 'passengers':
      data = days.map(d => d.passengers);
      label = L.statPassengers; color = '#8b5cf6'; break;
    case 'distance':
      data = days.map(d => d.distance);
      label = L.statDistance; color = '#10b981'; break;
    case 'duration':
      data = days.map(d => d.durationMins);
      label = L.statHours; color = '#f59e0b'; break;
    case 'profit':
      data = days.map(d => d.profit);
      label = L.statProfit;
      color = '#3b82f6';
      pointColors = data.map(v => v >= 0 ? '#10b981' : '#ef4444');
      break;
    case 'fuel':
      data = days.map(d => d.fuel);
      label = L.statFuel; color = '#ef4444'; break;
  }

  // Calculate average value
  const avgValue = data.length > 0 ? data.reduce((s, v) => s + v, 0) / data.length : 0;
  const avgLine = Array(data.length).fill(avgValue);

  // Format average display
  let avgLabel;
  if (type === 'profit') {
    const sign = avgValue >= 0 ? '+' : '';
    avgLabel = currentLang === 'he' ? `ממוצע (${sign}$${Math.abs(Math.round(avgValue)).toLocaleString()})` : `Average (${sign}$${Math.abs(Math.round(avgValue)).toLocaleString()})`;
  } else if (type === 'duration') {
    const avgMins = Math.round(avgValue);
    const avgH = Math.floor(avgMins / 60);
    const avgM = avgMins % 60;
    avgLabel = currentLang === 'he' ? `ממוצע (${avgH}:${String(avgM).padStart(2,'0')})` : `Average (${avgH}:${String(avgM).padStart(2,'0')})`;
  } else {
    avgLabel = currentLang === 'he' ? `ממוצע (${Math.round(avgValue).toLocaleString()})` : `Average (${Math.round(avgValue).toLocaleString()})`;
  }

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label,
          data,
          backgroundColor: color + '22',
          borderColor: color,
          borderWidth: 2.5,
          pointBackgroundColor: pointColors || color,
          pointBorderColor: pointColors ? pointColors.map(c => c + 'cc') : color,
          pointRadius: 6,
          pointHoverRadius: 9,
          pointBorderWidth: 2,
          fill: true,
          tension: 0.35,
        },
        {
          label: avgLabel,
          data: avgLine,
          borderColor: color + 'aa',
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 0,
          pointHoverRadius: 0,
          fill: false,
          tension: 0,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: '#94a3b8',
            font: { size: 12 },
            padding: 15,
            usePointStyle: true,
          }
        },
        tooltip: {
          backgroundColor: '#1e293b',
          borderColor: '#334155',
          borderWidth: 1,
          titleColor: '#f1f5f9',
          bodyColor: '#94a3b8',
          padding: 10,
          callbacks: {
            // Title = period label + number of flights in that period
            title: (items) => {
              const day = days[items[0].dataIndex];
              const flightsWord = currentLang === 'he' ? 'טיסות' : 'flights';
              const icon = period === 'month' ? '📆' : period === 'week' ? '🗓️' : '📅';
              return `${icon} ${day.label}  (${day.count} ${flightsWord})`;
            },
            // Main value line
            label: (item) => {
              const v = item.raw;
              if (type === 'profit') {
                const sign = v >= 0 ? '+' : '';
                return `  ${sign}$${Math.abs(v).toLocaleString()}`;
              }
              return `  ${Number(v).toLocaleString()}`;
            },
            // List each flight on that day
            afterBody: (items) => {
              const day = days[items[0].dataIndex];
              if (day.count <= 1) return [];
              return day.flights.map(f => `  • ${f.origin} → ${f.destination}`);
            }
          }
        }
      },
      scales: {
        x: {
          ticks: { color: '#94a3b8', maxRotation: 45, font: { size: 10 } },
          grid: { color: '#1e293b' },
          border: { color: '#334155' }
        },
        y: {
          beginAtZero: true,
          ticks: { color: '#94a3b8', font: { size: 11 } },
          grid: { color: '#334155' },
          border: { color: '#334155' }
        }
      },
      interaction: { mode: 'index', intersect: false },
      animation: { duration: 400, easing: 'easeInOutQuart' }
    }
  });
}

// ===== RANK MODAL =====
function openRankModal() {
  const mins = flights.reduce((s, f) => s + (f.durationMins || 0), 0);
  const totalH = mins / 60;
  const L = TRANSLATIONS[currentLang];

  let currentIdx = 0;
  for (let i = RANK_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalH >= RANK_THRESHOLDS[i]) { currentIdx = i; break; }
  }

  document.getElementById('ranksList').innerHTML = RANK_THRESHOLDS.map((threshold, i) => {
    const isCurrent = i === currentIdx;
    const isDone = totalH >= threshold && !isCurrent;
    return `
      <div class="rank-item ${isCurrent ? 'current' : ''} ${isDone ? 'done' : ''}">
        <div class="rank-dot ${isCurrent ? 'active' : isDone ? 'done' : ''}"></div>
        <div class="rank-name">${L.ranks[i]}</div>
        <div class="rank-hours">${threshold}${L.plusHours}</div>
        ${isCurrent ? `<div class="rank-current-label">${L.hereLabel}</div>` : ''}
      </div>
    `;
  }).join('');

  document.getElementById('rankModal').style.display = 'flex';
}

// ===== MODAL CLOSE =====
function openModal(id) {
  document.getElementById(id).style.display = 'flex';
}

function closeModal(id) {
  document.getElementById(id).style.display = 'none';
  if (id === 'chartModal' && chartInstance) { chartInstance.destroy(); chartInstance = null; }
}

function handleOverlayClick(e, id) {
  if (e.target === e.currentTarget) closeModal(id);
}

// ESC key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay').forEach(m => {
      if (m.style.display !== 'none') closeModal(m.id);
    });
  }
});

// ===== FPM AUTO-CONVERT =====
document.addEventListener('DOMContentLoaded', () => {
  // Handle FPM inputs - convert positive to negative automatically
  const setupFpmInput = (inputId, feedbackFn) => {
    const input = document.getElementById(inputId);
    if (input) {
      input.addEventListener('input', () => {
        let val = input.value.trim();
        if (val && !isNaN(val)) {
          const num = parseInt(val);
          if (num > 0) {
            input.value = -num;
          } else if (num < 0) {
            input.value = num;
          }
        }
        if (feedbackFn) feedbackFn();
      });
    }
  };

  setupFpmInput('fpmInput', updateFpmFeedback);
  setupFpmInput('editFpm', updateEditFpmFeedback);
});

// ===== SETTINGS =====
function loadPricingForm() {
  document.getElementById('pTicketBase').value = pricing.ticketPriceBase;
  document.getElementById('pTicketMedium').value = pricing.ticketPriceMedium;
  document.getElementById('pTicketLong').value = pricing.ticketPriceLong;
  document.getElementById('pCargo').value = pricing.cargoRate;
  document.getElementById('pFuel').value = pricing.fuelCost;
  document.getElementById('pCrew').value = pricing.crewCost;
  document.getElementById('pLandingSmall').value = pricing.landingFeeSmall;
  document.getElementById('pLandingMedium').value = pricing.landingFeeMedium;
  document.getElementById('pLandingLarge').value = pricing.landingFeeLarge;
  document.getElementById('pMaint').value = pricing.maintenanceCost;
  document.getElementById('pPenalty').value = pricing.landingPenalty;
}

async function saveSettings() {
  try {
    const lang = document.getElementById('langSelect').value;
    const simbriefId = document.getElementById('simbriefId').value.trim();
    const reportEmail = document.getElementById('reportEmail').value.trim();

    // Validate pricing inputs
    const pricingInputs = {
      'pTicketBase': 'Ticket Price (Short)',
      'pTicketMedium': 'Ticket Price (Medium)',
      'pTicketLong': 'Ticket Price (Long)',
      'pCargo': 'Cargo Rate',
      'pFuel': 'Fuel Cost',
      'pCrew': 'Crew Cost',
      'pLandingSmall': 'Landing Fee (Small)',
      'pLandingMedium': 'Landing Fee (Medium)',
      'pLandingLarge': 'Landing Fee (Large)',
      'pMaint': 'Maintenance Cost',
      'pPenalty': 'Landing Penalty'
    };

    for (const [id, name] of Object.entries(pricingInputs)) {
      const val = document.getElementById(id).value;
      if (val) {
        const check = validatePrice(val, name);
        if (!check.valid) {
          showToast('❌ ' + check.error, 'error');
          return;
        }
      }
    }

    pricing = {
      ticketPriceBase: parseFloat(document.getElementById('pTicketBase').value) || DEFAULT_PRICING.ticketPriceBase,
      ticketPriceMedium: parseFloat(document.getElementById('pTicketMedium').value) || DEFAULT_PRICING.ticketPriceMedium,
      ticketPriceLong: parseFloat(document.getElementById('pTicketLong').value) || DEFAULT_PRICING.ticketPriceLong,
      cargoRate: parseFloat(document.getElementById('pCargo').value) || DEFAULT_PRICING.cargoRate,
      fuelCost: parseFloat(document.getElementById('pFuel').value) || DEFAULT_PRICING.fuelCost,
      crewCost: parseFloat(document.getElementById('pCrew').value) || DEFAULT_PRICING.crewCost,
      landingFeeSmall: parseFloat(document.getElementById('pLandingSmall').value) || DEFAULT_PRICING.landingFeeSmall,
      landingFeeMedium: parseFloat(document.getElementById('pLandingMedium').value) || DEFAULT_PRICING.landingFeeMedium,
      landingFeeLarge: parseFloat(document.getElementById('pLandingLarge').value) || DEFAULT_PRICING.landingFeeLarge,
      maintenanceCost: parseFloat(document.getElementById('pMaint').value) || DEFAULT_PRICING.maintenanceCost,
      landingPenalty: parseFloat(document.getElementById('pPenalty').value) || DEFAULT_PRICING.landingPenalty,
    };

    // Save individual pricing settings (not as one object)
    const settingsToSave = [
      API.saveSetting('lang', lang),
      API.saveSetting('simbriefId', simbriefId),
      API.saveSetting('reportEmail', reportEmail),
      API.saveSetting('pTicketBase', pricing.ticketPriceBase.toString()),
      API.saveSetting('pTicketMedium', pricing.ticketPriceMedium.toString()),
      API.saveSetting('pTicketLong', pricing.ticketPriceLong.toString()),
      API.saveSetting('pCargo', pricing.cargoRate.toString()),
      API.saveSetting('pFuel', pricing.fuelCost.toString()),
      API.saveSetting('pCrew', pricing.crewCost.toString()),
      API.saveSetting('pLandingSmall', pricing.landingFeeSmall.toString()),
      API.saveSetting('pLandingMedium', pricing.landingFeeMedium.toString()),
      API.saveSetting('pLandingLarge', pricing.landingFeeLarge.toString()),
      API.saveSetting('pMaint', pricing.maintenanceCost.toString()),
      API.saveSetting('pPenalty', pricing.landingPenalty.toString())
    ];

    const results = await Promise.allSettled(settingsToSave);
    const failed = results.filter(r => r.status === 'rejected');

    if (failed.length > 0) {
      console.error('Failed to save settings:', failed);
      failed.forEach(f => console.error(f.reason));
      showToast(`❌ שגיאה בשמירת ${failed.length} הגדרות`, 'error');
      return;
    }

    showToast(t('settingsSaved'), 'success');

    // Always reload to ensure settings are properly synchronized
    setTimeout(() => location.reload(), 700);
  } catch (err) {
    console.error('Settings save error:', err);
    showToast('❌ ' + t('loadError'), 'error');
  }
}

async function resetSettings() {
  pricing = { ...DEFAULT_PRICING };

  const settingsToReset = [
    API.saveSetting('pTicketBase', pricing.ticketPriceBase.toString()),
    API.saveSetting('pTicketMedium', pricing.ticketPriceMedium.toString()),
    API.saveSetting('pTicketLong', pricing.ticketPriceLong.toString()),
    API.saveSetting('pCargo', pricing.cargoRate.toString()),
    API.saveSetting('pFuel', pricing.fuelCost.toString()),
    API.saveSetting('pCrew', pricing.crewCost.toString()),
    API.saveSetting('pLandingSmall', pricing.landingFeeSmall.toString()),
    API.saveSetting('pLandingMedium', pricing.landingFeeMedium.toString()),
    API.saveSetting('pLandingLarge', pricing.landingFeeLarge.toString()),
    API.saveSetting('pMaint', pricing.maintenanceCost.toString()),
    API.saveSetting('pPenalty', pricing.landingPenalty.toString())
  ];

  await Promise.all(settingsToReset);
  showToast(t('settingsReset'));
  // Reload to ensure settings are fresh from server
  setTimeout(() => location.reload(), 700);
}

// ===== DYNAMIC PRICING UPDATE =====
async function updateDynamicPricing() {
  const infoEl = document.getElementById('pricingInfo');
  const statusEl = document.getElementById('pricingStatus');

  try {
    infoEl.style.display = 'block';
    statusEl.textContent = '⏳ מעדכן מחירים מנתוני שוק בזמן אמת...';

    const r = await fetch('/api/pricing/update', { method: 'POST' });
    const data = await r.json();

    if (r.ok && data) {
      const update = data.update;
      statusEl.innerHTML = `
        ✅ מחירים עודכנו בהצלחה!<br>
        💰 עלות דלק: <strong>$${update.fuelCost}/ק"ג</strong><br>
        📊 מדד עלויות: <strong>${update.costIndex}</strong> (כפליים: ${update.multiplier}x)<br>
        🕐 עדכון: ${update.timestamp}
      `;

      showToast('✅ מחירים עודכנו בהצלחה! טען מחדש כדי לראות את השינויים', 'success');

      // Reload after 2 seconds
      setTimeout(() => location.reload(), 2000);
    } else {
      throw new Error(data.error || 'עדכון נכשל');
    }
  } catch (err) {
    console.error('Pricing update error:', err);
    statusEl.innerHTML = `❌ שגיאה בעדכון: ${err.message}`;
    showToast('❌ כישלון בעדכון המחירים', 'error');
  }
}

// ===== PRICING ANALYTICS =====
let pricingCharts = {};

// Helper function to format chart labels based on time period
function formatChartLabel(dateStr, days) {
  const date = new Date(dateStr);

  if (days <= 7) {
    // 7 days: show day + month + hour:minute (e.g., "14 מר' 14:30")
    const dayMonth = date.toLocaleDateString('he-IL', {day: 'numeric', month: 'short'});
    const time = date.toLocaleTimeString('he-IL', {hour: '2-digit', minute: '2-digit'});
    return `${dayMonth} ${time}`;
  } else if (days <= 30) {
    // 30 days: show day + month only (e.g., "14 מר'")
    return date.toLocaleDateString('he-IL', {day: 'numeric', month: 'short'});
  } else {
    // 90 days: show week number (e.g., "שבוע 1")
    const onejan = new Date(date.getFullYear(), 0, 1);
    const millisecsInDay = 86400000;
    const weekNum = Math.ceil((((date - onejan) / millisecsInDay) + onejan.getDay() + 1) / 7);
    return `שבוע ${weekNum}`;
  }
}

async function loadPricingHistory(days = 30) {
  try {
    const container = document.getElementById('pricingChartsContainer');
    const loadingState = document.getElementById('pricingLoadingState');

    loadingState.style.display = 'block';
    container.style.display = 'none';

    const r = await fetch(`/api/pricing/history?days=${days}`);
    const data = await r.json();

    if (!data || data.length === 0) {
      loadingState.style.display = 'block';
      return;
    }

    loadingState.style.display = 'none';
    container.style.display = 'grid';

    // Process data - Format labels based on selected time period
    const labels = data.history.map(h => formatChartLabel(h.recorded_at, days));

    // Destroy existing charts
    Object.values(pricingCharts).forEach(chart => chart.destroy?.());
    pricingCharts = {};

    // Fuel Cost Chart
    const fuelCtx = document.getElementById('fuelCostChart').getContext('2d');
    pricingCharts.fuel = new Chart(fuelCtx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: '⛽ עלות דלק ($/ק"ג)',
          data: data.history.map(h => parseFloat(h.fuel_cost)),
          borderColor: '#f97316',
          backgroundColor: 'rgba(249,115,22,0.1)',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            ticks: {
              maxTicksLimit: 5,
              autoSkip: true,
              maxRotation: 0,
              font: { size: 10 }
            }
          },
          y: {
            ticks: {
              font: { size: 10 }
            }
          }
        }
      }
    });

    // Cost Index Chart
    const indexCtx = document.getElementById('costIndexChart').getContext('2d');
    pricingCharts.index = new Chart(indexCtx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: '📈 מדד עלויות',
          data: data.history.map(h => parseFloat(h.cost_index)),
          borderColor: '#8b5cf6',
          backgroundColor: 'rgba(139,92,246,0.1)',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            ticks: {
              maxTicksLimit: 5,
              autoSkip: true,
              maxRotation: 0,
              font: { size: 10 }
            }
          },
          y: {
            ticks: {
              font: { size: 10 }
            }
          }
        }
      }
    });

    // Ticket Prices Chart
    const ticketCtx = document.getElementById('ticketPricesChart').getContext('2d');
    pricingCharts.tickets = new Chart(ticketCtx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'טיסה קצרה',
            data: data.history.map(h => parseFloat(h.ticket_base)),
            borderColor: '#3b82f6',
            tension: 0.4
          },
          {
            label: 'טיסה בינונית',
            data: data.history.map(h => parseFloat(h.ticket_medium)),
            borderColor: '#06b6d4',
            tension: 0.4
          },
          {
            label: 'טיסה ארוכה',
            data: data.history.map(h => parseFloat(h.ticket_long)),
            borderColor: '#10b981',
            tension: 0.4
          }
        ]
      },
      options: {
        responsive: false,
        scales: {
          x: {
            ticks: {
              maxTicksLimit: 5,
              autoSkip: true,
              maxRotation: 0,
              font: { size: 10 }
            }
          },
          y: {
            ticks: {
              font: { size: 10 }
            }
          }
        }
      }
    });

    // Landing Fees Chart
    const landingCtx = document.getElementById('landingFeesChart').getContext('2d');
    pricingCharts.landing = new Chart(landingCtx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'קטנה',
            data: data.history.map(h => parseFloat(h.landing_small)),
            borderColor: '#ec4899',
            tension: 0.4
          },
          {
            label: 'בינונית',
            data: data.history.map(h => parseFloat(h.landing_medium)),
            borderColor: '#f59e0b',
            tension: 0.4
          },
          {
            label: 'גדולה',
            data: data.history.map(h => parseFloat(h.landing_large)),
            borderColor: '#ef4444',
            tension: 0.4
          }
        ]
      },
      options: {
        responsive: false,
        scales: {
          x: {
            ticks: {
              maxTicksLimit: 5,
              autoSkip: true,
              maxRotation: 0,
              font: { size: 10 }
            }
          },
          y: {
            ticks: {
              font: { size: 10 }
            }
          }
        }
      }
    });

  } catch (err) {
    console.error('Pricing history error:', err);
    document.getElementById('pricingLoadingState').innerHTML = '❌ שגיאה בטעינת היסטוריה';
  }
}

// ===== EXCEL =====
// ===== MONTHLY REPORT =====
function openReportDialog() {
  if (flights.length === 0) {
    showToast(t('emptyHistory'), 'warning');
    return;
  }
  const L = TRANSLATIONS[currentLang];
  const select = document.getElementById('reportMonthSelect');
  const months = {};
  flights.forEach(f => {
    const d = new Date(f.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months[key] = true;
  });
  const sorted = Object.keys(months).sort().reverse();
  select.innerHTML = sorted.map(k => {
    const [y, m] = k.split('-');
    const name = L.monthNames[parseInt(m) - 1];
    return `<option value="${k}">${name} ${y}</option>`;
  }).join('');
  openModal('reportModal');
}

function generateReport() {
  const L = TRANSLATIONS[currentLang];
  const selected = document.getElementById('reportMonthSelect').value;
  const [year, month] = selected.split('-').map(Number);

  const monthFlights = flights.filter(f => {
    const d = new Date(f.date);
    return d.getFullYear() === year && d.getMonth() + 1 === month;
  }).sort((a, b) => new Date(a.date) - new Date(b.date));

  if (monthFlights.length === 0) {
    showToast('❌ ' + (L.reportNoFlights || 'No flights this month'), 'error');
    return;
  }

  // Summary stats
  const totalFlights = monthFlights.length;
  const totalProfit = monthFlights.reduce((s, f) => s + (f.profit || 0), 0);
  const totalMins = monthFlights.reduce((s, f) => s + (f.durationMins || 0), 0);
  const totalFuel = monthFlights.reduce((s, f) => s + (f.fuel || 0), 0);
  const totalPax = monthFlights.reduce((s, f) => s + (f.passengers || 0), 0);
  const totalDist = monthFlights.reduce((s, f) => s + (f.distance || 0), 0);
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;

  // Top 5 routes by profit
  const routeP = {};
  monthFlights.forEach(f => {
    const r = `${f.origin}-${f.destination}`;
    routeP[r] = (routeP[r] || 0) + (f.profit || 0);
  });
  const topRoutes = Object.entries(routeP).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Top 5 aircraft by profit
  const acP = {};
  monthFlights.forEach(f => {
    const ac = f.aircraft || '?';
    acP[ac] = (acP[ac] || 0) + (f.profit || 0);
  });
  const topAircraft = Object.entries(acP).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const monthName = L.monthNames[month - 1];
  const isRtl = currentLang === 'he';
  const dir = isRtl ? 'rtl' : 'ltr';
  const fmtMoney = (n) => `$${n.toLocaleString()}`;

  const html = `<!DOCTYPE html>
<html dir="${dir}">
<head>
<meta charset="UTF-8">
<title>FlightPro - ${L.reportTitle || 'Monthly Report'} - ${monthName} ${year}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #fff; color: #1e293b; padding: 30px; direction: ${dir}; }
  .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #3b82f6; padding-bottom: 15px; }
  .header h1 { font-size: 24px; color: #1e293b; }
  .header h2 { font-size: 18px; color: #64748b; margin-top: 5px; }
  .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 25px; }
  .stat-box { background: #f1f5f9; border-radius: 8px; padding: 15px; text-align: center; }
  .stat-box .val { font-size: 22px; font-weight: 700; color: #3b82f6; }
  .stat-box .lbl { font-size: 12px; color: #64748b; margin-top: 4px; }
  h3 { font-size: 16px; margin: 20px 0 10px; color: #334155; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
  th { background: #f1f5f9; padding: 8px; text-align: ${isRtl ? 'right' : 'left'}; font-weight: 600; border-bottom: 2px solid #cbd5e1; }
  td { padding: 7px 8px; border-bottom: 1px solid #e2e8f0; }
  tr:nth-child(even) { background: #f8fafc; }
  .profit-pos { color: #16a34a; }
  .profit-neg { color: #dc2626; }
  .print-btn { display: block; margin: 20px auto; padding: 10px 30px; background: #3b82f6; color: #fff; border: none; border-radius: 6px; font-size: 14px; cursor: pointer; }
  @media print { .print-btn { display: none; } }
</style>
</head>
<body>
<div class="header">
  <h1>✈️ FlightPro</h1>
  <h2>${L.reportTitle || 'Monthly Report'} - ${monthName} ${year}</h2>
</div>

<div class="stats-grid">
  <div class="stat-box"><div class="val">${totalFlights}</div><div class="lbl">${L.statFlights || 'Total Flights'}</div></div>
  <div class="stat-box"><div class="val">${fmtMoney(totalProfit)}</div><div class="lbl">${L.statProfit || 'Total Profit'}</div></div>
  <div class="stat-box"><div class="val">${hours}:${String(mins).padStart(2,'0')}</div><div class="lbl">${L.statHours || 'Flight Hours'}</div></div>
  <div class="stat-box"><div class="val">${totalFuel.toLocaleString()}</div><div class="lbl">${L.statFuel || 'Fuel (kg)'}</div></div>
  <div class="stat-box"><div class="val">${totalPax.toLocaleString()}</div><div class="lbl">${L.statPassengers || 'Passengers'}</div></div>
  <div class="stat-box"><div class="val">${totalDist.toLocaleString()}</div><div class="lbl">${L.statDistance || 'Distance (NM)'}</div></div>
</div>

<h3>🏆 ${L.reportTopRoutes || 'Top 5 Routes'}</h3>
<table>
  <tr><th>#</th><th>${L.reportRoute || 'Route'}</th><th>${L.netProfit || 'Profit'}</th></tr>
  ${topRoutes.map(([r, p], i) => `<tr><td>${i+1}</td><td>${r}</td><td class="${p >= 0 ? 'profit-pos' : 'profit-neg'}">${fmtMoney(p)}</td></tr>`).join('')}
</table>

<h3>✈️ ${L.reportTopAircraft || 'Top 5 Aircraft'}</h3>
<table>
  <tr><th>#</th><th>${L.aircraft || 'Aircraft'}</th><th>${L.netProfit || 'Profit'}</th></tr>
  ${topAircraft.map(([ac, p], i) => `<tr><td>${i+1}</td><td>${ac}</td><td class="${p >= 0 ? 'profit-pos' : 'profit-neg'}">${fmtMoney(p)}</td></tr>`).join('')}
</table>

<h3>📋 ${L.reportFlightLog || 'Flight Log'}</h3>
<table>
  <tr><th>${L.reportDate || 'Date'}</th><th>${L.reportRoute || 'Route'}</th><th>${L.aircraft || 'Aircraft'}</th><th>FPM</th><th>${L.netProfit || 'Profit'}</th></tr>
  ${monthFlights.map(f => {
    const d = new Date(f.date);
    const dateStr = `${d.getDate()}/${d.getMonth()+1}`;
    const p = f.profit || 0;
    return `<tr><td>${dateStr}</td><td>${f.origin}-${f.destination}</td><td>${f.aircraft || '-'}</td><td>${f.fpm || 0}</td><td class="${p >= 0 ? 'profit-pos' : 'profit-neg'}">${fmtMoney(p)}</td></tr>`;
  }).join('')}
</table>

<button class="print-btn" onclick="window.print()">🖨️ ${L.reportPrint || 'Print / Save as PDF'}</button>
</body>
</html>`;

  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
  closeModal('reportModal');
}

function exportExcel() {
  if (flights.length === 0) {
    showToast(t('emptyHistory'), 'warning');
    return;
  }

  try {
    const data = flights.map(f => {
      const d = new Date(f.date);
      return {
        Date: `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`,
        Time: `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`,
        Origin: f.origin,
        Destination: f.destination,
        Aircraft: f.aircraft,
        Distance_NM: f.distance,
        Duration: f.duration,
        Passengers: f.passengers,
        Fuel_kg: f.fuel,
        Payload_kg: f.payload || 0,
        FPM: f.fpm,
        Profit_USD: f.profit,
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [{wch:12},{wch:8},{wch:8},{wch:12},{wch:12},{wch:10},{wch:8},{wch:12},{wch:10},{wch:10},{wch:8},{wch:12}];
    XLSX.utils.book_append_sheet(wb, ws, 'Flights');
    const today = new Date();
    XLSX.writeFile(wb, `flights_${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}.xlsx`);

    showToast(`✅ Exported ${flights.length} flights`, 'success');
  } catch(err) {
    console.error('Export error:', err);
    showToast('❌ Export failed', 'error');
  }
}

async function importExcel(input) {
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const wb = XLSX.read(e.target.result, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(ws);
      if (jsonData.length === 0) { showToast(t('importError'), 'error'); return; }

      const L = TRANSLATIONS[currentLang];
      const confirmMsg = typeof L.importConfirm === 'function' ? L.importConfirm(jsonData.length) : `Import ${jsonData.length} flights?`;
      if (!confirm(confirmMsg)) return;

      const newFlights = jsonData.map(row => {
        const dur = String(row.Duration || '0:00');
        const parts = dur.split(':');
        const durationMins = parseInt(parts[0] || 0) * 60 + parseInt(parts[1] || 0);
        let dateStr = new Date().toISOString();
        if (row.Date) {
          const dParts = String(row.Date).split('.');
          if (dParts.length === 3) dateStr = new Date(`${dParts[2]}-${dParts[1]}-${dParts[0]}`).toISOString();
        }
        return {
          date: dateStr,
          origin: (row.Origin || '????').toUpperCase(),
          destination: (row.Destination || '????').toUpperCase(),
          originName: '', destName: '',
          originLat: 0, originLon: 0, destLat: 0, destLon: 0,
          aircraft: row.Aircraft || 'Unknown',
          distance: parseInt(row.Distance_NM) || 0,
          duration: dur,
          durationMins,
          passengers: parseInt(row.Passengers) || 0,
          fuel: parseInt(row.Fuel_kg) || 0,
          payload: parseInt(row.Payload_kg) || 0,
          fpm: parseInt(row.FPM) || 0,
          profit: parseInt(row.Profit_USD) || 0,
        };
      });

      const result = await API.importFlights(newFlights);
      flights = await API.getFlights();
      updateUI();
      const msg = typeof L.importSuccess === 'function' ? L.importSuccess(result.count) : `✅ ${result.count} imported`;
      showToast(msg, 'success');
    } catch(err) {
      console.error(err);
      showToast(t('importError'), 'error');
    }
  };
  reader.readAsArrayBuffer(file);
  input.value = '';
}

// ===== GOALS =====
async function loadGoalsForm() {
  const el = (id) => document.getElementById(id);

  // Try to load from API/DB first, fallback to localStorage
  try {
    const res = await fetch('/api/settings/goals');
    if (res.ok) {
      const goals = await res.json();
      if (goals.flights)    el('goalFlights').value    = goals.flights;
      if (goals.hours)      el('goalHours').value      = goals.hours;
      if (goals.profit)     el('goalProfit').value     = goals.profit;
      if (goals.passengers) el('goalPassengers').value = goals.passengers;
      localStorage.setItem('airliner_goals', JSON.stringify(goals));
      return;
    }
  } catch (e) { /* fallback */ }

  // Fallback to localStorage
  const goals = JSON.parse(localStorage.getItem('airliner_goals') || '{}');
  if (goals.flights)    el('goalFlights').value    = goals.flights;
  if (goals.hours)      el('goalHours').value      = goals.hours;
  if (goals.profit)     el('goalProfit').value     = goals.profit;
  if (goals.passengers) el('goalPassengers').value = goals.passengers;
}

function saveGoals() {
  const L = TRANSLATIONS[currentLang];
  const getNum = (id) => parseFloat(document.getElementById(id).value) || 0;

  // Validate goal inputs
  const goalInputs = {
    'goalFlights': 'Flights Goal',
    'goalHours': 'Hours Goal',
    'goalProfit': 'Profit Goal',
    'goalPassengers': 'Passengers Goal'
  };

  for (const [id, name] of Object.entries(goalInputs)) {
    const val = document.getElementById(id).value;
    if (val) {
      const check = validatePrice(val, name);
      if (!check.valid) {
        showToast('❌ ' + check.error, 'error');
        return;
      }
    }
  }

  const goals = {
    flights:    getNum('goalFlights'),
    hours:      getNum('goalHours'),
    profit:     getNum('goalProfit'),
    passengers: getNum('goalPassengers'),
  };
  localStorage.setItem('airliner_goals', JSON.stringify(goals));

  // Save to DB
  fetch('/api/settings/goals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(goals)
  }).catch(() => {});

  renderGoals();
  showToast(L.goalsSaved, 'success');
}

async function renderGoals() {
  const L = TRANSLATIONS[currentLang];

  // Try to load from API/DB first
  let goals = {};
  try {
    const res = await fetch('/api/settings/goals');
    if (res.ok) goals = await res.json();
  } catch (e) { /* fallback */ }

  // If no data from API, use localStorage
  if (!goals.flights && !goals.hours && !goals.profit && !goals.passengers) {
    goals = JSON.parse(localStorage.getItem('airliner_goals') || '{}');
  }

  const hasAnyGoal = goals.flights || goals.hours || goals.profit || goals.passengers;
  const section = document.getElementById('goalsSection');
  if (!section) return;
  if (!hasAnyGoal) { section.style.display = 'none'; return; }
  section.style.display = 'block';

  const totalMins = flights.reduce((s, f) => s + (f.durationMins || 0), 0);
  const actual = {
    flights:    flights.length,
    hours:      totalMins / 60,
    profit:     flights.reduce((s, f) => s + (f.profit || 0), 0),
    passengers: flights.reduce((s, f) => s + (f.passengers || 0), 0),
  };

  const items = [
    { key: 'flights',    emoji: '✈️', name: L.goalFlightsName,    fmt: (v) => Math.round(v).toLocaleString() },
    { key: 'hours',      emoji: '⏱️', name: L.goalHoursName,      fmt: (v) => v.toFixed(1) },
    { key: 'profit',     emoji: '💰', name: L.goalProfitName,      fmt: (v) => `$${Math.round(v).toLocaleString()}` },
    { key: 'passengers', emoji: '👥', name: L.goalPassengersName,  fmt: (v) => Math.round(v).toLocaleString() },
  ];

  const html = items
    .filter(item => goals[item.key] > 0)
    .map(item => {
      const target = goals[item.key];
      const current = actual[item.key];
      const pct = Math.min(100, Math.round((current / target) * 100));
      const fillClass = pct >= 100 ? 'done' : pct >= 90 ? 'high' : pct >= 60 ? 'mid' : 'low';
      const achieved = pct >= 100;
      return `
        <div class="goal-item">
          <div class="goal-header">
            <div class="goal-label">${item.emoji} ${item.name}</div>
            <div class="goal-values">${item.fmt(current)} / ${item.fmt(target)}</div>
          </div>
          <div class="goal-bar-track">
            <div class="goal-bar-fill ${fillClass}" style="width:${pct}%"></div>
          </div>
          ${achieved
            ? `<div class="goal-achieved">${L.goalAchieved}</div>`
            : `<div class="goal-pct">${pct}%</div>`
          }
        </div>
      `;
    }).join('');

  document.getElementById('goalsGrid').innerHTML = html;
}

// ===== MISSIONS =====
async function renderMissions() {
  const L = TRANSLATIONS[currentLang];

  // Load completed missions from localStorage
  completedMissions = JSON.parse(localStorage.getItem('airliner_completed_missions') || '[]');

  // Fetch missions from API, fallback to hardcoded
  const activeMissionsGrid = document.getElementById('activeMissionsGrid');
  if (activeMissionsGrid) activeMissionsGrid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:20px;color:var(--text-secondary)">⏳ טוען משימות...</div>';

  try {
    const [missionsRes, completedRes] = await Promise.all([
      fetch('/api/missions'),
      fetch('/api/missions/completed')
    ]);
    if (missionsRes.ok) {
      const data = await missionsRes.json();
      if (data.missions && data.missions.length > 0) MISSIONS_FROM_API = data.missions;
    }
    if (completedRes.ok) {
      const data = await completedRes.json();
      if (Array.isArray(data.completed)) {
        completedMissions = data.completed;
        localStorage.setItem('airliner_completed_missions', JSON.stringify(completedMissions));
      }
    }
  } catch (e) { /* fallback to localStorage */ }

  const source = MISSIONS_FROM_API.length > 0 ? MISSIONS_FROM_API : MISSIONS;

  // Get active and completed missions
  const activeMissions = source.filter(m => !completedMissions.includes(m.id));
  const completed = source.filter(m => completedMissions.includes(m.id));

  // Render active missions
  if (activeMissionsGrid) {
    activeMissionsGrid.innerHTML = activeMissions.length === 0
      ? '<div style="grid-column: 1/-1; padding: 20px; text-align: center; color: var(--text-secondary);">✅ כל המשימות הושלמו!</div>'
      : activeMissions.map(mission => renderMissionCard(mission, false)).join('');
  }

  // Render completed missions
  const completedMissionsGrid = document.getElementById('completedMissionsGrid');
  if (completedMissionsGrid) {
    completedMissionsGrid.innerHTML = completed.length === 0
      ? '<div style="grid-column: 1/-1; padding: 20px; text-align: center; color: var(--text-secondary);">אין משימות שהושלמו עדיין</div>'
      : completed.map(mission => renderMissionCard(mission, true)).join('');
  }
}

function renderMissionCard(mission, isCompleted) {
  const categoryColors = {
    'sports': '#10b981',
    'culture': '#f59e0b',
    'diplomatic': '#3b82f6',
    'emergency': '#ef4444',
    'state': '#8b5cf6'
  };

  const bgColor = categoryColors[mission.category] || '#6b7280';

  return `
    <div class="mission-card" dir="rtl" style="border-right: 4px solid ${bgColor}; text-align: right;">
      <div class="mission-header">
        <div class="mission-title">${mission.emoji} ${mission.title}</div>
        ${isCompleted ? '<div style="color: #10b981; font-weight: bold;">✅ הושלמה</div>' : ''}
      </div>
      <p class="mission-description">${mission.description}</p>
      <div class="mission-route">📍 ${mission.origin} ← ${mission.destination}</div>
      ${mission.date ? `<div style="font-size:0.85rem;color:var(--accent);font-weight:600;margin:4px 0;">📅 ${new Date(mission.date + 'T12:00:00').toLocaleDateString('he-IL', {weekday:'long', year:'numeric', month:'long', day:'numeric'})}${mission.time ? ' · ⏰ ' + mission.time : ''}</div>` : ''}
      <div class="mission-event" style="font-size: 0.85rem; color: var(--text-secondary);">🌍 ${mission.event}</div>
      <div class="mission-rewards">
        <div class="reward-item">💰 ${mission.reward_cash.toLocaleString()} בונוס</div>
        <div class="reward-badge">⭐ ${mission.reward_badge}</div>
      </div>
      ${!isCompleted ? `<button class="btn btn-primary" onclick="scheduleMissionFlight('${mission.id}', '${mission.origin}', '${mission.destination}')" style="width: 100%; margin-top: 12px;">✈️ טוס ל-${mission.destination}</button>` : ''}
    </div>
  `;
}

function scheduleMissionFlight(missionId, origin, destination) {
  const source = MISSIONS_FROM_API.length > 0 ? MISSIONS_FROM_API : MISSIONS;
  const mission = source.find(m => m.id === missionId);
  if (!mission) return;

  showToast(`📍 תזמן טיסה מ-${origin} ל-${destination} כדי להשלים את המשימה!`, 'info');
  // In a real app, this would switch tabs or pre-fill the flight form
}

function completeMission(missionId) {
  if (!completedMissions.includes(missionId)) {
    completedMissions.push(missionId);
    localStorage.setItem('airliner_completed_missions', JSON.stringify(completedMissions));

    // שמור ב-DB
    fetch('/api/missions/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ missionId })
    }).catch(() => {});

    const source = MISSIONS_FROM_API.length > 0 ? MISSIONS_FROM_API : MISSIONS;
    const mission = source.find(m => m.id === missionId);
    if (mission) {
      // Award cash bonus
      const currentBalance = parseFloat(localStorage.getItem('airliner_balance') || '0');
      const newBalance = currentBalance + mission.reward_cash;
      localStorage.setItem('airliner_balance', newBalance.toString());

      // Show toast
      showToast(`🎉 משימה הושלמה! +${mission.reward_cash.toLocaleString()} 💰 עיטור: ${mission.reward_badge}`, 'success');

      // Re-render missions and update UI
      renderMissions();
      updateUI();
    }
  }
}

function checkMissionCompletion(flightData) {
  // Check if a completed flight matches any active mission
  const origin = flightData.origin;
  const destination = flightData.destination;

  const source = MISSIONS_FROM_API.length > 0 ? MISSIONS_FROM_API : MISSIONS;
  const matchingMission = source.find(m =>
    !completedMissions.includes(m.id) &&
    m.origin === origin &&
    m.destination === destination
  );

  if (matchingMission) {
    completeMission(matchingMission.id);
  }
}

// ===== TOAST =====
function showToast(msg, type = 'default') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast ${type} show`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 3000);
}

// ===== REFRESH DATA (Manual Refresh Button) =====
async function refreshData() {
  const btn = document.getElementById('refreshBtn');
  if (btn) btn.disabled = true;

  try {
    // Reload flights
    await API.getFlights();

    // Reload pricing (default to 30 days)
    await loadPricingHistory(30);

    // Reload settings
    await API.getSettings();

    showToast('✅ נתונים עודכנו בהצלחה!', 'success');
    console.log('[Refresh] Data updated successfully');
  } catch (err) {
    showToast('❌ שגיאה בעדכון נתונים', 'error');
    console.error('[Refresh] Error:', err);
  } finally {
    if (btn) btn.disabled = false;
  }
}

// ===== START =====
console.log('[Main] Starting init()...');
init()
  .then(() => {
    console.log('[Main] init() completed successfully');
    console.log('[Main] Total flights:', flights.length);
  })
  .catch(err => {
    console.error('[Main] init() failed:', err);
  });
