import express from 'express';
import getDb from '../db.js';

const router = express.Router();

// ===== TRAVELPORT TRIPSERVICES - TICKET PRICING =====
let _tpToken = null;
let _tpTokenExpiry = 0;

async function getTravelportToken() {
  if (_tpToken && Date.now() < _tpTokenExpiry) return _tpToken;

  const clientId     = process.env.TRAVELPORT_CLIENT_ID;
  const clientSecret = process.env.TRAVELPORT_CLIENT_SECRET;
  const username     = process.env.TRAVELPORT_USERNAME;
  const password     = process.env.TRAVELPORT_PASSWORD;

  if (!clientId || !clientSecret) throw new Error('Travelport credentials not configured');

  console.log(`[Travelport] Auth attempt | client_id=${clientId?.slice(0,6)}... | user=${username}`);

  // Travelport OAuth: Basic Auth with CLIENT_ID:CLIENT_SECRET, production OAuth server
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const body = new URLSearchParams({ grant_type: 'client_credentials' });

  const res = await fetch('https://oauth.travelport.com/oauth/oauth20/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body,
    signal: AbortSignal.timeout(10000)
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Travelport auth failed (${res.status}): ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  _tpToken = data.access_token;
  _tpTokenExpiry = Date.now() + ((data.expires_in || 3600) - 60) * 1000;

  console.log(`[Travelport] ✅ Token acquired, expires in ${data.expires_in}s`);
  return _tpToken;
}

async function fetchTravelportTicketPrice(originIata, destIata, passengers = 1) {
  const token = await getTravelportToken();
  const pcc   = process.env.TRAVELPORT_PCC || '7K99';

  // Use a date 7 days from now for sandbox pricing
  const departureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0];

  const requestBody = {
    CatalogProductOfferingsQueryRequest: {
      CatalogProductOfferingsRequest: {
        '@type': 'CatalogProductOfferingsRequestAir',
        contentSourceList: ['GDS'],
        PassengerCriteria: [{ number: Math.min(passengers, 9), passengerTypeCode: 'ADT' }],
        SearchCriteriaFlight: [{
          departureDate,
          From: { value: originIata },
          To:   { value: destIata }
        }],
        SearchModifiersAir: { cabinPreferenceList: ['Economy'] }
      }
    }
  };

  const res = await fetch(
    'https://api.pp.travelport.net/11/air/catalog/search/catalogproductofferings',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json',
        'Accept':        'application/json',
        'PCC':           pcc
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(20000)
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Travelport search failed (${res.status}): ${err.slice(0, 300)}`);
  }

  const data = await res.json();

  // Parse response - extract cheapest economy price per passenger
  const offerings = data?.CatalogProductOfferingsResponse?.CatalogProductOfferings
    ?.CatalogProductOffering || [];

  if (!offerings.length) throw new Error(`No offers found for ${originIata}→${destIata}`);

  // Collect all per-passenger prices
  const prices = [];
  for (const offering of offerings) {
    const products = offering.CatalogProductOffering?.Product || [];
    for (const product of products) {
      const price = product?.Price?.TotalPrice || product?.Price?.Base;
      if (price && price > 0) {
        const perPax = Math.round(price / Math.max(passengers, 1));
        prices.push(perPax);
      }
    }
  }

  if (!prices.length) throw new Error('No prices in Travelport response');

  const cheapest = Math.min(...prices);
  console.log(`[Travelport] ✅ ${originIata}→${destIata} | Cheapest: $${cheapest}/pax (${prices.length} offers)`);
  return cheapest;
}

// GET pricing history
router.get('/history', async (req, res) => {
  try {
    const db = await getDb();
    const days = parseInt(req.query.days) || 30;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const history = await db.collection('pricing_history')
      .find({ recorded_at: { $gte: since } })
      .sort({ recorded_at: 1 })
      .toArray();

    console.log(`[Pricing History] Found ${history.length} records for last ${days} days`);
    res.json({ history });
  } catch (err) {
    console.error('[Pricing History Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /history/seed - Generate sample historical data
router.post('/history/seed', async (req, res) => {
  try {
    const db = await getDb();

    // Clear old data
    await db.collection('pricing_history').deleteMany({});

    const records = [];
    const now = new Date();
    let fuel = 0.82, ci = 48, tb = 90, tm = 170, tl = 310, ls = 22, lm = 42, ll = 80;

    const vary = (val, pct = 0.03) => {
      const change = val * pct * (Math.random() * 2 - 1);
      return Math.round((val + change) * 100) / 100;
    };

    // Generate 90 days of daily data
    for (let i = 90; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(12, 0, 0, 0);

      fuel = vary(fuel); ci = Math.round(vary(ci, 0.04));
      tb = Math.round(vary(tb)); tm = Math.round(vary(tm)); tl = Math.round(vary(tl));
      ls = Math.round(vary(ls)); lm = Math.round(vary(lm)); ll = Math.round(vary(ll));

      records.push({
        fuel_cost: fuel, cost_index: ci,
        ticket_base: tb, ticket_medium: tm, ticket_long: tl,
        landing_small: ls, landing_medium: lm, landing_large: ll,
        recorded_at: date
      });
    }

    await db.collection('pricing_history').insertMany(records);
    res.json({ success: true, inserted: records.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch real Jet Fuel price from EIA (U.S. Energy Information Administration)
async function fetchEIAFuelPrice() {
  const eiaKey = process.env.EIA_API_KEY || 'DEMO_KEY';
  const url = `https://api.eia.gov/v2/petroleum/pri/spt/data/?api_key=${eiaKey}&frequency=weekly&data[]=value&facets[product][]=EPJK&sort[0][column]=period&sort[0][direction]=desc&length=1`;

  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`EIA API error: ${response.status}`);

  const json = await response.json();
  const pricePerGallon = parseFloat(json?.response?.data?.[0]?.value);
  if (!pricePerGallon || isNaN(pricePerGallon)) throw new Error('EIA: no price data');

  // Convert $/gallon → $/kg (1 gallon Jet-A ≈ 3.04 kg)
  const pricePerKg = Math.round((pricePerGallon / 3.04) * 100) / 100;
  const period = json?.response?.data?.[0]?.period || 'unknown';

  console.log(`[EIA] Jet Fuel: $${pricePerGallon}/gal → $${pricePerKg}/kg (period: ${period})`);
  return pricePerKg;
}

