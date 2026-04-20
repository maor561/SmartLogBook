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

// Install Prompt - Disabled
// (PWA install banner removed)

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

// Aircraft capacity database (passengers, cargo_kg)
const AIRCRAFT_CAPACITY = {
  // Boeing 737 variants
  'B738': { pax: 189, cargo: 5280 },
  'B739': { pax: 189, cargo: 5280 },
  'B73H': { pax: 189, cargo: 5280 },
  'B73J': { pax: 210, cargo: 5500 },
  'B73G': { pax: 149, cargo: 5280 },
  'B732': { pax: 130, cargo: 5050 },
  'B733': { pax: 149, cargo: 5050 },
  'B734': { pax: 189, cargo: 5050 },
  'B735': { pax: 189, cargo: 5050 },
  'B736': { pax: 189, cargo: 5280 },

  // Airbus A320 family
  'A320': { pax: 180, cargo: 6730 },
  'A321': { pax: 236, cargo: 9100 },
  'A319': { pax: 150, cargo: 6700 },
  'A318': { pax: 107, cargo: 5600 },

  // Airbus A330 family
  'A330': { pax: 293, cargo: 8600 },
  'A332': { pax: 293, cargo: 8600 },
  'A333': { pax: 345, cargo: 9200 },

  // Boeing 777 family
  'B772': { pax: 305, cargo: 12500 },
  'B773': { pax: 330, cargo: 12500 },
  'B77W': { pax: 350, cargo: 12400 },
  'B77L': { pax: 396, cargo: 12400 },
  'B789': { pax: 242, cargo: 8668 },
  'B78X': { pax: 330, cargo: 9668 },

  // Airbus A380
  'A388': { pax: 525, cargo: 1600 },

  // Regional jets
  'E170': { pax: 78, cargo: 3300 },
  'E175': { pax: 88, cargo: 3300 },
  'E190': { pax: 114, cargo: 3700 },
  'E195': { pax: 146, cargo: 3700 },
  'CRJ2': { pax: 50, cargo: 2800 },
  'CRJ7': { pax: 70, cargo: 2800 },
  'CRJ9': { pax: 90, cargo: 2800 },
  'AT76': { pax: 72, cargo: 3600 },
  'DH8D': { pax: 90, cargo: 2800 },
};

function getAircraftCapacity(aircraftCode) {
  if (!aircraftCode) return { pax: 180, cargo: 5000 }; // default
  const code = aircraftCode.toUpperCase();

  // Try exact match
  if (AIRCRAFT_CAPACITY[code]) return AIRCRAFT_CAPACITY[code];

  // Try substring match (e.g., 'B738' matches 'B737-8')
  for (const [key, value] of Object.entries(AIRCRAFT_CAPACITY)) {
    if (code.includes(key) || key.includes(code)) return value;
  }

  // Default based on size
  if (LARGE_AIRCRAFT.some(a => code.includes(a))) {
    return { pax: 350, cargo: 12000 };
  }
  if (SMALL_AIRCRAFT.some(a => code.includes(a))) {
    return { pax: 100, cargo: 3500 };
  }

  return { pax: 180, cargo: 5000 }; // generic medium aircraft
}

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
let selectedPricingDays = 30;  // Track selected pricing period

// ===== MISSIONS DATA =====
const MISSIONS = []; // Missions loaded only from /api/missions (automation)

let completedMissions = [];
let MISSIONS_FROM_API = []; // loaded from /api/missions

// ===== ACHIEVEMENTS =====
let unlockedAchievements = [];

const ACHIEVEMENTS_LIST = [
  { id: 'flight_100', name: 'מאה טיסות', emoji: '✈️', condition: 'flights >= 100' },
  { id: 'hours_500', name: '500 שעות טיסה', emoji: '⏱️', condition: 'totalHours >= 500' },
  { id: 'profit_100k', name: '$100K רווח', emoji: '💰', condition: 'totalProfit >= 100000' },
  { id: 'allContinents', name: 'כל היבשות', emoji: '🌍', condition: 'visitedContinents >= 6' },
  { id: 'perfectLanding', name: '10 נחיתות מושלמות', emoji: '🎯', condition: 'perfectLandings >= 10' }
];

// ===== RANK HISTORY =====
let rankHistory = [];

function recordRankPromotion(newRank) {
  const entry = {
    rank: newRank,
    date: new Date().toISOString(),
    totalFlights: flights.length
  };

  rankHistory.push(entry);
  localStorage.setItem('rankHistory', JSON.stringify(rankHistory));

  // Show notification
  showSmartNotification(
    'rank',
    '🎖️ קידום דרגה!',
    `עליתם לדרגת: ${newRank}`,
    5000
  );
}

function loadRankHistory() {
  const saved = localStorage.getItem('rankHistory');
  if (saved) {
    try {
      rankHistory = JSON.parse(saved);
    } catch (e) {
      rankHistory = [];
    }
  }
}

