import express from 'express';
import getDb from '../db.js';

const router = express.Router();

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

// POST - Update dynamic pricing using EIA real fuel + distance-based cargo
router.post('/update', async (req, res) => {
  try {
    let realFuelCost = null;
    let cargoPricePerKg = null;
    let source = 'simulated';
    const distance = parseInt(req.body?.distance) || 1000; // Default to 1000nm if not provided

    // Try to fetch real Jet Fuel price from EIA
    try {
      realFuelCost = await fetchEIAFuelPrice();
      source = 'EIA';
    } catch (eiaErr) {
      console.warn('[Pricing] EIA API failed, using fallback:', eiaErr.message);
    }

    // Calculate cargo price based on distance & seasonality (no API needed)
    cargoPricePerKg = calculateCargoPrice(distance);

    // Get last record for ticket/landing variation (no real API for those)
    const db = await getDb();
    const last = db ? await db.collection('pricing_history')
      .findOne({}, { sort: { recorded_at: -1 } }) : null;

    // Small ±3% variation for ticket/landing fees (market fluctuation simulation)
    const vary = (base, pct = 0.03) => {
      const change = base * pct * (Math.random() * 2 - 1);
      return Math.round((base + change) * 100) / 100;
    };

    const update = {
      // Real fuel price from EIA, or fallback with variation
      fuel_cost:      realFuelCost || vary(last?.fuel_cost || 0.85),
      cost_index:     Math.round(vary(last?.cost_index || 50, 0.05)),
      // Cargo price: distance-based calculation with seasonal variation
      cargo_rate:     cargoPricePerKg,
      // Ticket prices: simulated variation based on last known values
      ticket_base:    Math.round(vary(last?.ticket_base || 95)),
      ticket_medium:  Math.round(vary(last?.ticket_medium || 180)),
      ticket_long:    Math.round(vary(last?.ticket_long || 320)),
      // Landing fees: simulated variation based on last known values
      landing_small:  Math.round(vary(last?.landing_small || 25)),
      landing_medium: Math.round(vary(last?.landing_medium || 45)),
      landing_large:  Math.round(vary(last?.landing_large || 85)),
      recorded_at:    new Date(),
      source
    };

    // Save to database if available
    if (db) {
      await db.collection('pricing_history').insertOne(update);
    }

    // Convert response to camelCase for frontend compatibility
    const camelCaseUpdate = {
      fuelCost: update.fuel_cost,
      cargoRate: update.cargo_rate,
      costIndex: update.cost_index,
      ticketBase: update.ticket_base,
      ticketMedium: update.ticket_medium,
      ticketLong: update.ticket_long,
      landingSmall: update.landing_small,
      landingMedium: update.landing_medium,
      landingLarge: update.landing_large,
      timestamp: update.recorded_at.toISOString(),
      source: update.source
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