// Calculate cargo price based on distance and seasonality (no API needed)
function calculateCargoPrice(distance = 1000) {
  // Base price: $4/kg for medium haul
  let basePrice = 4.0;

  // Distance-based premium
  if (distance > 3000) {
    basePrice = 6.0;  // Long haul: $6/kg
  } else if (distance > 1500) {
    basePrice = 5.0;  // Medium-long: $5/kg
  } else if (distance < 500) {
    basePrice = 3.5;  // Short haul: $3.50/kg
  }

  // Seasonal variation (higher in summer/holidays)
  const now = new Date();
  const month = now.getMonth(); // 0-11
  const isSummer = month >= 5 && month <= 8; // June-September
  const isHoliday = month === 11; // December

  let multiplier = 1.0;
  if (isHoliday) multiplier = 1.25;  // +25% in December
  else if (isSummer) multiplier = 1.15; // +15% in summer
  else multiplier = 0.95; // -5% in off-season

  const finalPrice = Math.round(basePrice * multiplier * 100) / 100;

  console.log(`[Cargo] Distance: ${distance}nm | Base: $${basePrice}/kg | Season: ${multiplier}x | Final: $${finalPrice}/kg`);
  return finalPrice;
}

// Calculate crew requirement based on aircraft size
function getCrewRequirements(aircraft = 'B738') {
  // Crew: 2 pilots + flight attendants based on aircraft seating capacity
  const maxSeats = {
    'B738': 189,
    'B737': 189,
    'B739': 210,    // MAX variant
    'B744': 416,    // 747
    'B777': 350,    // 777
    'B787': 280,    // 787
    'A320': 194,
    'A321': 236,    // Stretched A320
    'A380': 555,    // A380
    'A350': 315,
  };

  const seats = maxSeats[aircraft] || 189;

  // Flight attendants: ~1 per 50 passengers + 1 leader
  const flightAttendants = Math.max(2, Math.ceil(seats / 50));

  return {
    captains: 1,
    firstOfficers: 1,
    flightAttendants: flightAttendants
  };
}