function showRankHistory() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.display = 'flex';

  const timelineHtml = rankHistory.length === 0
    ? '<div style="text-align: center; color: var(--text-secondary); padding: 20px;">טרם קיימות קידומי דרגה</div>'
    : rankHistory.map((entry, idx) => {
      const date = new Date(entry.date);
      const dateStr = date.toLocaleDateString('he-IL');
      return `
        <div style="
          display: flex;
          align-items: center;
          margin-bottom: 16px;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--border);
        ">
          <div style="
            font-size: 28px;
            margin-right: 16px;
            background: rgba(139, 92, 246, 0.2);
            padding: 12px;
            border-radius: 8px;
          ">
            🎖️
          </div>
          <div style="flex: 1;">
            <div style="font-weight: 700; color: var(--text-primary);">${entry.rank}</div>
            <div style="font-size: 12px; color: var(--text-secondary);">
              ${dateStr} • ${entry.totalFlights} טיסות
            </div>
          </div>
          ${idx === rankHistory.length - 1 ? '<div style="color: var(--green); font-weight: 700;">✨ נוכחי</div>' : ''}
        </div>
      `;
    }).join('');

  modal.innerHTML = `
    <div class="modal">
      <div class="modal-title">🎖️ היסטוריית דרגות</div>
      <div style="max-height: 60vh; overflow-y: auto; padding: 16px;">
        ${timelineHtml}
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">סגור</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };
}

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
      'VIDP': [28.5562, 77.0992],  // Delhi (Indira Gandhi), India
      'ESSA': [59.6519, 17.9481],  // Stockholm, Sweden
      'EDDB': [52.3667, 13.5033],  // Berlin, Germany
      'EBBR': [50.9010, 4.4846],   // Brussels, Belgium
      'HECA': [30.1219, 31.4056],  // Cairo, Egypt
      'LTAC': [39.9469, 32.8956],  // Ankara, Turkey
      'HSSS': [15.5889, 32.5289],  // Khartoum, Sudan
      'LCRA': [34.6025, 33.3822],  // Larnaca, Cyprus
      'GMMC': [31.6086, -8.0172],  // Marrakech, Morocco
      'KDCA': [38.8521, -77.0377], // Washington DC, USA
      'KSJC': [37.3639, -121.9289] // San Jose, USA
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

      // Get coordinates from database (saved from SimBrief) - use airportCoords only as fallback
      const originLat = parseFloat(f.originLat) || parseFloat(airportCoords[f.origin]?.[0]) || null;
      const originLon = parseFloat(f.originLon) || parseFloat(airportCoords[f.origin]?.[1]) || null;
      const destLat = parseFloat(f.destLat) || parseFloat(airportCoords[f.destination]?.[0]) || null;
      const destLon = parseFloat(f.destLon) || parseFloat(airportCoords[f.destination]?.[1]) || null;

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
        originLat: originLat,
        originLon: originLon,
        destLat: destLat,
        destLon: destLon
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
    loadAchievements();
    loadRankHistory();

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
  if (tab === 'pricing') loadPricingHistory(selectedPricingDays);
  if (tab === 'settings') loadGoalsForm();
  if (tab === 'rating') renderAirlineRating();
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
      aircraft_max_passengers: data.aircraft?.maxPassengers || 189,
      aircraft_max_cargo: data.aircraft?.maxCargo || 5000,
      distance: parseInt(general.route_distance || general.gc_distance || 0),
      duration: `${hours}:${String(mins).padStart(2,'0')}`,
      durationMins: durationMins,
      passengers: parseInt(data.weights?.pax_count_actual || general.passengers || 0),
      fuel: fuelKg,
      payload: Math.round(payloadKg),
      costIndex: data.costindex || data.params?.costindex || data.general?.costindex || 0,
      windSpeed: data.weather?.wind_spd || 0,
      visibility: data.weather?.visibility || 10,
      ceiling: data.weather?.ceiling || 5000,
      weatherConditions: data.weather?.conditions || 'CAVOK',
      originFlag: getFlag(origin.country_code),
      destFlag: getFlag(destination.country_code),
    };

    // Validate extracted flight data
    const flightErrors = validateFlightData(currentFlightData);
    if (flightErrors.length > 0) {
      showToast('⚠️ ' + flightErrors[0], 'warning');
    }

    // Auto-capture real-time pricing for this flight (EIA real fuel + distance-based cargo + calculated maintenance)
    try {
      // Pass flight details to API for dynamic pricing calculations
      const pricingRes = await fetch('/api/pricing/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          distance:      currentFlightData.distance || 1000,
          aircraft:      currentFlightData.aircraft || 'B738',
          durationHours: (currentFlightData.durationMins || 60) / 60,
          payloadKg:     currentFlightData.payload || 0,
          passengers:    currentFlightData.passengers || 1
        })
      });
      const pricingData = await pricingRes.json();
      if (pricingData.success && pricingData.update) {
        const pu   = pricingData.update;
        const dist = currentFlightData.distance || 0;

        // Ticket price: distance-based formula
        const ticketPrice = pu.ticketPrice != null
          ? pu.ticketPrice   // Distance-based formula (per-pax)
          : dist <= 500  ? pu.ticketBase
          : dist <= 2000 ? pu.ticketMedium
          :                pu.ticketLong;

        // Save ACTUAL prices captured at this moment with the flight
        currentFlightData.actualFuelCost        = pu.fuelCost;
        currentFlightData.actualCargoRate       = pu.cargoRate;
        currentFlightData.actualTicketPrice     = ticketPrice;
        currentFlightData.actualLandingFee      = getLandingFeeFromUpdateCamelCase(currentFlightData.aircraft || 'B738', pu);
        currentFlightData.actualMaintenanceCost = pu.maintenanceCost;
        currentFlightData.pricingTimestamp      = new Date().toISOString();
        currentFlightData.pricingSource         = pu.source || 'EIA';

        console.log(`[Pricing] ✅ Auto-captured: fuel $${pu.fuelCost}/kg | cargo $${pu.cargoRate}/kg | maintenance $${pu.maintenanceCost} | ticket $${ticketPrice}/pax | source: ${pu.source}`);
      }
    } catch (e) {
      console.warn('[Pricing] Auto-capture failed, using defaults:', e);
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

  // Route header
  document.getElementById('cfOriginFlag').textContent = d.originFlag || '';
  document.getElementById('cfOrigin').textContent = d.origin;
  document.getElementById('cfDest').textContent = d.destination;
  document.getElementById('cfDestFlag').textContent = d.destFlag || '';
  document.getElementById('cfNames').textContent = d.originName && d.destName
    ? `${d.originName} → ${d.destName}` : '';
  document.getElementById('cfAircraftTag').textContent = d.aircraft;

  // SECTION 1: Dynamic pricing — use ACTUAL captured prices if available, else defaults
  const fuelRate      = d.actualFuelCost        || pricing.fuelCost        || 0.85;
  const cargoRate     = d.actualCargoRate       || pricing.cargoRate       || 2.0;
  const ticketPrice   = d.actualTicketPrice     || getTicketPrice(d.distance || 0);
  const landingFee    = d.actualLandingFee       || getLandingFee(d.aircraft || 'B738');
  const maintRate     = pricing.maintenanceCost || 180;  // Default hourly rate
  const durationHours = (d.durationMins || 0) / 60;

  const calcFuelCost  = Math.round((d.fuel       || 0) * fuelRate);
  const calcTicketRev = Math.round((d.passengers || 0) * ticketPrice);
  // Actual cargo = payload minus passenger weight (SimBrief payload includes passengers)
  const actualCargoKg = Math.max(0, (d.payload || 0) - (d.passengers || 0) * 95);
  const calcCargoRev  = Math.round(actualCargoKg * cargoRate);
  // Use actualMaintenanceCost if captured (includes aircraft type + payload), else calculate from hourly rate
  const calcMaintCost = d.actualMaintenanceCost || Math.round(durationHours * maintRate);

  const fmtAmt  = n => `$${Math.abs(n).toLocaleString()}`;
  const isReal  = !!d.actualFuelCost;
  const srcBadge = isReal
    ? `<span style="color:#10b981;font-size:0.75rem;font-weight:600">✅ ${d.pricingSource || 'EIA'} - בזמן אמת</span>`
    : `<span style="color:#f59e0b;font-size:0.75rem">⏳ טוען מחירים...</span>`;

  // Update badge in section header
  const liveBadgeEl = document.querySelector('.cf-price-live-badge');
  if (liveBadgeEl) liveBadgeEl.innerHTML = srcBadge;

  document.getElementById('cfPricingGrid').innerHTML = [
    { icon: '⛽', label: 'עלות דלק',       value: fmtAmt(calcFuelCost),  sub: `${fuelRate.toFixed(2)}$/kg × ${(d.fuel||0).toLocaleString()}kg`,    color: '#ef4444' },
    { icon: '🪑', label: 'הכנסת כרטיסים',  value: fmtAmt(calcTicketRev), sub: `${ticketPrice}$/pax × ${d.passengers||0} נוסעים`, color: '#10b981' },
    { icon: '📦', label: 'הכנסת מטען',     value: fmtAmt(calcCargoRev),  sub: `${cargoRate.toFixed(2)}$/kg × ${actualCargoKg.toLocaleString()}kg מטען`, color: '#10b981' },
    { icon: '🔧', label: 'עלות תחזוקה',    value: fmtAmt(calcMaintCost), sub: d.actualMaintenanceCost ? `${(d.aircraft||'B738')} | ${durationHours.toFixed(1)}h | ${((d.payload||0)/1000).toFixed(1)}T` : `${maintRate}$/h × ${durationHours.toFixed(1)}h`, color: '#ef4444' },
  ].map(p => `
    <div class="cf-price-tile">
      <div class="cf-price-tile-icon">${p.icon}</div>
      <div class="cf-price-tile-value" style="color:${p.color}">${p.value}</div>
      <div class="cf-price-tile-label">${p.label}</div>
      <div class="cf-price-tile-sub">${p.sub}</div>
    </div>
  `).join('');

  // SECTION 2: Flight data — 5 stat cards
  document.getElementById('cfStatsRow').innerHTML = [
    { icon: '📍', label: L.distance  || 'מרחק',      value: (d.distance||0).toLocaleString(),  unit: 'NM'  },
    { icon: '⏱️', label: L.duration  || 'זמן טיסה',  value: d.duration,                        unit: ''    },
    { icon: '⛽', label: L.fuelLabel || 'דלק',        value: (d.fuel||0).toLocaleString(),       unit: 'kg'  },
    { icon: '👥', label: 'נוסעים',                    value: (d.passengers||0).toLocaleString(), unit: ''    },
    { icon: '📦', label: 'מטען',                      value: (d.payload||0).toLocaleString(),    unit: 'kg'  },
  ].map(s => `
    <div class="cf-stat-card">
      <div class="cf-stat-icon">${s.icon}</div>
      <div class="cf-stat-val">${s.value}<span class="cf-stat-unit">${s.unit ? ' '+s.unit : ''}</span></div>
      <div class="cf-stat-lbl">${s.label}</div>
    </div>
  `).join('');

  // SECTION 3: Rating data — utilization bars
  const maxPax   = d.aircraft_max_passengers || 189;
  const maxCargo = 20468; // Fixed cargo capacity
  const paxPct   = Math.min(100, Math.round((d.passengers || 0) / maxPax   * 100));
  const cargoPct = Math.min(100, Math.round((d.payload    || 0) / maxCargo * 100));
  const paxColor   = paxPct   >= 80 ? '#10b981' : paxPct   >= 50 ? '#f59e0b' : '#ef4444';
  const cargoColor = cargoPct >= 60 ? '#10b981' : cargoPct >= 30 ? '#f59e0b' : '#ef4444';

  document.getElementById('cfUtilGrid').innerHTML = `
    <div class="cf-util-card">
      <div class="cf-util-header">
        <span>👥 ניצולת נוסעים</span>
        <span class="cf-util-pct" style="color:${paxColor}">${paxPct}%</span>
      </div>
      <div class="cf-util-bar-bg"><div class="cf-util-bar-fill" style="width:${paxPct}%;background:${paxColor}"></div></div>
      <div class="cf-util-nums">${d.passengers||0} / ${maxPax} נוסעים</div>
    </div>
    <div class="cf-util-card">
      <div class="cf-util-header">
        <span>📦 ניצולת מטען</span>
        <span class="cf-util-pct" style="color:${cargoColor}">${cargoPct}%</span>
      </div>
      <div class="cf-util-bar-bg"><div class="cf-util-bar-fill" style="width:${cargoPct}%;background:${cargoColor}"></div></div>
      <div class="cf-util-nums">${(d.payload||0).toLocaleString()} / ${maxCargo.toLocaleString()} kg</div>
    </div>
  `;

  // SECTION 3: Rating data — conditions
  const wSpd = d.windSpeed || 0;
  const vis  = d.visibility || 10;
  const ceil = d.ceiling || 5000;
  const ci   = d.costIndex || 0;
  const windDot = wSpd > 25 ? '🔴' : wSpd > 15 ? '🟡' : '🟢';
  const visDot  = vis  <  3 ? '🔴' : vis  <  6 ? '🟡' : '🟢';
  const ceilDot = ceil < 1000 ? '🔴' : ceil < 2000 ? '🟡' : '🟢';
  const ciDot   = ci  > 100  ? '🔴' : ci   >  50   ? '🟡' : '🟢';

  document.getElementById('cfConditions').innerHTML = `
    <div class="cf-cond-title">תנאי מזג אוויר</div>
    <div class="cf-cond-row">
      <div class="cf-cond-badge">${windDot} 💨 רוח ${wSpd}kt</div>
      <div class="cf-cond-badge">${visDot} 👁️ ראות ${vis}km</div>
      <div class="cf-cond-badge">${ceilDot} ☁️ ${ceil.toLocaleString()}ft</div>
      <div class="cf-cond-badge">${ciDot} 📊 CI ${ci}</div>
      <div class="cf-cond-badge">🌍 ${d.weatherConditions || 'CAVOK'}</div>
    </div>
  `;

  // SECTION 4: Financial
  const fin = calcFinancials(d, 0);
  document.getElementById('finAnalysisContent').innerHTML = buildFinancialHTML(d, fin, false);

  const panel = document.getElementById('currentFlightPanel');
  panel.style.display = 'block';
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ===== FINANCIAL CALCULATIONS =====
function calcFinancials(d, fpm) {
  const ticketPrice = d.actualTicketPrice || getTicketPrice(d.distance || 0);
  const landingFee = d.actualLandingFee || getLandingFee(d.aircraft || '');
  const cargoRate = d.actualCargoRate || pricing.cargoRate;
  const fuelCost = d.actualFuelCost || pricing.fuelCost;

  const ticketRevenue = d.passengers * ticketPrice;
  // Cargo: subtract passenger weight from total payload to get actual cargo only
  const actualCargoKg = Math.max(0, (d.payload || 0) - (d.passengers || 0) * 95);
  const cargoRevenue = actualCargoKg * cargoRate;
  const totalIncome = ticketRevenue + cargoRevenue;

  const fuelExpense = d.fuel * fuelCost;
  const landingExpense = landingFee;
  // Use actualMaintenanceCost if captured (includes crew costs), else calculate from hourly rate
  const maintenanceExpense = d.actualMaintenanceCost || ((d.durationMins / 60) * pricing.maintenanceCost);
  // crewExpense is only added if using fallback hourly calculation (not included in actualMaintenanceCost)
  const crewExpense = d.actualMaintenanceCost ? 0 : pricing.crewCost;
  const penalty = Math.abs(fpm) > 400 ? pricing.landingPenalty : 0;
  const totalExpenses = fuelExpense + crewExpense + landingExpense + maintenanceExpense + penalty;
  const netProfit = Math.round(totalIncome - totalExpenses);

  return { ticketRevenue, cargoRevenue, totalIncome, fuelExpense, crewExpense, landingExpense, maintenanceExpense, penalty, totalExpenses, netProfit, ticketPrice, landingFee };
}

function buildFinancialHTML(d, fin, showPenalty) {
  const L = TRANSLATIONS[currentLang];
  const fmt = (n) => `$${Math.round(Math.abs(n)).toLocaleString()}`;
  const isPos = fin.netProfit >= 0;

  return `
    <div class="cf-fin-grid">
      <div class="cf-fin-col">
        <div class="cf-fin-col-title cf-income-title">📈 ${L.revenues}</div>
        <div class="cf-fin-row">
          <span>🪑 ${d.passengers} × $${fin.ticketPrice}</span>
          <span class="value-positive">+${fmt(fin.ticketRevenue)}</span>
        </div>
        ${fin.cargoRevenue > 0 ? `<div class="cf-fin-row">
          <span>📦 ${(d.payload||0).toLocaleString()} kg</span>
          <span class="value-positive">+${fmt(fin.cargoRevenue)}</span>
        </div>` : ''}
        <div class="cf-fin-subtotal cf-income-sub">
          <span>${L.totalRevenues}</span>
          <span>+${fmt(fin.totalIncome)}</span>
        </div>
      </div>
      <div class="cf-fin-col">
        <div class="cf-fin-col-title cf-expense-title">📉 ${L.expenses}</div>
        <div class="cf-fin-row">
          <span>⛽ ${L.fuel}</span>
          <span class="value-negative">-${fmt(fin.fuelExpense)}</span>
        </div>
        ${fin.crewExpense > 0 ? `<div class="cf-fin-row">
          <span>👨‍✈️ ${L.crew}</span>
          <span class="value-negative">-${fmt(fin.crewExpense)}</span>
        </div>` : ''}
        <div class="cf-fin-row">
          <span>🛬 ${L.landing}</span>
          <span class="value-negative">-${fmt(fin.landingExpense)}</span>
        </div>
        <div class="cf-fin-row">
          <span>🔧 ${L.maintenance}</span>
          <span class="value-negative">-${fmt(fin.maintenanceExpense)}</span>
        </div>
        ${showPenalty && fin.penalty > 0 ? `<div class="cf-fin-row">
          <span>💥 ${L.penalty}</span>
          <span class="value-negative">-${fmt(fin.penalty)}</span>
        </div>` : ''}
        <div class="cf-fin-subtotal cf-expense-sub">
          <span>${L.totalExpenses}</span>
          <span>-${fmt(fin.totalExpenses)}</span>
        </div>
      </div>
    </div>

    <div class="cf-net-profit ${isPos ? 'cf-net-pos' : 'cf-net-neg'}">
      <span class="cf-net-label">${L.netProfit}</span>
      <span class="cf-net-value">${isPos ? '+' : '-'}${fmt(fin.netProfit)} ${isPos ? '✅' : '❌'}</span>
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

  // Mini route in modal
  const d = currentFlightData;
  const routeMini = document.getElementById('cfConfirmRouteMini');
  if (routeMini) {
    routeMini.innerHTML = `
      <span>${d.originFlag||''} <strong>${d.origin}</strong></span>
      <span class="cf-mini-arrow">✈️</span>
      <span><strong>${d.destination}</strong> ${d.destFlag||''}</span>
      <span class="cf-mini-aircraft">${d.aircraft}</span>
    `;
  }

  // Show initial profit preview
  updateFpmFeedback();

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
    const penaltyText = t('fpmHard').replace('$500', `$${pricing.landingPenalty}`);
    fb.textContent = penaltyText;
    fb.className = 'fpm-feedback fpm-hard';
  }

  // Update profit preview in confirm modal
  if (currentFlightData) {
    const fin = calcFinancials(currentFlightData, val);
    const profitEl = document.getElementById('cfConfirmProfit');
    if (profitEl) {
      const isPos = fin.netProfit >= 0;
      const sign = isPos ? '+' : '-';
      profitEl.innerHTML = `
        <div class="cf-profit-preview ${isPos ? 'cf-profit-pos' : 'cf-profit-neg'}">
          <span class="cf-profit-label">💵 רווח צפוי:</span>
          <span class="cf-profit-value">${sign}$${Math.abs(fin.netProfit).toLocaleString()}</span>
          ${abs > 400 ? `<div class="cf-profit-penalty">⚠️ כולל קנס נחיתה קשה: -$${pricing.landingPenalty.toLocaleString()}</div>` : ''}
        </div>
      `;
    }
  }
}

// ===== UPDATE CURRENT FLIGHT WITH REAL-TIME PRICING =====
async function updateCurrentFlightPricing() {
  if (!currentFlightData) return;

  const btn = document.querySelector('[onclick="updateCurrentFlightPricing()"]');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '⏳ מעדכן מחירים...';
  }

  try {
    // Fetch real-time pricing from API
    const res = await fetch('/api/pricing/update', { method: 'POST' });
    const data = await res.json();

    if (!data.success) {
      showToast('❌ שגיאה בעדכון מחירים', 'error');
      return;
    }

    const pricing_update = data.update;

    // Store actual prices in currentFlightData
    const distance = currentFlightData.distance || 0;
    currentFlightData.actualFuelCost = pricing_update.fuelCost;
    currentFlightData.actualTicketPrice = distance <= 500 ? pricing_update.ticketBase
                                         : distance <= 2000 ? pricing_update.ticketMedium
                                         : pricing_update.ticketLong;

    // Map camelCase landing fees back to getLandingFeeFromUpdate format
    const landingFeeMap = {
      landing_large: pricing_update.landingLarge,
      landing_medium: pricing_update.landingMedium,
      landing_small: pricing_update.landingSmall
    };
    currentFlightData.actualLandingFee = getLandingFeeFromUpdateCamelCase(currentFlightData.aircraft || 'B738', pricing_update);
    currentFlightData.actualMaintenanceCost = 180; // Will be updated if API provides it
    currentFlightData.pricingTimestamp = new Date().toISOString();

    // Refresh display with new prices
    displayCurrentFlightWithDynamicPricing();

    showToast('✅ מחירים עודכנו לזמן אמת!', 'success');
  } catch (err) {
    console.error('[Update Pricing Error]', err);
    showToast('❌ שגיאה בעדכון מחירים', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '🔄 עדכן מחירים לזמן אמת';
    }
  }
}

// Helper: get landing fee from pricing update (snake_case)
function getLandingFeeFromUpdate(aircraft, pricingUpdate) {
  const code = (aircraft || '').toUpperCase();
  if (LARGE_AIRCRAFT.some(a => code.includes(a))) return pricingUpdate.landing_large || 600;
  if (SMALL_AIRCRAFT.some(a => code.includes(a))) return pricingUpdate.landing_small || 150;
  return pricingUpdate.landing_medium || 350;
}

// Helper: get landing fee from pricing update (camelCase)
function getLandingFeeFromUpdateCamelCase(aircraft, pricingUpdate) {
  const code = (aircraft || '').toUpperCase();
  if (LARGE_AIRCRAFT.some(a => code.includes(a))) return pricingUpdate.landingLarge || 600;
  if (SMALL_AIRCRAFT.some(a => code.includes(a))) return pricingUpdate.landingSmall || 150;
  return pricingUpdate.landingMedium || 350;
}

// Display flight with DYNAMIC pricing (actual prices from API)
function displayCurrentFlightWithDynamicPricing() {
  if (!currentFlightData) return;
  const d = currentFlightData;
  const L = TRANSLATIONS[currentLang];

  // Use ACTUAL prices if available, otherwise use default pricing
  const fuelCostRate = d.actualFuelCost || (pricing.fuelCost || 0.85);
  const ticketPrice = d.actualTicketPrice || getTicketPrice(d.distance || 0);
  const durationHours = (d.durationMins || 0) / 60;
  const landingFee = d.actualLandingFee || getLandingFee(d.aircraft || 'B738');
  const maintRate = d.actualMaintenanceCost || (pricing.maintenanceCost || 180);

  // Calculate with ACTUAL prices
  const calcFuelCost = Math.round((d.fuel || 0) * fuelCostRate);
  const calcTicketRev = Math.round((d.passengers || 0) * ticketPrice);
  const calcCargoRev = Math.round((d.payload || 0) * (pricing.cargoRate || 2.0));
  const calcMaintCost = Math.round(durationHours * maintRate);

  const fmtAmt = n => `$${Math.abs(n).toLocaleString()}`;

  // Mark pricing as dynamic if actual prices are set
  const isDynamic = !!d.actualFuelCost;
  const dynamicBadge = isDynamic ? ' <span style="color:#10b981;font-size:0.8rem">✓ בזמן אמת</span>' : '';

  document.getElementById('cfPricingGrid').innerHTML = [
    { icon: '⛽', label: 'עלות דלק',    value: fmtAmt(calcFuelCost),  sub: `${fuelCostRate.toFixed(2)}$/kg × ${(d.fuel||0).toLocaleString()}kg`,  color: '#ef4444' },
    { icon: '🪑', label: 'הכנסת כרטיסים', value: fmtAmt(calcTicketRev), sub: `${ticketPrice}$/pax × ${d.passengers||0} נוסעים`,               color: '#10b981' },
    { icon: '📦', label: 'הכנסת מטען',  value: fmtAmt(calcCargoRev),  sub: `${pricing.cargoRate||2}$/kg × ${(d.payload||0).toLocaleString()}kg`,  color: '#10b981' },
    { icon: '🔧', label: 'עלות תחזוקה', value: fmtAmt(calcMaintCost), sub: `${maintRate.toFixed(0)}$/h × ${durationHours.toFixed(1)}h`,   color: '#ef4444' },
  ].map(p => `
    <div class="cf-price-tile">
      <div class="cf-price-tile-icon">${p.icon}</div>
      <div class="cf-price-tile-value" style="color:${p.color}">${p.value}</div>
      <div class="cf-price-tile-label">${p.label}${p === ('📊' ? dynamicBadge : '')}</div>
      <div class="cf-price-tile-sub">${p.sub}</div>
    </div>
  `).join('');

  // Update financial section with dynamic prices
  const fin = {
    ticketRevenue: calcTicketRev,
    cargoRevenue: calcCargoRev,
    totalIncome: calcTicketRev + calcCargoRev,
    fuelExpense: calcFuelCost,
    crewExpense: pricing.crewCost,
    landingExpense: landingFee,
    maintenanceExpense: calcMaintCost,
    penalty: 0,
    totalExpenses: calcFuelCost + pricing.crewCost + landingFee + calcMaintCost,
    netProfit: (calcTicketRev + calcCargoRev) - (calcFuelCost + pricing.crewCost + landingFee + calcMaintCost),
    ticketPrice,
    landingFee
  };

  document.getElementById('finAnalysisContent').innerHTML = buildFinancialHTML(d, fin, false);
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
    aircraft_max_passengers: d.aircraft_max_passengers || 189,
    aircraft_max_cargo: d.aircraft_max_cargo || 5000,
    distance: d.distance,
    duration: d.duration,
    durationMins: d.durationMins,
    passengers: d.passengers,
    fuel: d.fuel,
    payload: d.payload,
    fpm: fpm,
    profit: fin.netProfit,
    costIndex: d.costIndex || 0,
    windSpeed: d.windSpeed || 0,
    visibility: d.visibility || 10,
    ceiling: d.ceiling || 5000,
    weatherConditions: d.weatherConditions || 'CAVOK',

    // Dynamic pricing - captured at time of flight creation
    actualFuelCost: d.actualFuelCost || null,
    actualTicketPrice: d.actualTicketPrice || null,
    actualLandingFee: d.actualLandingFee || null,
    actualMaintenanceCost: d.actualMaintenanceCost || null,
    pricingTimestamp: d.pricingTimestamp || null,
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
  checkAchievements();

  // Refresh pricing charts if pricing tab is active
  if (document.querySelector('[data-tab="pricing"].active')) {
    loadPricingHistory(selectedPricingDays);
  }
}

// ===== STATS =====
function updateStats() {
  const total = flights.length;
  const pax   = flights.reduce((s, f) => s + (f.passengers  || 0), 0);
  const dist  = flights.reduce((s, f) => s + (f.distance    || 0), 0);
  const mins  = flights.reduce((s, f) => s + (f.durationMins|| 0), 0);
  const profit= flights.reduce((s, f) => s + (f.profit      || 0), 0);
  const fuel  = flights.reduce((s, f) => s + (f.fuel        || 0), 0);
  const h = Math.floor(mins / 60), m = mins % 60;

  console.log('[Stats] Total flights:', total, 'Pax:', pax, 'Dist:', dist, 'Fuel:', fuel, 'Profit:', profit);

  const avgPax  = total > 0 ? Math.round(pax  / total) : 0;
  const avgDist = total > 0 ? Math.round(dist / total) : 0;
  const avgFuel = total > 0 ? Math.round(fuel / total) : 0;

  console.log('[Stats] Avg Pax:', avgPax, 'Avg Dist:', avgDist, 'Avg Fuel:', avgFuel);

  const fmt = (n) => n >= 1e6 ? `${(n/1e6).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(1)}K` : n.toLocaleString();

  // === TREND: compare last 5 flights vs previous 5 ===
  function calcTrend(getter) {
    if (total < 6) return 'flat';
    const sorted = [...flights].sort((a, b) => new Date(b.date) - new Date(a.date));
    const recent = sorted.slice(0, 5).reduce((s, f) => s + (getter(f) || 0), 0) / 5;
    const older  = sorted.slice(5, 10).reduce((s, f) => s + (getter(f) || 0), 0) / Math.max(1, Math.min(5, sorted.length - 5));
    if (older === 0) return recent > 0 ? 'up' : 'flat';
    const pct = (recent - older) / Math.abs(older);
    return pct > 0.03 ? 'up' : pct < -0.03 ? 'down' : 'flat';
  }
  const trends = {
    Flights:    calcTrend(() => 1),
    Passengers: calcTrend(f => f.passengers),
    Distance:   calcTrend(f => f.distance),
    Hours:      calcTrend(f => f.durationMins),
    Profit:     calcTrend(f => f.profit),
    Fuel:       calcTrend(f => f.fuel),
  };
  const trendSym   = { up: ' ▲', down: ' ▼', flat: '' };
  const trendColor = { up: '#10b981', down: '#ef4444', flat: 'transparent' };

  // === UPDATE VALUES + inject trend span ===
  function setVal(id, text, trendKey) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = '';
    el.appendChild(document.createTextNode(text));
    if (trendKey) {
      const span = document.createElement('span');
      span.className = 'stat-trend';
      span.style.color = trendColor[trends[trendKey]];
      span.textContent = trendSym[trends[trendKey]];
      el.appendChild(span);
    }
  }

  setVal('statFlights',    total.toLocaleString(),  'Flights');
  setVal('statPassengers', fmt(pax),                'Passengers');
  setVal('statDistance',   fmt(dist),               'Distance');
  setVal('statHours',      `${h}:${String(m).padStart(2,'0')}`, 'Hours');
  setVal('statProfit',     profit >= 1e6 ? `$${(profit/1e6).toFixed(1)}M` : profit >= 1000 ? `$${Math.round(profit/1000)}K` : `$${profit.toLocaleString()}`, 'Profit');
  setVal('statFuel',       fmt(fuel),               'Fuel');

  // === AVERAGES ===
  if (document.getElementById('statPassengersAvgDisplay'))
    document.getElementById('statPassengersAvgDisplay').textContent = avgPax.toLocaleString();
  if (document.getElementById('statDistanceAvgDisplay'))
    document.getElementById('statDistanceAvgDisplay').textContent = avgDist.toLocaleString();
  if (document.getElementById('statFuelAvgDisplay'))
    document.getElementById('statFuelAvgDisplay').textContent = fmt(avgFuel);
  if (document.getElementById('statHoursAvgDisplay')) {
    const avgMins = total > 0 ? Math.round(mins / total) : 0;
    document.getElementById('statHoursAvgDisplay').textContent = `${Math.floor(avgMins/60)}:${String(avgMins%60).padStart(2,'0')}`;
  }
  if (document.getElementById('statProfitAvgDisplay')) {
    const avgP = total > 0 ? Math.round(profit / total) : 0;
    document.getElementById('statProfitAvgDisplay').textContent = avgP >= 1e6 ? `$${(avgP/1e6).toFixed(1)}M` : avgP >= 1000 ? `$${Math.round(avgP/1000)}K` : `$${avgP.toLocaleString()}`;
  }

  // === RATING BADGES (from cache populated by renderAirlineRating) ===
  const ratingMap = { Flights:'פעילות', Passengers:'יעילות', Distance:'מוניטין', Hours:'פעילות', Profit:'רווחיות', Fuel:'יעילות' };
  const scores = window._lastRatingScores || {};
  Object.entries(ratingMap).forEach(([card, cat]) => {
    const el = document.getElementById(`statBadge${card}`);
    if (!el) return;
    const score = scores[cat];
    el.textContent = score !== undefined ? `${score.toFixed(1)}★` : '–';
  });
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
  const sorted = [...flights].sort((a, b) => new Date(b.date) - new Date(a.date));
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
let lastRankIndex = -1;