// Calculate maintenance & crew cost based on aircraft type, flight hours, and payload
function calculateMaintenanceCost(aircraft = 'B738', durationHours = 1, payloadKg = 0) {
  // Base hourly maintenance cost by aircraft type (industry standard ranges)
  const baseCosts = {
    'B738': 3000,    // 737-800 standard
    'B737': 3000,
    'B739': 3200,    // 737 MAX
    'B744': 5500,    // 747 jumbo
    'B777': 5000,    // 777
    'B787': 4800,    // 787 Dreamliner
    'A320': 3300,    // Airbus A320
    'A321': 3500,    // A321 stretched
    'A380': 6500,    // A380 super jumbo
    'A350': 5200,    // A350
  };

  let baseCost = baseCosts[aircraft] || 3000; // Default to 737 cost if unknown

  // Payload multiplier: heavier loads cause more wear on hydraulics, engines, tires
  // Max typical payloads: 737=23,000kg, 777=140,000kg, A380=150,000kg
  const aircraftMaxPayload = {
    'B738': 23000,
    'B737': 23000,
    'B739': 25000,
    'B744': 140000,
    'B777': 140000,
    'B787': 130000,
    'A320': 27000,
    'A321': 32000,
    'A380': 150000,
    'A350': 130000,
  };

  const maxPayload = aircraftMaxPayload[aircraft] || 25000;
  const payloadPercent = Math.min(payloadKg / maxPayload, 1.0); // Cap at 100%

  // Maintenance scales with payload: 0% payload = 1.0x cost, 100% payload = 1.15x cost
  const payloadMultiplier = 1.0 + (payloadPercent * 0.15);
  const maintenanceCost = baseCost * durationHours * payloadMultiplier;

  // === CREW COST ===
  // Pilots: Captain $200/hr, First Officer $120/hr
  // Flight Attendants: $35/hr each
  const crew = getCrewRequirements(aircraft);
  const captainCost = 200 * durationHours * crew.captains;
  const firstOfficerCost = 120 * durationHours * crew.firstOfficers;
  const flightAttendantCost = 35 * durationHours * crew.flightAttendants;
  const totalCrewCost = captainCost + firstOfficerCost + flightAttendantCost;

  const finalCost = Math.round(maintenanceCost + totalCrewCost);

  console.log(`[Maintenance] Aircraft: ${aircraft} | Maint: $${Math.round(maintenanceCost)} | Crew: $${Math.round(totalCrewCost)} (${crew.captains}C + ${crew.firstOfficers}F/O + ${crew.flightAttendants}FA × ${durationHours.toFixed(1)}h) | Total: $${finalCost}`);
  return finalCost;
}