function updateRank() {
  const mins = flights.reduce((s, f) => s + (f.durationMins || 0), 0);
  const totalH = mins / 60;
  const L = TRANSLATIONS[currentLang];

  let idx = 0;
  for (let i = RANK_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalH >= RANK_THRESHOLDS[i]) { idx = i; break; }
  }

  // Check if rank has changed (promotion)
  if (lastRankIndex !== -1 && idx > lastRankIndex) {
    recordRankPromotion(L.ranks[idx]);
  }
  lastRankIndex = idx;

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
        <button class="btn btn-info" onclick="openBoardingPassModal('${f.id}')">🎫 Pass</button>
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

  // Group airports with their stats
  const airports = {};

  flights.forEach(f => {
    // Skip if any coordinate is missing
    if (!f.originLat || !f.originLon || !f.destLat || !f.destLon) return;

    // Track origin
    if (!airports[f.origin]) {
      airports[f.origin] = { lat: f.originLat, lon: f.originLon, departures: 0, arrivals: 0, profit: 0 };
    }
    airports[f.origin].departures++;
    airports[f.origin].profit += (f.profit || 0);

    // Track destination
    if (!airports[f.destination]) {
      airports[f.destination] = { lat: f.destLat, lon: f.destLon, departures: 0, arrivals: 0, profit: 0 };
    }
    airports[f.destination].arrivals++;
    airports[f.destination].profit += (f.profit || 0);
  });

  // Draw routes
  flights.forEach(f => {
    if (!f.originLat || !f.originLon || !f.destLat || !f.destLon) return;
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

    bounds.push(from, to);
  });

  // Draw airport circles with counts
  Object.entries(airports).forEach(([code, airport]) => {
    const pos = [airport.lat, airport.lon];
    const color = airport.profit >= 0 ? '#10b981' : '#ef4444';
    const total = airport.departures + airport.arrivals;

    const mk = L.circleMarker(pos, {
      radius: 6,
      fillColor: color,
      color: '#ffffff',
      fillOpacity: 0.9,
      weight: 2,
      className: 'map-route-circle'
    });

    // Hover tooltip
    const tooltipText = `${code}\n↑${airport.departures} ↓${airport.arrivals}\n💰 $${Math.abs(airport.profit).toLocaleString()}`;
    mk.bindTooltip(tooltipText, {
      permanent: false,
      direction: 'top',
      className: 'map-airport-tooltip',
      offset: [0, -10]
    });

    // Click popup for more details
    const label = `${code}\n↑${airport.departures} ↓${airport.arrivals}`;
    mk.bindPopup(`<div style="font-weight:bold;font-size:12px;text-align:center;">${label}</div>`);
    mk.addTo(mapInstance);
    mapLayers.push(mk);
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
  const sorted = [...flights].sort((a, b) => new Date(b.date) - new Date(a.date));
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
  const dayMonth = date.toLocaleDateString('he-IL', {day: 'numeric', month: 'short'});
  const time = date.toLocaleTimeString('he-IL', {hour: '2-digit', minute: '2-digit'});

  if (days <= 7) {
    return `${dayMonth} ${time}`;
  } else if (days <= 30) {
    return `${dayMonth} ${time}`;
  } else {
    return `${dayMonth}`;
  }
}

async function loadPricingHistory(days = 30) {
  selectedPricingDays = days;

  // Highlight active period button
  document.querySelectorAll('.pricing-period-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.days) === days);
  });

  const container   = document.getElementById('pricingChartsContainer');
  const loadingState = document.getElementById('pricingLoadingState');
  const summaryRow   = document.getElementById('pricingSummaryRow');

  // --- Filter flights by period ---
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - (days >= 9999 ? 99999 : days));

  const periodFlights = (flights || [])
    .filter(f => new Date(f.date) >= cutoff)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  if (periodFlights.length === 0) {
    loadingState.style.display  = 'block';
    loadingState.innerHTML = `
      <p>⏳ אין טיסות ב${days >= 9999 ? 'מאגר' : `-${days} הימים האחרונים`}</p>
      <p style="font-size:0.9rem;">הוסף טיסות כדי לראות ניתוח פיננסי בזמן אמת</p>`;
    container.style.display  = 'none';
    summaryRow.style.display = 'none';
    return;
  }

  loadingState.style.display  = 'none';
  container.style.display     = 'grid';
  summaryRow.style.display    = 'grid';

  // --- Per-flight calculations (using ACTUAL prices when available) ---
  const defaultFuelRate   = pricing.fuelCost        || 0.85;
  const defaultCargoRate  = pricing.cargoRate        || 2.0;
  const defaultMaintRate  = pricing.maintenanceCost  || 180;

  // Use actualFuelCost from flight if available, otherwise use default
  const fuelCosts       = periodFlights.map(f => {
    const fuelRate = f.actualFuelCost || defaultFuelRate;
    return Math.round((f.fuel || 0) * fuelRate);
  });

  // Use actualTicketPrice from flight if available, otherwise use default based on distance
  const ticketRevenues  = periodFlights.map(f => {
    const ticketPrice = f.actualTicketPrice || getTicketPrice(f.distance || 0);
    return Math.round((f.passengers || 0) * ticketPrice);
  });

  // Cargo revenue: use actual cargo only (payload minus passenger weight)
  // payload from SimBrief = total payload (passengers + baggage + cargo)
  // Actual cargo = payload - (passengers × 95kg average per person)
  const cargoRevenues   = periodFlights.map(f => {
    const actualCargoKg = Math.max(0, (f.payload || 0) - (f.passengers || 0) * 95);
    const cargoRate = f.actualCargoRate || 4.5;  // Use dynamic rate, fallback to $4.5/kg
    return Math.round(actualCargoKg * cargoRate);
  });

  // Use actualMaintenanceCost from flight if available (it's already total, not hourly)
  // Otherwise fall back to hourly rate calculation
  const maintCosts      = periodFlights.map(f => {
    if (f.actualMaintenanceCost) {
      return Math.round(f.actualMaintenanceCost);  // Already total cost including crew
    } else {
      return Math.round(((f.durationMins || 0) / 60) * defaultMaintRate);  // Fallback hourly
    }
  });

  // Use actualLandingFee from flight if available, otherwise use default
  const landingFees     = periodFlights.map(f => f.actualLandingFee || getLandingFee(f.aircraft || 'B738'));

  const totalRevenues   = periodFlights.map((_, i) => ticketRevenues[i] + cargoRevenues[i]);
  const totalOpCosts    = periodFlights.map((_, i) => maintCosts[i] + landingFees[i]);
  const netProfits      = periodFlights.map((_, i) => totalRevenues[i] - fuelCosts[i] - totalOpCosts[i]);

  // --- KPI Summary ---
  const sumFuel    = fuelCosts.reduce((s, v) => s + v, 0);
  const sumRev     = totalRevenues.reduce((s, v) => s + v, 0);
  const sumOpCosts = totalOpCosts.reduce((s, v) => s + v, 0);
  const sumProfit  = netProfits.reduce((s, v) => s + v, 0);

  const fmt = v => v >= 1000000 ? `$${(v/1000000).toFixed(1)}M`
                 : v >= 1000    ? `$${(v/1000).toFixed(0)}K`
                 : `$${v}`;

  document.getElementById('pkpiTotalFuel').textContent    = fmt(sumFuel);
  document.getElementById('pkpiTotalRevenue').textContent = fmt(sumRev);
  document.getElementById('pkpiTotalCosts').textContent   = fmt(sumOpCosts);
  const profitEl = document.getElementById('pkpiNetProfit');
  profitEl.textContent = fmt(sumProfit);
  profitEl.style.color = sumProfit >= 0 ? '#10b981' : '#ef4444';

  // --- Chart labels ---
  const labels = periodFlights.map(f => {
    const d = new Date(f.date);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  });

  // --- Chart options helpers ---
  const isDark    = document.body.classList.contains('dark');
  const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';
  const textColor = isDark ? '#94a3b8' : '#64748b';

  const makeYTicks = () => ({
    font: { size: 12, weight: '500' }, color: textColor,
    callback: v => v >= 1000 ? `$${(v/1000).toFixed(0)}K` : `$${v}`,
    padding: 8
  });
  const makeXTicks = () => ({
    maxTicksLimit: 8, autoSkip: true, maxRotation: 0,
    font: { size: 12, weight: '500' }, color: textColor,
    padding: 6
  });
  const baseScales = () => ({
    x: { ticks: makeXTicks(), grid: { color: gridColor } },
    y: { ticks: makeYTicks(), grid: { color: gridColor } }
  });

  const baseInteraction = () => ({
    mode: 'index',
    intersect: false
  });
  const basePlugins = (legendDisplay = false) => ({
    legend: {
      display: legendDisplay,
      labels: { color: textColor, font: { size: 11 }, boxWidth: 12 }
    },
    tooltip: {
      enabled: true,
      backgroundColor: isDark ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.95)',
      titleColor: isDark ? '#f1f5f9' : '#0f172a',
      bodyColor: isDark ? '#cbd5e1' : '#334155',
      borderColor: isDark ? '#475569' : '#cbd5e1',
      borderWidth: 1,
      padding: 12,
      titleFont: { size: 13, weight: '600' },
      bodyFont: { size: 12 },
      displayColors: true,
      callbacks: {
        title: ctx => {
          try {
            const f = periodFlights && periodFlights[ctx[0].dataIndex];
            return f ? `${f.origin}→${f.destination} · ${labels[ctx[0].dataIndex]}` : labels[ctx[0].dataIndex];
          } catch(e) {
            return labels[ctx[0].dataIndex] || '';
          }
        },
        label: ctx => {
          try {
            return `${ctx.dataset.label}: $${Math.round(ctx.parsed.y).toLocaleString()}`;
          } catch(e) {
            return ctx.dataset.label || '';
          }
        },
        afterLabel: ctx => {
          try {
            const f = periodFlights && periodFlights[ctx[0].dataIndex];
            return f ? `✈️ ${f.aircraft || 'B738'} · ${f.distance || 0}nm` : '';
          } catch(e) {
            return '';
          }
        }
      }
    }
  });

  // Destroy existing charts
  Object.values(pricingCharts).forEach(c => c.destroy?.());
  pricingCharts = {};

  // === CHART 1: Fuel cost per flight ===
  document.getElementById('pcUnitFuel').textContent = `ממוצע: ${fmt(Math.round(sumFuel / periodFlights.length))}`;
  pricingCharts.fuel = new Chart(
    document.getElementById('fuelCostChart').getContext('2d'), {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'עלות דלק',
          data: fuelCosts,
          backgroundColor: 'rgba(249,115,22,0.75)',
          borderColor: '#f97316',
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: { responsive: true, maintainAspectRatio: true, interaction: baseInteraction(), plugins: basePlugins(), scales: baseScales() }
    }
  );

  // === CHART 2: Revenue per flight (tickets + cargo stacked) ===
  document.getElementById('pcUnitRevenue').textContent = `ממוצע: ${fmt(Math.round(sumRev / periodFlights.length))}`;
  pricingCharts.revenue = new Chart(
    document.getElementById('costIndexChart').getContext('2d'), {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'כרטיסים',
            data: ticketRevenues,
            backgroundColor: 'rgba(59,130,246,0.75)',
            borderColor: '#3b82f6',
            borderWidth: 1,
            borderRadius: 0
          },
          {
            label: 'מטען',
            data: cargoRevenues,
            backgroundColor: 'rgba(16,185,129,0.75)',
            borderColor: '#10b981',
            borderWidth: 1,
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        interaction: baseInteraction(),
        plugins: basePlugins(true),
        scales: { ...baseScales(), x: { ...baseScales().x, stacked: true }, y: { ...baseScales().y, stacked: true } }
      }
    }
  );

  // === CHART 3: Net profit per flight (green/red bars) ===
  const profitColors = netProfits.map(v => v >= 0 ? 'rgba(16,185,129,0.8)' : 'rgba(239,68,68,0.8)');
  const profitBorders = netProfits.map(v => v >= 0 ? '#10b981' : '#ef4444');
  document.getElementById('pcUnitProfit').textContent = `סה"כ: ${fmt(sumProfit)}`;
  pricingCharts.profit = new Chart(
    document.getElementById('ticketPricesChart').getContext('2d'), {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'רווח נקי',
          data: netProfits,
          backgroundColor: profitColors,
          borderColor: profitBorders,
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: { responsive: true, maintainAspectRatio: true, interaction: baseInteraction(), plugins: basePlugins(), scales: baseScales() }
    }
  );

  // === CHART 4: Operating costs (maintenance + landing stacked) ===
  document.getElementById('pcUnitCosts').textContent = `ממוצע: ${fmt(Math.round(sumOpCosts / periodFlights.length))}`;
  pricingCharts.costs = new Chart(
    document.getElementById('landingFeesChart').getContext('2d'), {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'תחזוקה',
            data: maintCosts,
            backgroundColor: 'rgba(139,92,246,0.75)',
            borderColor: '#8b5cf6',
            borderWidth: 1,
            borderRadius: 0
          },
          {
            label: 'עמלת נחיתה',
            data: landingFees,
            backgroundColor: 'rgba(245,158,11,0.75)',
            borderColor: '#f59e0b',
            borderWidth: 1,
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        interaction: baseInteraction(),
        plugins: basePlugins(true),
        scales: { ...baseScales(), x: { ...baseScales().x, stacked: true }, y: { ...baseScales().y, stacked: true } }
      }
    }
  );
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

  // ── Previous month for comparison ──
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear  = month === 1 ? year - 1 : year;
  const prevFlights = flights.filter(f => {
    const d = new Date(f.date);
    return d.getFullYear() === prevYear && d.getMonth() + 1 === prevMonth;
  });

  // ── Totals ──
  const totalFlights = monthFlights.length;
  const totalProfit  = monthFlights.reduce((s,f) => s+(f.profit||0), 0);
  const totalMins    = monthFlights.reduce((s,f) => s+(f.durationMins||0), 0);
  const totalFuel    = monthFlights.reduce((s,f) => s+(f.fuel||0), 0);
  const totalPax     = monthFlights.reduce((s,f) => s+(f.passengers||0), 0);
  const totalDist    = monthFlights.reduce((s,f) => s+(f.distance||0), 0);
  const totalPayload = monthFlights.reduce((s,f) => s+(f.payload||0), 0);
  const hours = Math.floor(totalMins/60), mins = totalMins%60;

  // ── Prev month totals ──
  const prevProfit = prevFlights.reduce((s,f) => s+(f.profit||0), 0);
  const prevFlightCount = prevFlights.length;
  const prevPax    = prevFlights.reduce((s,f) => s+(f.passengers||0), 0);

  // ── Delta helpers ──
  const delta = (cur, prev) => {
    if (prev === 0) return cur > 0 ? '+100%' : '—';
    const pct = Math.round(((cur - prev) / Math.abs(prev)) * 100);
    return (pct >= 0 ? '+' : '') + pct + '%';
  };
  const deltaColor = (cur, prev) => cur >= prev ? '#16a34a' : '#dc2626';

  // ── Cost breakdown (dynamic pricing model) ──
  // Use actual captured costs from flights when available, else calculate
  const totalActualFuel = flights.reduce((s, f) => s + (f.actualFuelCost ? f.fuel * f.actualFuelCost : f.fuel * (pricing.fuelCost || 0.85)), 0);
  const totalActualMaintenance = flights.reduce((s, f) => s + (f.actualMaintenanceCost || Math.round((f.durationMins / 60) * (pricing.maintenanceCost || 180))), 0);
  const totalActualCargo = flights.reduce((s, f) => s + (f.payload * (f.actualCargoRate || pricing.cargoRate || 2.0)), 0);

  // For backward compatibility, also calculate with old method
  const fuelCostPerKg = 0.85;
  const crewCostPerHour = 450;
  const landingFeeBase = 800;

  const costFuel        = Math.round(totalActualFuel > 0 ? totalActualFuel : (totalFuel * fuelCostPerKg));
  const costCrew        = 0;  // Already included in actualMaintenanceCost
  const costLanding     = Math.round(totalFlights * landingFeeBase);
  const costMaintenance = Math.round(totalActualMaintenance > 0 ? totalActualMaintenance : Math.round((totalMins / 60) * (pricing.maintenanceCost || 180)));
  const totalCosts      = costFuel + costCrew + costLanding + costMaintenance;
  const totalRevenue    = totalProfit + totalCosts;
  const profitMargin    = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0;
  const roi             = totalCosts > 0 ? ((totalProfit / totalCosts) * 100).toFixed(1) : '0';

  const costBar = (val) => {
    const pct = totalCosts > 0 ? Math.round((val / totalCosts) * 100) : 0;
    return `<div style="background:#e2e8f0;border-radius:4px;height:10px;margin-top:4px;overflow:hidden;">
      <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#3b82f6,#6366f1);border-radius:4px;"></div></div>
      <div style="font-size:10px;color:#64748b;margin-top:2px;">${pct}% מסך עלויות</div>`;
  };

  // ── Landing quality ──
  const fpms = monthFlights.filter(f => f.fpm && f.fpm !== 0);
  const soft   = fpms.filter(f => Math.abs(f.fpm) <= 250).length;
  const normal = fpms.filter(f => Math.abs(f.fpm) > 250 && Math.abs(f.fpm) <= 400).length;
  const hard   = fpms.filter(f => Math.abs(f.fpm) > 400).length;
  const avgFpm = fpms.length > 0 ? Math.round(fpms.reduce((s,f) => s+Math.abs(f.fpm),0)/fpms.length) : 0;
  const safetyScore = fpms.length > 0 ? Math.round(((soft + normal*0.6) / fpms.length)*100) : 0;

  const fpmBar = (count, total, color) => {
    const pct = total > 0 ? Math.round((count/total)*100) : 0;
    return `<div style="display:flex;align-items:center;gap:8px;margin:4px 0;">
      <div style="width:80px;font-size:12px;color:#475569;">${count} (${pct}%)</div>
      <div style="flex:1;background:#e2e8f0;border-radius:4px;height:10px;overflow:hidden;">
        <div style="height:100%;width:${pct}%;background:${color};border-radius:4px;"></div></div></div>`;
  };

  // ── Utilization ──
  const maxPaxCapacity = Math.max(...monthFlights.map(f => f.aircraft_max_passengers || 180));
  const avgPaxUtil = totalFlights > 0 ? Math.round((totalPax/totalFlights)/maxPaxCapacity*100) : 0;
  const avgCargoUtil = totalFlights > 0 ? Math.round((totalPayload/totalFlights)/20468*100) : 0;

  // ── Top routes/aircraft ──
  const routeP = {};
  monthFlights.forEach(f => { const r=`${f.origin}→${f.destination}`; routeP[r]=(routeP[r]||0)+(f.profit||0); });
  const topRoutes = Object.entries(routeP).sort((a,b)=>b[1]-a[1]).slice(0,5);

  const acP = {};
  monthFlights.forEach(f => { const ac=f.aircraft||'?'; acP[ac]=(acP[ac]||0)+(f.profit||0); });
  const topAircraft = Object.entries(acP).sort((a,b)=>b[1]-a[1]).slice(0,5);

  // ── Weather summary ──
  const weatherOk  = monthFlights.filter(f => (f.windSpeed||0)<=20 && (f.visibility||10)>=5).length;
  const weatherBad = monthFlights.length - weatherOk;

  const monthName = L.monthNames[month-1];
  const prevMonthName = L.monthNames[prevMonth-1];
  const dir = currentLang==='he' ? 'rtl' : 'ltr';
  const align = currentLang==='he' ? 'right' : 'left';
  const fmtMoney = n => (n<0?'-$':'$')+Math.abs(Math.round(n)).toLocaleString();
  const today = new Date().toLocaleDateString('he-IL');

  const html = `<!DOCTYPE html>
<html dir="${dir}" lang="${currentLang}">
<head>
<meta charset="UTF-8">
<title>דוח חודשי - ${monthName} ${year}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;background:#f8fafc;color:#1e293b;direction:${dir};}
  .page{max-width:900px;margin:0 auto;padding:30px;}

  /* HEADER */
  .report-header{background:linear-gradient(135deg,#1e40af,#4f46e5,#7c3aed);color:#fff;padding:32px 36px;border-radius:16px;margin-bottom:28px;position:relative;overflow:hidden;}
  .report-header::after{content:'✈️';position:absolute;left:-10px;bottom:-20px;font-size:120px;opacity:0.08;}
  .report-header h1{font-size:28px;font-weight:700;letter-spacing:-0.5px;}
  .report-header h2{font-size:15px;opacity:0.85;margin-top:4px;}
  .report-header .meta{font-size:12px;opacity:0.65;margin-top:12px;}

  /* KPI ROW */
  .kpi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:24px;}
  .kpi{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:18px;position:relative;overflow:hidden;}
  .kpi::before{content:'';position:absolute;top:0;right:0;width:4px;height:100%;background:var(--c);}
  .kpi .icon{font-size:22px;margin-bottom:6px;}
  .kpi .val{font-size:22px;font-weight:700;color:#0f172a;}
  .kpi .lbl{font-size:11px;color:#64748b;margin-top:2px;}
  .kpi .delta{font-size:11px;font-weight:600;margin-top:6px;}

  /* SECTION */
  .section{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:22px;margin-bottom:20px;}
  .section-title{font-size:15px;font-weight:700;color:#1e293b;margin-bottom:16px;padding-bottom:10px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;gap:8px;}

  /* TWO COLUMN */
  .two-col{display:grid;grid-template-columns:1fr 1fr;gap:16px;}

  /* COST ITEM */
  .cost-item{margin-bottom:14px;}
  .cost-item .cost-row{display:flex;justify-content:space-between;font-size:13px;margin-bottom:2px;}
  .cost-item .cost-name{color:#475569;}
  .cost-item .cost-val{font-weight:600;color:#0f172a;}

  /* TABLE */
  table{width:100%;border-collapse:collapse;font-size:12px;}
  th{background:#f8fafc;padding:9px 10px;text-align:${align};font-weight:600;color:#475569;border-bottom:2px solid #e2e8f0;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;}
  td{padding:8px 10px;border-bottom:1px solid #f1f5f9;color:#334155;}
  tr:hover td{background:#fafbff;}
  .pos{color:#16a34a;font-weight:600;}
  .neg{color:#dc2626;font-weight:600;}

  /* SAFETY BAR */
  .safety-label{font-size:12px;color:#475569;margin-bottom:2px;}

  /* UTIL PILL */
  .util-row{display:flex;align-items:center;gap:10px;margin-bottom:10px;}
  .util-label{font-size:12px;color:#475569;min-width:80px;}
  .util-track{flex:1;background:#e2e8f0;border-radius:6px;height:12px;overflow:hidden;}
  .util-fill{height:100%;border-radius:6px;}
  .util-pct{font-size:12px;font-weight:700;min-width:36px;text-align:${dir==='rtl'?'left':'right'};}

  /* ROI BADGE */
  .roi-badge{display:inline-block;background:linear-gradient(135deg,#059669,#10b981);color:#fff;font-size:22px;font-weight:700;padding:12px 24px;border-radius:12px;margin:8px 0;}

  /* COMPARISON */
  .comp-row{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;}
  .comp-row:last-child{border:none;}
  .comp-metric{color:#475569;}
  .comp-vals{display:flex;gap:16px;}
  .comp-cur{font-weight:700;color:#1e293b;}
  .comp-prev{color:#94a3b8;}

  /* PRINT */
  .print-bar{text-align:center;padding:20px 0;margin-top:10px;}
  .print-btn{padding:12px 36px;background:linear-gradient(135deg,#3b82f6,#6366f1);color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;letter-spacing:0.3px;}
  @media print{.print-bar{display:none;}.page{padding:15px;}.section{break-inside:avoid;}}
</style>
</head>
<body>
<div class="page">

  <!-- HEADER -->
  <div class="report-header">
    <h1>✈️ SmartLogBook — דוח חודשי</h1>
    <h2>${monthName} ${year}</h2>
    <div class="meta">הופק ב-${today} · ${totalFlights} טיסות · ${hours}:${String(mins).padStart(2,'0')} שעות טיסה</div>
  </div>

  <!-- KPIs -->
  <div class="kpi-grid">
    <div class="kpi" style="--c:#3b82f6">
      <div class="icon">✈️</div>
      <div class="val">${totalFlights}</div>
      <div class="lbl">סה"כ טיסות</div>
      <div class="delta" style="color:${deltaColor(totalFlights,prevFlightCount)}">${delta(totalFlights,prevFlightCount)} לעומת ${prevMonthName}</div>
    </div>
    <div class="kpi" style="--c:${totalProfit>=0?'#10b981':'#ef4444'}">
      <div class="icon">💰</div>
      <div class="val" style="color:${totalProfit>=0?'#059669':'#dc2626'}">${fmtMoney(totalProfit)}</div>
      <div class="lbl">רווח נקי</div>
      <div class="delta" style="color:${deltaColor(totalProfit,prevProfit)}">${delta(totalProfit,prevProfit)} לעומת ${prevMonthName}</div>
    </div>
    <div class="kpi" style="--c:#8b5cf6">
      <div class="icon">👥</div>
      <div class="val">${totalPax.toLocaleString()}</div>
      <div class="lbl">סה"כ נוסעים</div>
      <div class="delta" style="color:${deltaColor(totalPax,prevPax)}">${delta(totalPax,prevPax)} לעומת ${prevMonthName}</div>
    </div>
    <div class="kpi" style="--c:#f59e0b">
      <div class="icon">⛽</div>
      <div class="val">${(totalFuel/1000).toFixed(1)}T</div>
      <div class="lbl">דלק שנצרך</div>
      <div class="delta" style="color:#64748b">~$${costFuel.toLocaleString()}</div>
    </div>
    <div class="kpi" style="--c:#14b8a6">
      <div class="icon">🌍</div>
      <div class="val">${totalDist.toLocaleString()}</div>
      <div class="lbl">מרחק כולל (NM)</div>
      <div class="delta" style="color:#64748b">ממוצע ${Math.round(totalDist/totalFlights).toLocaleString()} NM/טיסה</div>
    </div>
    <div class="kpi" style="--c:#6366f1">
      <div class="icon">📊</div>
      <div class="val">${profitMargin}%</div>
      <div class="lbl">מרווח רווח</div>
      <div class="delta" style="color:#64748b">ROI: ${roi}%</div>
    </div>
  </div>

  <!-- COST BREAKDOWN + ROI -->
  <div class="two-col" style="margin-bottom:20px;">
    <div class="section">
      <div class="section-title">💸 פירוט עלויות</div>
      <div class="cost-item">
        <div class="cost-row"><span class="cost-name">⛽ דלק</span><span class="cost-val">$${costFuel.toLocaleString()}</span></div>
        ${costBar(costFuel)}
      </div>
      <div class="cost-item">
        <div class="cost-row"><span class="cost-name">👨‍✈️ צוות</span><span class="cost-val">$${costCrew.toLocaleString()}</span></div>
        ${costBar(costCrew)}
      </div>
      <div class="cost-item">
        <div class="cost-row"><span class="cost-name">🛬 נחיתות</span><span class="cost-val">$${costLanding.toLocaleString()}</span></div>
        ${costBar(costLanding)}
      </div>
      <div class="cost-item">
        <div class="cost-row"><span class="cost-name">🔧 תחזוקה</span><span class="cost-val">$${costMaintenance.toLocaleString()}</span></div>
        ${costBar(costMaintenance)}
      </div>
      <div style="border-top:2px solid #e2e8f0;margin-top:12px;padding-top:12px;display:flex;justify-content:space-between;font-weight:700;">
        <span>סך עלויות</span><span>$${totalCosts.toLocaleString()}</span>
      </div>
    </div>

    <div class="section">
      <div class="section-title">📈 ניתוח רווחיות</div>
      <div style="text-align:center;margin-bottom:16px;">
        <div style="font-size:12px;color:#64748b;margin-bottom:4px;">החזר השקעה (ROI)</div>
        <div class="roi-badge">${roi}%</div>
      </div>
      <div class="comp-row"><span class="comp-metric">הכנסות</span><span class="comp-cur pos">$${totalRevenue.toLocaleString()}</span></div>
      <div class="comp-row"><span class="comp-metric">עלויות</span><span class="comp-cur neg">$${totalCosts.toLocaleString()}</span></div>
      <div class="comp-row"><span class="comp-metric">רווח נקי</span><span class="comp-cur" style="color:${totalProfit>=0?'#059669':'#dc2626'}">${fmtMoney(totalProfit)}</span></div>
      <div class="comp-row"><span class="comp-metric">מרווח רווח</span><span class="comp-cur">${profitMargin}%</span></div>
      <div class="comp-row"><span class="comp-metric">ממוצע לטיסה</span><span class="comp-cur">${fmtMoney(Math.round(totalProfit/totalFlights))}</span></div>
      <div class="comp-row"><span class="comp-metric">רווח לשעה</span><span class="comp-cur">${totalMins>0?fmtMoney(Math.round(totalProfit/(totalMins/60))):'—'}</span></div>
    </div>
  </div>

  <!-- SAFETY + UTILIZATION -->
  <div class="two-col" style="margin-bottom:20px;">
    <div class="section">
      <div class="section-title">🛡️ בטיחות נחיתות</div>
      <div style="display:flex;justify-content:space-between;margin-bottom:14px;">
        <div style="text-align:center;">
          <div style="font-size:24px;font-weight:700;color:#0f172a;">${avgFpm}</div>
          <div style="font-size:11px;color:#64748b;">FPM ממוצע</div>
        </div>
        <div style="text-align:center;">
          <div style="font-size:24px;font-weight:700;color:${safetyScore>=80?'#059669':safetyScore>=60?'#d97706':'#dc2626'}">${safetyScore}%</div>
          <div style="font-size:11px;color:#64748b;">ציון בטיחות</div>
        </div>
        <div style="text-align:center;">
          <div style="font-size:24px;font-weight:700;color:#0f172a;">${fpms.length}</div>
          <div style="font-size:11px;color:#64748b;">נחיתות עם נתון</div>
        </div>
      </div>
      <div class="safety-label">🟢 רכות (≤250 FPM) — ${soft}</div>
      ${fpmBar(soft, fpms.length, '#10b981')}
      <div class="safety-label" style="margin-top:8px;">🟡 רגילות (251–400 FPM) — ${normal}</div>
      ${fpmBar(normal, fpms.length, '#f59e0b')}
      <div class="safety-label" style="margin-top:8px;">🔴 קשות (>400 FPM) — ${hard}</div>
      ${fpmBar(hard, fpms.length, '#ef4444')}
    </div>

    <div class="section">
      <div class="section-title">📦 ניצולת קיבולת</div>
      <div style="margin-bottom:16px;">
        <div class="util-row">
          <div class="util-label">👥 נוסעים</div>
          <div class="util-track"><div class="util-fill" style="width:${avgPaxUtil}%;background:${avgPaxUtil>=80?'#10b981':avgPaxUtil>=50?'#f59e0b':'#ef4444'};"></div></div>
          <div class="util-pct">${avgPaxUtil}%</div>
        </div>
        <div style="font-size:11px;color:#94a3b8;margin-bottom:12px;">ממוצע ${Math.round(totalPax/totalFlights)} / ${maxPaxCapacity} נוסעים לטיסה</div>
        <div class="util-row">
          <div class="util-label">📦 מטען</div>
          <div class="util-track"><div class="util-fill" style="width:${Math.min(100,avgCargoUtil)}%;background:${avgCargoUtil>=60?'#10b981':avgCargoUtil>=30?'#f59e0b':'#ef4444'};"></div></div>
          <div class="util-pct">${Math.min(100,avgCargoUtil)}%</div>
        </div>
        <div style="font-size:11px;color:#94a3b8;margin-bottom:12px;">ממוצע ${Math.round(totalPayload/totalFlights).toLocaleString()} / 20,468 ק"ג לטיסה</div>
      </div>
      <div style="border-top:1px solid #f1f5f9;padding-top:12px;">
        <div class="comp-row"><span class="comp-metric">🌤️ תנאי מזג אוויר תקינים</span><span class="comp-cur pos">${weatherOk}</span></div>
        <div class="comp-row"><span class="comp-metric">🌧️ תנאים קשים</span><span class="comp-cur ${weatherBad>0?'neg':''}">${weatherBad}</span></div>
        <div class="comp-row"><span class="comp-metric">⛽ צריכת דלק ל-NM</span><span class="comp-cur">${totalDist>0?(totalFuel/totalDist).toFixed(2):0} ק"ג/NM</span></div>
      </div>
    </div>
  </div>

  <!-- TOP ROUTES + AIRCRAFT -->
  <div class="two-col" style="margin-bottom:20px;">
    <div class="section">
      <div class="section-title">🏆 נתיבים מובילים</div>
      <table>
        <tr><th>#</th><th>נתיב</th><th>רווח</th></tr>
        ${topRoutes.map(([r,p],i)=>`<tr><td style="color:#94a3b8;font-weight:700;">${i+1}</td><td>${r}</td><td class="${p>=0?'pos':'neg'}">${fmtMoney(p)}</td></tr>`).join('')}
      </table>
    </div>
    <div class="section">
      <div class="section-title">✈️ מטוסים מובילים</div>
      <table>
        <tr><th>#</th><th>מטוס</th><th>רווח</th></tr>
        ${topAircraft.map(([ac,p],i)=>`<tr><td style="color:#94a3b8;font-weight:700;">${i+1}</td><td>${ac}</td><td class="${p>=0?'pos':'neg'}">${fmtMoney(p)}</td></tr>`).join('')}
      </table>
    </div>
  </div>

  <!-- FLIGHT LOG -->
  <div class="section">
    <div class="section-title">📋 יומן טיסות — ${monthName} ${year}</div>
    <table>
      <tr><th>תאריך</th><th>נתיב</th><th>מטוס</th><th>פא"ק</th><th>דלק (ק"ג)</th><th>FPM</th><th>רווח</th></tr>
      ${monthFlights.map(f => {
        const d = new Date(f.date);
        const ds = `${d.getDate()}/${d.getMonth()+1}`;
        const p = f.profit||0;
        return `<tr>
          <td>${ds}</td>
          <td><strong>${f.origin}</strong> → ${f.destination}</td>
          <td>${f.aircraft||'—'}</td>
          <td>${(f.passengers||0)} / ${f.aircraft_max_passengers||180}</td>
          <td>${(f.fuel||0).toLocaleString()}</td>
          <td>${Math.abs(f.fpm||0)}</td>
          <td class="${p>=0?'pos':'neg'}">${fmtMoney(p)}</td>
        </tr>`;
      }).join('')}
    </table>
  </div>

  <div class="print-bar">
    <button class="print-btn" onclick="window.print()">🖨️ הדפסה / שמירה כ-PDF</button>
  </div>

</div>
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
        Aircraft_Max_Passengers: f.aircraft_max_passengers || 189,
        Aircraft_Max_Cargo_kg: f.aircraft_max_cargo || 5000,
        Fuel_kg: f.fuel,
        Payload_kg: f.payload || 0,
        FPM: f.fpm,
        Cost_Index: f.costIndex || 0,
        Wind_Speed_kt: f.windSpeed || 0,
        Visibility: f.visibility || 10,
        Ceiling_ft: f.ceiling || 5000,
        Weather_Conditions: f.weatherConditions || 'CAVOK',
        Profit_USD: f.profit,
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [{wch:12},{wch:8},{wch:8},{wch:12},{wch:12},{wch:10},{wch:8},{wch:12},{wch:12},{wch:10},{wch:10},{wch:10},{wch:10},{wch:8},{wch:12},{wch:10},{wch:18},{wch:12}];
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
          aircraft_max_passengers: parseInt(row.Aircraft_Max_Passengers) || 189,
          aircraft_max_cargo: parseInt(row.Aircraft_Max_Cargo_kg) || 5000,
          costIndex: parseInt(row.Cost_Index) || 0,
          windSpeed: parseInt(row.Wind_Speed_kt) || 0,
          visibility: parseInt(row.Visibility) || 10,
          ceiling: parseInt(row.Ceiling_ft) || 5000,
          weatherConditions: row.Weather_Conditions || 'CAVOK',
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
  // Merge API source with hardcoded MISSIONS for completed lookup (handles legacy IDs)
  const mergedSource = [...source, ...MISSIONS.filter(m => !source.some(s => s.id === m.id))];

  const today = new Date().toISOString().split('T')[0];
  const activeMissions = source.filter(m =>
    !completedMissions.includes(m.id) && (!m.date || m.date >= today)
  );
  const completed = mergedSource.filter(m => completedMissions.includes(m.id));

  // === PROGRESS BAR ===
  const totalMissionCount = mergedSource.length;
  const completedCount = completed.length;
  const progressPct = totalMissionCount > 0 ? Math.round((completedCount / totalMissionCount) * 100) : 0;
  const progressHTML = `
    <div class="missions-progress-wrap">
      <div class="missions-progress-label">
        <span>🎯 התקדמות משימות</span>
        <strong>${completedCount} / ${totalMissionCount} הושלמו · ${progressPct}%</strong>
      </div>
      <div class="missions-progress-bar-track">
        <div class="missions-progress-bar-fill" style="width:${progressPct}%"></div>
      </div>
    </div>`;

  // Render active missions
  if (activeMissionsGrid) {
    // Remove old progress bar if re-rendering
    const oldBar = activeMissionsGrid.parentNode.querySelector('.missions-progress-wrap');
    if (oldBar) oldBar.remove();

    // Insert progress bar above grid
    activeMissionsGrid.insertAdjacentHTML('beforebegin', progressHTML);

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

  const statusBadge = isCompleted
    ? `<div class="mission-status-badge mission-status-badge--done">✅ הושלם</div>`
    : `<div class="mission-status-badge mission-status-badge--active">⚡ פעיל</div>`;

  return `
    <div class="mission-card ${!isCompleted ? 'mission-card--active' : ''}" dir="rtl" style="border-right: 4px solid ${bgColor}; text-align: right;">
      <div class="mission-header">
        <div class="mission-title">${mission.emoji} ${mission.title}</div>
        ${statusBadge}
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

// Check for new achievements based on current progress
function checkAchievements() {
  if (!flights || flights.length === 0) return;

  const totalFlights = flights.length;
  const totalHours = flights.reduce((sum, f) => sum + (f.durationMins || 0), 0) / 60;
  const totalProfit = flights.reduce((sum, f) => sum + (f.profit || 0), 0);
  const perfectLandings = flights.filter(f => f.fpm && f.fpm >= -200 && f.fpm <= -150).length;

  // Simple continent check (based on flight routes - simplified)
  const destinations = new Set(flights.map(f => f.destination));
  const visitedContinents = Math.min(6, Math.ceil(destinations.size / 3)); // Rough estimate

  // Check each achievement
  ACHIEVEMENTS_LIST.forEach(achievement => {
    if (unlockedAchievements.includes(achievement.id)) return; // Already unlocked

    let shouldUnlock = false;

    if (achievement.id === 'flight_100' && totalFlights >= 100) {
      shouldUnlock = true;
    } else if (achievement.id === 'hours_500' && totalHours >= 500) {
      shouldUnlock = true;
    } else if (achievement.id === 'profit_100k' && totalProfit >= 100000) {
      shouldUnlock = true;
    } else if (achievement.id === 'perfectLanding' && perfectLandings >= 10) {
      shouldUnlock = true;
    } else if (achievement.id === 'allContinents' && visitedContinents >= 6) {
      shouldUnlock = true;
    }

    if (shouldUnlock) {
      unlockAchievement(achievement.id);
    }
  });
}