// POST - Update dynamic pricing using EIA real fuel + distance-based cargo + calculated maintenance
router.post('/update', async (req, res) => {
  try {
    let realFuelCost = null;
    let cargoPricePerKg = null;
    let maintenanceCostTotal = null;
    let travelportTicketPrice = null;
    let ticketSource = 'formula';
    let source = 'simulated';

    const distance      = parseInt(req.body?.distance)      || 1000;
    const aircraft      = req.body?.aircraft                || 'B738';
    const durationHours = parseFloat(req.body?.durationHours) || 1;
    const payloadKg     = parseFloat(req.body?.payloadKg)   || 0;
    const passengers    = parseInt(req.body?.passengers)    || 1;
    const originIata    = req.body?.originIata              || null;  // e.g. "TLV"
    const destIata      = req.body?.destIata                || null;  // e.g. "ZRH"

    // 1. Real Jet Fuel price from EIA
    try {
      realFuelCost = await fetchEIAFuelPrice();
      source = 'EIA';
    } catch (eiaErr) {
      console.warn('[Pricing] EIA failed, using fallback:', eiaErr.message);
    }

    // 2. Cargo price (distance-based formula)
    cargoPricePerKg = calculateCargoPrice(distance);

    // 3. Maintenance + crew cost (aircraft-based formula)
    maintenanceCostTotal = calculateMaintenanceCost(aircraft, durationHours, payloadKg);

    // 4. Ticket price from Travelport TripServices (real market price)
    //    Falls back to distance-based formula if API fails or IATA codes missing
    if (originIata && destIata) {
      try {
        travelportTicketPrice = await fetchTravelportTicketPrice(originIata, destIata, passengers);
        ticketSource = 'Travelport';
      } catch (tpErr) {
        console.warn(`[Travelport] Failed for ${originIata}→${destIata}, using formula fallback:`, tpErr.message);
      }
    } else {
      console.log('[Travelport] No IATA codes provided, using formula fallback');
    }

    // Fallback ticket prices (distance-based formula)
    const ticketFallback = (dist) => {
      if (dist <= 500)  return 95  + Math.round(dist * 0.05);   // Short haul
      if (dist <= 2000) return 150 + Math.round(dist * 0.08);   // Medium haul
      return 250 + Math.round(dist * 0.07);                      // Long haul
    };
    const fallbackTicketPrice = ticketFallback(distance);

    // Get last record for landing fee variation
    const db = await getDb();
    const last = db ? await db.collection('pricing_history')
      .findOne({}, { sort: { recorded_at: -1 } }) : null;

    const vary = (base, pct = 0.03) => {
      const change = base * pct * (Math.random() * 2 - 1);
      return Math.round((base + change) * 100) / 100;
    };

    const update = {
      fuel_cost:        realFuelCost || vary(last?.fuel_cost || 0.85),
      cost_index:       Math.round(vary(last?.cost_index || 50, 0.05)),
      cargo_rate:       cargoPricePerKg,
      maintenance_cost: maintenanceCostTotal,
      // Ticket: use Travelport real price per pax, or fallback formula
      ticket_price:     travelportTicketPrice || fallbackTicketPrice,
      ticket_source:    ticketSource,
      // Legacy ticket tiers (kept for backward compat)
      ticket_base:      Math.round(vary(last?.ticket_base || 95)),
      ticket_medium:    Math.round(vary(last?.ticket_medium || 180)),
      ticket_long:      Math.round(vary(last?.ticket_long || 320)),
      landing_small:    Math.round(vary(last?.landing_small || 25)),
      landing_medium:   Math.round(vary(last?.landing_medium || 45)),
      landing_large:    Math.round(vary(last?.landing_large || 85)),
      recorded_at:      new Date(),
      source
    };

    if (db) await db.collection('pricing_history').insertOne(update);

    const camelCaseUpdate = {
      fuelCost:         update.fuel_cost,
      cargoRate:        update.cargo_rate,
      maintenanceCost:  update.maintenance_cost,
      ticketPrice:      update.ticket_price,       // ← Real price from Travelport or formula
      ticketSource:     update.ticket_source,      // 'Travelport' or 'formula'
      costIndex:        update.cost_index,
      ticketBase:       update.ticket_base,
      ticketMedium:     update.ticket_medium,
      ticketLong:       update.ticket_long,
      landingSmall:     update.landing_small,
      landingMedium:    update.landing_medium,
      landingLarge:     update.landing_large,
      timestamp:        update.recorded_at.toISOString(),
      source:           update.source
    };

    res.json({
      success: true,
      message: `Pricing updated from ${source}`,
      update: camelCaseUpdate
    });
  } catch (err) {
    console.error('[Pricing Update Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// POST - Record pricing history
router.post('/history', async (req, res) => {
  try {
    const db = await getDb();
    const result = await db.collection('pricing_history').insertOne({
      ...req.body,
      recorded_at: new Date()
    });

    res.json({ id: result.insertedId.toString() });
  } catch (err) {
    console.error('[Pricing History POST Error]', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