function unlockAchievement(achievementId) {
  if (unlockedAchievements.includes(achievementId)) return;

  unlockedAchievements.push(achievementId);
  const achievement = ACHIEVEMENTS_LIST.find(a => a.id === achievementId);

  if (achievement) {
    // Show achievement notification
    showSmartNotification(
      'achievement',
      `${achievement.emoji} הישג חדש!`,
      achievement.name,
      5000
    );

    // Save to localStorage
    localStorage.setItem('unlockedAchievements', JSON.stringify(unlockedAchievements));
  }
}

// Load achievements from localStorage on init
function loadAchievements() {
  const saved = localStorage.getItem('unlockedAchievements');
  if (saved) {
    try {
      unlockedAchievements = JSON.parse(saved);
    } catch (e) {
      unlockedAchievements = [];
    }
  }
}

// Open achievements gallery
function openAchievementsGallery() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.display = 'flex';
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-title">🏆 הישגים</div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; max-height: 60vh; overflow-y: auto;">
        ${ACHIEVEMENTS_LIST.map(achievement => {
          const unlocked = unlockedAchievements.includes(achievement.id);
          return `
            <div style="
              padding: 16px;
              border-radius: 8px;
              text-align: center;
              background: ${unlocked ? 'rgba(59, 130, 246, 0.2)' : 'rgba(100, 116, 139, 0.2)'};
              border: 2px solid ${unlocked ? 'var(--accent)' : 'var(--border)'};
              opacity: ${unlocked ? '1' : '0.6'};
              cursor: pointer;
            ">
              <div style="font-size: 32px; margin-bottom: 8px;">${achievement.emoji}</div>
              <div style="font-weight: 700; font-size: 14px; color: var(--text-primary);">${achievement.name}</div>
              <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
                ${unlocked ? '✅ מטבוח' : '🔒 נעול'}
              </div>
            </div>
          `;
        }).join('')}
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">סגור</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };
}

// ===== AIRLINE RATING =====
function ratingScore(value, minFor1, maxFor5) {
  if (maxFor5 === minFor1) return 3;
  const clamped = Math.max(minFor1, Math.min(maxFor5, value));
  return 1 + 4 * (clamped - minFor1) / (maxFor5 - minFor1);
}

function ratingScoreInverse(value, minFor5, maxFor1) {
  // Higher value = worse score (e.g. hard landings %)
  return ratingScore(value, maxFor1, minFor5);
}

function starsHTML(score, size = 16) {
  const full = Math.floor(score);
  const half = (score - full) >= 0.25 && (score - full) < 0.75;
  const fullStar = (score - full) >= 0.75;
  const stars = [];
  for (let i = 0; i < 5; i++) {
    if (i < full || (i === full && fullStar)) stars.push('<span style="color:#f59e0b">&#9733;</span>');
    else if (i === full && half) stars.push('<span style="color:#f59e0b">&#9733;</span>');
    else stars.push('<span style="color:var(--text-secondary);opacity:0.3">&#9733;</span>');
  }
  return `<span style="font-size:${size}px;letter-spacing:2px">${stars.join('')}</span>`;
}

function barColor(score) {
  if (score >= 4) return '#10b981';
  if (score >= 3) return '#f59e0b';
  if (score >= 2) return '#f97316';
  return '#ef4444';
}

function scoreClass(score) {
  if (score >= 4) return 'high';
  if (score >= 2.5) return 'mid';
  return 'low';
}

function renderAirlineRating() {
  if (!flights || flights.length === 0) {
    document.getElementById('ratingGaugeScore').textContent = '-';
    document.getElementById('ratingGaugeStars').innerHTML = starsHTML(0, 28);
    document.getElementById('ratingGaugeLabel').textContent = 'אין מספיק נתונים - הוסף טיסות';
    document.getElementById('ratingCategoriesGrid').innerHTML = '';
    document.getElementById('ratingDetailsTable').innerHTML = '<p style="color:var(--text-secondary);text-align:center;padding:20px;">הוסף טיסות כדי לקבל דירוג</p>';
    document.getElementById('ratingTips').innerHTML = '';
    return;
  }

  const totalFlights = flights.length;
  const totalPax = flights.reduce((s, f) => s + (f.passengers || 0), 0);
  const totalDist = flights.reduce((s, f) => s + (f.distance || 0), 0);
  const totalFuel = flights.reduce((s, f) => s + (f.fuel || 0), 0);
  const totalProfit = flights.reduce((s, f) => s + (f.profit || 0), 0);
  const totalPayload = flights.reduce((s, f) => s + (f.payload || 0), 0);
  const totalMins = flights.reduce((s, f) => s + (f.durationMins || f.duration_mins || 0), 0);
  const totalHours = totalMins / 60;

  const avgPax = totalPax / totalFlights;
  const avgDist = totalDist / totalFlights;
  const avgProfit = totalProfit / totalFlights;
  const avgPayload = totalPayload / totalFlights;
  const fuelPerNM = totalDist > 0 ? totalFuel / totalDist : 99;
  const profitPerHour = totalHours > 0 ? totalProfit / totalHours : 0;

  // Landing quality: רכה (0-250), קשה קלות (251-300), גרועה (300+)
  let softLandings = 0, slightlyHardLandings = 0, badLandings = 0, totalFPM = 0, fpmCount = 0;
  flights.forEach(f => {
    const fpm = f.fpm || 0;
    if (fpm !== 0) {
      const abs = Math.abs(fpm);
      totalFPM += abs;
      fpmCount++;
      if (abs <= 250) softLandings++;
      else if (abs <= 300) slightlyHardLandings++;
      else badLandings++;
    }
  });
  const softPct = fpmCount > 0 ? (softLandings / fpmCount) * 100 : 0;
  const slightlyHardPct = fpmCount > 0 ? (slightlyHardLandings / fpmCount) * 100 : 0;
  const badPct = fpmCount > 0 ? (badLandings / fpmCount) * 100 : 0;
  const avgFPM = fpmCount > 0 ? totalFPM / fpmCount : 200;

  // Destinations & continents
  const uniqueDests = new Set(flights.map(f => f.destination)).size;
  const continentMap = { E: 'EU', K: 'NA', L: 'EU', O: 'AS', R: 'AS', S: 'SA', V: 'AS', W: 'AS', H: 'AF', F: 'AF', D: 'AF', G: 'AF', Y: 'AU', N: 'OC', U: 'AS', Z: 'AS' };
  const continents = new Set();
  flights.forEach(f => {
    const code = (f.destination || '').charAt(0).toUpperCase();
    if (continentMap[code]) continents.add(continentMap[code]);
  });

  // Completed missions
  const completedCount = completedMissions ? completedMissions.length : 0;

  // Monthly statistics for Activity category
  const getMonthlyStats = () => {
    const monthlyData = {};
    flights.forEach(f => {
      const date = new Date(f.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          flights: 0,
          hours: 0,
          passengers: 0,
          cargo: 0,
          fuel: 0,
          dayFlights: 0,
          nightFlights: 0,
        };
      }
      monthlyData[monthKey].flights++;
      monthlyData[monthKey].hours += (f.durationMins || 0) / 60;
      monthlyData[monthKey].passengers += f.passengers || 0;
      monthlyData[monthKey].cargo += f.payload || 0;
      monthlyData[monthKey].fuel += f.fuel || 0;

      // Check if flight is night (between 22:00 and 06:00)
      const hour = date.getHours();
      if (hour >= 22 || hour < 6) {
        monthlyData[monthKey].nightFlights++;
      } else {
        monthlyData[monthKey].dayFlights++;
      }
    });
    return monthlyData;
  };

  const monthlyData = getMonthlyStats();
  const monthKeys = Object.keys(monthlyData).sort();
  const currentMonth = monthKeys[monthKeys.length - 1] || '2024-01';
  const currentMonthData = monthlyData[currentMonth] || { flights: 0, hours: 0, passengers: 0, cargo: 0, fuel: 0, dayFlights: 0, nightFlights: 0 };

  // Calculate averages (EXCLUDING current month - only previous months)
  const previousMonths = monthKeys.slice(0, -1).map(k => monthlyData[k]);
  const monthlyAvg = {
    flights: previousMonths.length > 0 ? previousMonths.reduce((s, m) => s + m.flights, 0) / previousMonths.length : 0,
    hours: previousMonths.length > 0 ? previousMonths.reduce((s, m) => s + m.hours, 0) / previousMonths.length : 0,
    passengers: previousMonths.length > 0 ? (previousMonths.reduce((s, m) => s + m.passengers, 0) / previousMonths.reduce((s, m) => s + m.flights, 0)) : 0, // avg per flight across previous months
    cargo: previousMonths.length > 0 ? (previousMonths.reduce((s, m) => s + m.cargo, 0) / previousMonths.reduce((s, m) => s + m.flights, 0)) : 0, // avg per flight across previous months
    fuel: previousMonths.length > 0 ? (previousMonths.reduce((s, m) => s + m.fuel, 0) / previousMonths.reduce((s, m) => s + m.flights, 0)) : 0, // avg per flight across previous months
    dayFlights: previousMonths.length > 0 ? previousMonths.reduce((s, m) => s + m.dayFlights, 0) / previousMonths.length : 0,
    nightFlights: previousMonths.length > 0 ? previousMonths.reduce((s, m) => s + m.nightFlights, 0) / previousMonths.length : 0,
  };

  // Scoring function: compare current to average
  const scoreMonthly = (current, average, inverse = false) => {
    if (average === 0) return 3;
    if (current > average) return inverse ? 1 : 5;
    if (current < average) return inverse ? 5 : 1;
    return 3; // equal
  };

  // Rank - calculate from flight hours (same logic as updateRank)
  let rankIdx = 0;
  for (let i = RANK_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalHours >= RANK_THRESHOLDS[i]) { rankIdx = i; break; }
  }
  const rankNames = t('ranks') || ['סטודנט','טייס מתחיל','טייס','טייס בכיר','קברניט','קברניט בכיר','אגדי'];
  const rankName = rankNames[rankIdx] || 'סטודנט';

  // Goals achievement
  let goalAchievement = 50; // default
  const goalInputs = document.getElementById('goalFlights');
  if (goalInputs) {
    const goalFlights = parseInt(goalInputs.value) || 0;
    if (goalFlights > 0) goalAchievement = Math.min(100, (totalFlights / goalFlights) * 100);
  }

  // Pre-compute per-flight tooltip data - sorted chronologically (oldest first)
  const flightsByDate = [...flights].sort((a, b) => new Date(b.date) - new Date(a.date));
  const flLabel = f => {
    const d = new Date(f.date).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' });
    return `${d} ${f.origin}→${f.destination}`;
  };
  const avgCI = flights.reduce((s, f) => s + (f.costIndex || 0), 0) / totalFlights;
  const avgWeatherRisk = flights.reduce((s, f) => {
    const w = f.windSpeed || 0, v = f.visibility || 10, c = f.ceiling || 5000;
    return s + (w > 30 ? 1 : w > 20 ? 0.7 : 0.5) * (v < 3 ? 1 : v < 5 ? 0.7 : 0.3) * (c < 1000 ? 1 : c < 3000 ? 0.7 : 0.3);
  }, 0) / Math.max(1, totalFlights);

  // Determine actual aircraft capacity from flights
  // Use capacity data from SimBrief (stored in each flight) if available
  // Fall back to hardcoded database if not available
  const aircraftCounts = {};
  const aircraftCapacities = {};

  flights.forEach(f => {
    const ac = f.aircraft || 'unknown';
    aircraftCounts[ac] = (aircraftCounts[ac] || 0) + 1;

    // Try to use capacity from SimBrief first, then fallback to database
    if (!aircraftCapacities[ac]) {
      if (f.aircraft_max_passengers && f.aircraft_max_cargo) {
        aircraftCapacities[ac] = {
          pax: f.aircraft_max_passengers,
          cargo: f.aircraft_max_cargo
        };
      } else {
        aircraftCapacities[ac] = getAircraftCapacity(ac);
      }
    }
  });

  // Get the most used aircraft
  const mostUsedAircraft = Object.entries(aircraftCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'B738';
  const actualCapacity = aircraftCapacities[mostUsedAircraft] || getAircraftCapacity(mostUsedAircraft);
  // Fix cargo capacity to 20468 kg for all calculations
  actualCapacity.cargo = 20468;

  // === CATEGORY CALCULATIONS ===
  const categories = [
    {
      name: 'בטיחות',
      emoji: '🛡️',
      weight: 0.25,
      metrics: [
        {
          name: 'FPM ממוצע', value: avgFPM.toFixed(0),
          score: Math.max(1, Math.min(5, 5 - Math.max(0, avgFPM - 150) / 150 * 4)),
          tips: flightsByDate.filter(f => f.fpm !== 0).map(f => ({ label: flLabel(f), val: `${Math.abs(f.fpm)} FPM` }))
        },
        {
          name: 'Cost Index', value: Math.round(avgCI),
          score: Math.max(1, Math.min(5, 5 - avgCI / 500 * 4)),
          tips: flightsByDate.map(f => ({ label: flLabel(f), val: `CI ${f.costIndex || 80}` }))
        },
        {
          name: 'מצב מזג אוויר', value: avgWeatherRisk.toFixed(2),
          score: Math.max(1, 5 - avgWeatherRisk * 4),
          tips: flightsByDate.map(f => ({ label: flLabel(f), val: `${f.windSpeed || 0}kts | Vis:${f.visibility || 10}NM` }))
        }
      ]
    },
    {
      name: 'רווחיות',
      emoji: '💰',
      weight: 0.25,
      metrics: [
        {
          name: 'רווח ממוצע/טיסה', value: `$${(avgProfit/1000).toFixed(1)}K`,
          score: ratingScore(avgProfit, 5000, 30000),
          tips: flightsByDate.map(f => ({ label: flLabel(f), val: `$${(f.profit||0).toLocaleString()}` }))
        },
        {
          name: 'רווח/שעת טיסה', value: `$${(profitPerHour/1000).toFixed(1)}K`,
          score: ratingScore(profitPerHour, 2000, 10000),
          tips: flightsByDate.filter(f => (f.durationMins||0) > 0).map(f => ({ label: flLabel(f), val: `$${Math.round((f.profit||0)/((f.durationMins||60)/60)).toLocaleString()}/h` }))
        }
      ]
    },
    {
      name: 'יעילות',
      emoji: '⚡',
      weight: 0.20,
      metrics: [
        {
          name: 'צריכת דלק (מתואמת)', value: calculateAvgFuelEfficiency().toFixed(2),
          score: calculateAvgFuelEfficiency(),
          tips: flightsByDate.map(f => {
            const eff = calculateFuelEfficiency(f);
            return { label: flLabel(f), val: `${eff.toFixed(2)} ⭐` };
          })
        },
        {
          name: `ניצול נוסעים`, value: `${(avgPax / actualCapacity.pax * 100).toFixed(1)}%`,
          score: ratingScore(avgPax / actualCapacity.pax * 100, 30, 100),
          tips: flightsByDate.map(f => ({ label: flLabel(f), val: `${f.passengers||0}/${actualCapacity.pax} (${(f.passengers/actualCapacity.pax*100).toFixed(0)}%)` }))
        },
        {
          name: `ניצול מטען`, value: `${(avgPayload / actualCapacity.cargo * 100).toFixed(1)}%`,
          score: ratingScore(avgPayload / actualCapacity.cargo * 100, 15, 80),
          tips: flightsByDate.map(f => ({ label: flLabel(f), val: `${f.payload||0}/${actualCapacity.cargo}kg (${(f.payload/actualCapacity.cargo*100).toFixed(0)}%)` }))
        }
      ]
    },
    {
      name: 'פעילות',
      emoji: '⚙️',
      weight: 0.20,
      metrics: [
        {
          name: 'ממוצע נוסעים לטיסה (חודש)', value: `${(currentMonthData.passengers / Math.max(1, currentMonthData.flights)).toFixed(0)}`,
          score: scoreMonthly(currentMonthData.passengers / Math.max(1, currentMonthData.flights), monthlyAvg.passengers),
          tips: [
            ...monthKeys.map(k => ({ label: k, val: `${(monthlyData[k].passengers / Math.max(1, monthlyData[k].flights)).toFixed(0)}` })),
            { label: 'ממוצע חודשי', val: `${monthlyAvg.passengers.toFixed(0)}` }
          ]
        },
        {
          name: 'ממוצע מטען לטיסה (חודש)', value: `${(currentMonthData.cargo / Math.max(1, currentMonthData.flights)).toFixed(0)}kg`,
          score: scoreMonthly(currentMonthData.cargo / Math.max(1, currentMonthData.flights), monthlyAvg.cargo),
          tips: [
            ...monthKeys.map(k => ({ label: k, val: `${(monthlyData[k].cargo / Math.max(1, monthlyData[k].flights)).toFixed(0)}kg` })),
            { label: 'ממוצע חודשי', val: `${monthlyAvg.cargo.toFixed(0)}kg` }
          ]
        },
        {
          name: 'ממוצע צריכת דלק (חודש)', value: `${(currentMonthData.fuel / Math.max(1, currentMonthData.flights)).toFixed(0)}kg`,
          score: scoreMonthly(currentMonthData.fuel / Math.max(1, currentMonthData.flights), monthlyAvg.fuel, true), // inverse - lower is better
          tips: [
            ...monthKeys.map(k => ({ label: k, val: `${(monthlyData[k].fuel / Math.max(1, monthlyData[k].flights)).toFixed(0)}kg` })),
            { label: 'ממוצע חודשי', val: `${monthlyAvg.fuel.toFixed(0)}kg` }
          ]
        },
        {
          name: 'סה"כ שעות טיסה (חודש)', value: `${currentMonthData.hours.toFixed(1)}h`,
          score: scoreMonthly(currentMonthData.hours, monthlyAvg.hours),
          tips: [
            ...monthKeys.map(k => ({ label: k, val: `${monthlyData[k].hours.toFixed(1)}h` })),
            { label: 'ממוצע חודשי', val: `${monthlyAvg.hours.toFixed(1)}h` }
          ]
        },
        {
          name: 'טיסות לילה (חודש)', value: currentMonthData.nightFlights,
          score: scoreMonthly(currentMonthData.nightFlights, monthlyAvg.nightFlights),
          tips: [
            ...monthKeys.map(k => ({ label: k, val: monthlyData[k].nightFlights })),
            { label: 'ממוצע חודשי', val: `${monthlyAvg.nightFlights.toFixed(1)}` }
          ]
        },
        {
          name: 'טיסות יום (חודש)', value: currentMonthData.dayFlights,
          score: scoreMonthly(currentMonthData.dayFlights, monthlyAvg.dayFlights),
          tips: [
            ...monthKeys.map(k => ({ label: k, val: monthlyData[k].dayFlights })),
            { label: 'ממוצע חודשי', val: `${monthlyAvg.dayFlights.toFixed(1)}` }
          ]
        }
      ]
    }
  ];

  // Calculate category scores and overall
  categories.forEach(cat => {
    cat.score = cat.metrics.reduce((s, m) => s + m.score, 0) / cat.metrics.length;
  });

  // Cache scores globally so updateStats() can show rating badges on stat cards
  window._lastRatingScores = {};
  categories.forEach(cat => { window._lastRatingScores[cat.name] = cat.score; });
  // Refresh stat card badges immediately
  const _ratingMap = { Flights:'פעילות', Passengers:'יעילות', Distance:'מוניטין', Hours:'פעילות', Profit:'רווחיות', Fuel:'יעילות' };
  Object.entries(_ratingMap).forEach(([card, cat]) => {
    const el = document.getElementById(`statBadge${card}`);
    if (el) el.textContent = window._lastRatingScores[cat] !== undefined ? `${window._lastRatingScores[cat].toFixed(1)}★` : '–';
  });

  const overall = categories.reduce((s, cat) => s + cat.score * cat.weight, 0);

  // Overall label
  let overallLabel = 'חברת תעופה מתחילה';
  if (overall >= 4.5) overallLabel = 'חברת תעופה מצטיינת';
  else if (overall >= 3.5) overallLabel = 'חברת תעופה מצוינת';
  else if (overall >= 2.5) overallLabel = 'חברת תעופה טובה';
  else if (overall >= 1.5) overallLabel = 'חברת תעופה מתפתחת';

  // === RENDER OVERALL ===
  document.getElementById('ratingGaugeScore').textContent = overall.toFixed(1);
  document.getElementById('ratingGaugeStars').innerHTML = starsHTML(overall, 28);
  document.getElementById('ratingGaugeLabel').textContent = overallLabel;

  // === RENDER CATEGORIES ===
  document.getElementById('ratingCategoriesGrid').innerHTML = categories.map(cat => `
    <div class="rating-category-card">
      <div class="rating-category-emoji">${cat.emoji}</div>
      <div class="rating-category-name">${cat.name}</div>
      <div class="rating-category-score">${cat.score.toFixed(1)}</div>
      <div class="rating-category-stars">${starsHTML(cat.score)}</div>
      <div class="rating-category-bar">
        <div class="rating-category-bar-fill" style="width:${(cat.score/5)*100}%;background:${barColor(cat.score)}"></div>
      </div>
    </div>
  `).join('');

  // === RENDER DETAILS TABLE ===
  // Store tooltip data globally for hover handler
  window._metricTips = {};
  let detailsHTML = '';
  let metricId = 0;
  categories.forEach(cat => {
    detailsHTML += `<div style="margin-top:12px;margin-bottom:6px;font-weight:700;color:var(--text-primary)">${cat.emoji} ${cat.name} <span style="float:left;color:var(--accent)">${cat.score.toFixed(1)}/5</span></div>`;
    cat.metrics.forEach(m => {
      const mid = `mt_${metricId++}`;
      window._metricTips[mid] = { name: m.name, tips: m.tips || [] };
      detailsHTML += `
        <div class="rating-detail-row" id="${mid}" onmouseenter="showMetricTip(event,'${mid}')" onmouseleave="hideMetricTip()" onmousemove="moveMetricTip(event)">
          <span class="rating-detail-name">${m.name}</span>
          <span class="rating-detail-value">${m.value}</span>
          <span class="rating-detail-score ${scoreClass(m.score)}">${m.score.toFixed(1)}</span>
        </div>`;
    });
  });
  document.getElementById('ratingDetailsTable').innerHTML = detailsHTML;

  // === RENDER TIPS ===
  const sorted = [...categories].sort((a, b) => a.score - b.score);
  const tips = [];

  const tipMap = {
    'בטיחות': [
      { cond: avgFPM > 300, text: 'ה-FPM הממוצע גבוה מדי (300+) - שפרו את איכות הנחיתות, יש לירוד בצורה הדרגתית יותר' },
      { cond: avgFPM > 150 && avgFPM <= 300, text: `ה-FPM הממוצע בטווח בינוני (${avgFPM.toFixed(0)}) - כוונו ל-150 ומטה לנחיתות אופטימליות` },
      { cond: flights.reduce((s, f) => s + (f.costIndex || 0), 0) / flights.length > 350, text: 'Cost Index גבוה - זה גורם לחץ בטיסה, נסו להקטין את ה-CI' },
      { cond: flights.some(f => (f.windSpeed || 0) > 30 || (f.ceiling || 5000) < 1000), text: 'טיסות בתנאים קשים - רוח חזקה או ceiling נמוך דורשים בטיחות מוגברת' }
    ],
    'רווחיות': [
      { cond: avgProfit < 15000, text: 'העלו את הרווח הממוצע - שקלו הגדלת מחירי כרטיסים או בחירת מסלולים ארוכים יותר' },
      { cond: profitPerHour < 5000, text: 'שפרו רווח לשעת טיסה - מסלולים ארוכים בדרך כלל רווחיים יותר ליחידת זמן' }
    ],
    'יעילות': [
      { cond: fuelPerNM > 5, text: 'צמצמו צריכת דלק - בדקו תכנון מסלולים יעיל יותר' },
      { cond: avgPax / actualCapacity.pax < 0.6, text: `הגדילו ניצול נוסעים - יעד: 80%+ מהקיבולת (${Math.round(actualCapacity.pax * 0.8)} נוסעים)` },
      { cond: avgPayload / actualCapacity.cargo < 0.4, text: `הגדילו ניצול מטען - יעד: 60%+ מהקיבולת (${Math.round(actualCapacity.cargo * 0.6)}ק"ג)` }
    ],
    'מוניטין': [
      { cond: uniqueDests < 10, text: 'הרחיבו את רשת היעדים - טוסו ליעדים חדשים לשיפור המוניטין' },
      { cond: completedCount < 3, text: 'השלימו משימות מיוחדות לחיזוק המוניטין של החברה' }
    ],
    'פעילות': [
      { cond: totalFlights < 20, text: 'הגדילו את תדירות הטיסות - כל טיסה משפרת את הדירוג' },
      { cond: totalHours < 50, text: 'צברו עוד שעות טיסה - זה ישפר גם את הדרגה שלכם' }
    ]
  };

  // Show tips for the 2 weakest categories
  for (let i = 0; i < Math.min(2, sorted.length); i++) {
    const cat = sorted[i];
    if (cat.score >= 4.5) continue;
    const catTips = tipMap[cat.name] || [];
    catTips.forEach(tip => {
      if (tip.cond && tips.length < 4) {
        tips.push({ emoji: cat.emoji, text: tip.text });
      }
    });
  }

  if (tips.length === 0) {
    tips.push({ emoji: '🏆', text: 'מצוין! חברת התעופה שלך בביצועים מעולים בכל התחומים' });
  }

  document.getElementById('ratingTips').innerHTML = tips.map(tip => `
    <div class="rating-tip">
      <span class="rating-tip-icon">${tip.emoji}</span>
      <span class="rating-tip-text">${tip.text}</span>
    </div>
  `).join('');

  // === RENDER CHARTS ===
  renderRatingCharts(categories);
}

// Chart instances for cleanup
let ratingRadarChartInstance = null;
let ratingBarChartInstance = null;
let ratingMetricsChartInstance = null;

// ===== METRIC TOOLTIP =====
let _metricTipHideTimer = null;

function showMetricTip(event, mid) {
  clearTimeout(_metricTipHideTimer);
  const data = window._metricTips?.[mid];
  if (!data || !data.tips.length) return;
  const el = document.getElementById('metricTooltip');

  // Sort tips chronologically if they have date-like labels (keep as-is for non-flight tips)
  const sorted = [...data.tips];

  el.innerHTML = `
    <div class="mtt-title">${data.name} <span style="font-weight:400;color:var(--text-muted)">(${sorted.length})</span></div>
    ${sorted.map(t => `<div class="mtt-row"><span>${t.label}</span><span>${t.val}</span></div>`).join('')}
  `;
  el.style.display = 'block';

  // Pin tooltip position to where it appeared (don't follow mouse so user can scroll)
  const x = event.clientX + 16;
  const y = event.clientY - 10;
  el.style.left = `${Math.min(x, window.innerWidth - el.offsetWidth - 10)}px`;
  el.style.top = `${Math.min(y, window.innerHeight - el.offsetHeight - 10)}px`;

  // Allow moving into tooltip without hiding
  el.onmouseenter = () => clearTimeout(_metricTipHideTimer);
  el.onmouseleave = () => { _metricTipHideTimer = setTimeout(hideMetricTip, 150); };
}

function moveMetricTip() { /* position is fixed on show */ }

function hideMetricTip() {
  _metricTipHideTimer = setTimeout(() => {
    document.getElementById('metricTooltip').style.display = 'none';
  }, 150);
}

function renderRatingCharts(categories) {
  const isDark = document.body.classList.contains('dark');
  const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const textColor = isDark ? '#94a3b8' : '#64748b';

  // Destroy previous instances
  if (ratingRadarChartInstance) ratingRadarChartInstance.destroy();
  if (ratingBarChartInstance) ratingBarChartInstance.destroy();
  if (ratingMetricsChartInstance) ratingMetricsChartInstance.destroy();

  // === 1. RADAR CHART ===
  const radarCtx = document.getElementById('ratingRadarChart');
  if (radarCtx) {
    ratingRadarChartInstance = new Chart(radarCtx, {
      type: 'radar',
      data: {
        labels: categories.map(c => c.emoji + ' ' + c.name),
        datasets: [{
          label: 'ציון',
          data: categories.map(c => c.score),
          backgroundColor: 'rgba(59,130,246,0.2)',
          borderColor: '#3b82f6',
          borderWidth: 2,
          pointBackgroundColor: '#3b82f6',
          pointBorderColor: '#fff',
          pointRadius: 5,
          pointHoverRadius: 7
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
          r: {
            min: 0,
            max: 5,
            ticks: { stepSize: 1, color: textColor, backdropColor: 'transparent', font: { size: 11 } },
            grid: { color: gridColor },
            angleLines: { color: gridColor },
            pointLabels: { color: textColor, font: { size: 12, weight: '600' } }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => `${ctx.parsed.r.toFixed(1)} / 5.0`
            }
          }
        }
      }
    });
  }

  // === 2. BAR CHART ===
  const barCtx = document.getElementById('ratingBarChart');
  if (barCtx) {
    const colors = categories.map(c => barColor(c.score));
    ratingBarChartInstance = new Chart(barCtx, {
      type: 'bar',
      data: {
        labels: categories.map(c => c.name),
        datasets: [{
          label: 'ציון',
          data: categories.map(c => c.score),
          backgroundColor: colors.map(c => c + '80'),
          borderColor: colors,
          borderWidth: 2,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        indexAxis: 'y',
        scales: {
          x: { min: 0, max: 5, ticks: { stepSize: 1, color: textColor }, grid: { color: gridColor } },
          y: { ticks: { color: textColor, font: { size: 12, weight: '600' } }, grid: { display: false } }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => `${ctx.parsed.x.toFixed(1)} / 5.0`
            }
          }
        }
      }
    });
  }

  // === 3. METRICS CHART - all individual metrics ===
  const metricsCtx = document.getElementById('ratingMetricsChart');
  if (metricsCtx) {
    const allMetrics = [];
    categories.forEach(cat => {
      cat.metrics.forEach(m => {
        allMetrics.push({ name: m.name, score: m.score, cat: cat.name });
      });
    });

    const metricColors = allMetrics.map(m => barColor(m.score));
    ratingMetricsChartInstance = new Chart(metricsCtx, {
      type: 'bar',
      data: {
        labels: allMetrics.map(m => m.name),
        datasets: [{
          label: 'ציון',
          data: allMetrics.map(m => m.score),
          backgroundColor: metricColors.map(c => c + '60'),
          borderColor: metricColors,
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
          y: { min: 0, max: 5, ticks: { stepSize: 1, color: textColor }, grid: { color: gridColor } },
          x: { ticks: { color: textColor, font: { size: 10 }, maxRotation: 45 }, grid: { display: false } }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: ctx => allMetrics[ctx[0].dataIndex].cat + ' > ' + ctx[0].label,
              label: ctx => `${ctx.parsed.y.toFixed(1)} / 5.0`
            }
          }
        }
      }
    });
  }
}

// ===== SMART NOTIFICATIONS =====
function showSmartNotification(type, title, message, duration = 4000) {
  const container = document.getElementById('notificationsContainer');
  const notificationId = `notif-${Date.now()}`;

  // Map types to emoji and colors
  const typeConfig = {
    success: { icon: '✅', title: title || 'הצליח!' },
    error: { icon: '❌', title: title || 'שגיאה' },
    warning: { icon: '⚠️', title: title || 'אזהרה' },
    info: { icon: 'ℹ️', title: title || 'מידע' },
    achievement: { icon: '🏆', title: title || 'הישג חדש!' },
    milestone: { icon: '🎉', title: title || 'ציון דרך!' },
    rank: { icon: '🎖️', title: title || 'קידום דרגה!' }
  };

  const config = typeConfig[type] || typeConfig.info;

  const notification = document.createElement('div');
  notification.id = notificationId;
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <div class="notification-icon">${config.icon}</div>
    <div class="notification-content">
      <div class="notification-title">${config.title}</div>
      <div class="notification-message">${message}</div>
    </div>
    <button class="notification-close" onclick="closeNotification('${notificationId}')">✕</button>
  `;

  container.appendChild(notification);

  // Auto-close after duration
  if (duration > 0) {
    setTimeout(() => closeNotification(notificationId), duration);
  }
}

function closeNotification(notificationId) {
  const notif = document.getElementById(notificationId);
  if (!notif) return;

  notif.classList.add('closing');
  setTimeout(() => {
    notif.remove();
  }, 300);
}

// Convenience functions
function showToastSuccess(message, title = null) {
  showSmartNotification('success', title, message, 3000);
}

function showToastError(message, title = null) {
  showSmartNotification('error', title, message, 4000);
}

function showToastWarning(message, title = null) {
  showSmartNotification('warning', title, message, 4000);
}

function showToastInfo(message, title = null) {
  showSmartNotification('info', title, message, 3000);
}

// ===== BOARDING PASS =====
function openBoardingPassModal(flightId) {
  const flight = flights.find(f => f.id === flightId);
  if (!flight) return;

  // Format date
  const flightDate = new Date(flight.date);
  const dateStr = flightDate.toLocaleDateString('he-IL', { month: '2-digit', day: '2-digit', year: '2-digit' });
  const timeStr = flightDate.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  const confirmationNum = flightId.substring(0, 8).toUpperCase();

  // Render boarding pass
  const boardingPassHTML = `
    <div class="boarding-pass-header">
      <div class="boarding-pass-airline">✈️ SMART LOGBOOK</div>
      <div class="boarding-pass-subtitle">BOARDING PASS</div>
    </div>

    <div class="boarding-pass-route">
      <div style="text-align: center;">
        <div class="boarding-pass-label">From</div>
        <div class="boarding-pass-airport">${flight.origin}</div>
      </div>
      <div class="boarding-pass-arrow">→</div>
      <div style="text-align: center;">
        <div class="boarding-pass-label">To</div>
        <div class="boarding-pass-airport">${flight.destination}</div>
      </div>
    </div>

    <div class="boarding-pass-row">
      <div class="boarding-pass-field">
        <div class="boarding-pass-label">Confirmation</div>
        <div class="boarding-pass-value">${confirmationNum}</div>
      </div>
      <div class="boarding-pass-field">
        <div class="boarding-pass-label">Date</div>
        <div class="boarding-pass-value">${dateStr}</div>
      </div>
    </div>

    <div class="boarding-pass-row">
      <div class="boarding-pass-field">
        <div class="boarding-pass-label">Aircraft</div>
        <div class="boarding-pass-value">${flight.aircraft}</div>
      </div>
      <div class="boarding-pass-field">
        <div class="boarding-pass-label">Duration</div>
        <div class="boarding-pass-value">${flight.duration}</div>
      </div>
    </div>

    <div class="boarding-pass-details">
      <div class="boarding-pass-info-grid">
        <div class="boarding-pass-info-item">
          <div class="boarding-pass-label">Passengers</div>
          <div style="font-size: 16px; font-weight: 700; color: var(--text-primary);">${flight.passengers}</div>
        </div>
        <div class="boarding-pass-info-item">
          <div class="boarding-pass-label">Profit</div>
          <div style="font-size: 16px; font-weight: 700; color: var(--green);">$${flight.profit.toLocaleString()}</div>
        </div>
        <div class="boarding-pass-info-item">
          <div class="boarding-pass-label">Distance</div>
          <div style="font-size: 16px; font-weight: 700; color: var(--text-primary);">${flight.distance} NM</div>
        </div>
        <div class="boarding-pass-info-item">
          <div class="boarding-pass-label">Fuel</div>
          <div style="font-size: 16px; font-weight: 700; color: var(--text-primary);">${flight.fuel} kg</div>
        </div>
      </div>
    </div>

    <div class="boarding-pass-barcode">
      ║ ${confirmationNum} ║
    </div>
  `;

  document.getElementById('boardingPassContainer').innerHTML = boardingPassHTML;
  document.getElementById('boardingPassModal').style.display = 'flex';

  // Store current flight for export
  window.currentBoardingPassFlight = flight;
}

function downloadBoardingPass() {
  if (!window.currentBoardingPassFlight) return;

  const flight = window.currentBoardingPassFlight;
  const boardingPassElement = document.getElementById('boardingPassContainer');

  // Use html2canvas if available, otherwise fallback to Canvas API
  if (typeof html2canvas !== 'undefined') {
    html2canvas(boardingPassElement, {
      backgroundColor: '#0f172a',
      scale: 2
    }).then(canvas => {
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `boarding-pass-${flight.id}.png`;
      link.click();
    });
  } else {
    // Fallback: simple alert
    showToast('💾 להורדה, אנא השתמש בחץ ימני > Save as...', 'info');
  }
}

function shareBoardingPass() {
  if (!window.currentBoardingPassFlight) return;

  const flight = window.currentBoardingPassFlight;
  const shareText = `✈️ טסתי מ-${flight.origin} ל-${flight.destination} עם ${flight.aircraft}! 🎉 רווח: $${flight.profit.toLocaleString()}`;

  if (navigator.share) {
    navigator.share({
      title: 'Smart Logbook Flight',
      text: shareText
    }).catch(err => console.log('Share failed:', err));
  } else {
    // Fallback: copy to clipboard
    navigator.clipboard.writeText(shareText).then(() => {
      showToast('✅ הטקסט הועתק ללוח', 'success');
    });
  }
}

// ===== AUTO-UPDATE PRICING =====
async function updateDynamicPricing() {
  try {
    const response = await fetch('/api/pricing/update', { method: 'POST' });
    const data = await response.json();
    if (data.success && selectedPricingDays) {
      loadPricingHistory(selectedPricingDays);
    }
  } catch (err) {
    console.log('[Pricing Auto-Update] Skipped (DB not available)');
  }
}

// ===== FUEL EFFICIENCY CALCULATION =====
// Score occupancy based on percentage
function scoreOccupancy(occupancyPercent) {
  if (occupancyPercent < 40) return 1;
  if (occupancyPercent < 60) return 2;
  if (occupancyPercent < 75) return 3;
  if (occupancyPercent < 90) return 4;
  return 5;
}

// Score Flight Level
function scoreFlightLevel(flightLevel) {
  if (flightLevel < 180) return 2;
  if (flightLevel < 300) return 2;
  if (flightLevel < 340) return 3;
  if (flightLevel < 370) return 5; // 340-370 = optimal
  if (flightLevel < 390) return 4;
  return 3; // >390
}

// Score Cost Index
function scoreCostIndex(costIndex) {
  if (costIndex < 10) return 3; // חסכוני אבל איטי
  if (costIndex < 30) return 5; // אופטימלי
  if (costIndex < 60) return 4;
  if (costIndex < 100) return 3;
  return 1; // יקר מאוד
}

// Calculate fuel efficiency score for a single flight
function calculateFuelEfficiency(flight) {
  // Default score if missing data
  if (!flight) return 3;

  // 1. Occupancy Score (Passengers)
  const maxPax = flight.aircraft_max_passengers || 189;
  const occupancyPercent = maxPax > 0 ? (flight.passengers || 0) / maxPax * 100 : 50;
  const occupancyScore = scoreOccupancy(occupancyPercent);

  // 2. Cargo Score
  const maxCargo = flight.aircraft_max_cargo || 20468;
  const cargoPercent = maxCargo > 0 ? (flight.payload || 0) / maxCargo * 100 : 50;
  const cargoScore = scoreOccupancy(cargoPercent); // Use same scale as occupancy

  // 3. Flight Level Score
  const flightLevelNumber = (flight.cruiseAltitude || 35000) / 100; // Convert feet to FL
  const flScore = scoreFlightLevel(flightLevelNumber);

  // 4. Cost Index Score
  const ciScore = scoreCostIndex(flight.costIndex || 75);

  // Return average of all 4 scores
  return (occupancyScore + cargoScore + flScore + ciScore) / 4;
}

// Calculate average fuel efficiency across all flights
function calculateAvgFuelEfficiency() {
  if (!flights || flights.length === 0) return 3; // Default if no flights

  const efficiencies = flights
    .filter(f => f && f.aircraft_max_passengers)
    .map(f => calculateFuelEfficiency(f));

  if (efficiencies.length === 0) return 3; // Default if no valid data

  // Return average efficiency score
  return efficiencies.reduce((a, b) => a + b, 0) / efficiencies.length;
}

// Auto-update pricing every hour
setInterval(updateDynamicPricing, 60 * 60 * 1000);

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
