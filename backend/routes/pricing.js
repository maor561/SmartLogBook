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

// POST - Update dynamic pricing from AviationStack API
router.post('/update', async (req, res) => {
  try {
    const apiKey = process.env.AVIATION_STACK_API_KEY;
    let aviationData = null;
    let source = 'default';

    // Try to fetch from AviationStack API if key is available
    if (apiKey) {
      try {
        console.log('[Pricing] Attempting to fetch from AviationStack API...');
        const response = await fetch(
          `https://api.aviationstack.com/v1/prices?access_key=${apiKey}`,
          { timeout: 10000 }
        );

        if (response.ok) {
          aviationData = await response.json();
          source = 'AviationStack';
          console.log('[Pricing] Successfully fetched from AviationStack');
        } else {
          console.warn('[Pricing] AviationStack API error:', response.status);
        }
      } catch (apiErr) {
        console.warn('[Pricing] AviationStack API failed:', apiErr.message);
      }
    } else {
      console.warn('[Pricing] AVIATION_STACK_API_KEY not configured, using defaults');
    }

    // Get last record for variation (fallback method)
    const db = await getDb();
    const last = db ? await db.collection('pricing_history')
      .findOne({}, { sort: { recorded_at: -1 } }) : null;

    // Extract pricing from AviationStack or use variation method
    let update;
    if (aviationData?.data) {
      update = {
        fuel_cost:      parseFloat(aviationData.data.fuel_price || 0.85),
        cost_index:     parseInt(aviationData.data.cost_index || 50),
        ticket_base:    parseInt(aviationData.data.ticket_price_short || 95),
        ticket_medium:  parseInt(aviationData.data.ticket_price_medium || 180),
        ticket_long:    parseInt(aviationData.data.ticket_price_long || 320),
        landing_small:  parseInt(aviationData.data.landing_fee_small || 25),
        landing_medium: parseInt(aviationData.data.landing_fee || 45),
        landing_large:  parseInt(aviationData.data.landing_fee_large || 85),
        recorded_at:    new Date(),
        source:         'AviationStack'
      };
    } else {
      // Fallback: use variation method like before
      const vary = (base, pct = 0.05) => {
        const change = base * pct * (Math.random() * 2 - 1);
        return Math.round((base + change) * 100) / 100;
      };

      update = {
        fuel_cost:      vary(last?.fuel_cost || 0.85),
        cost_index:     Math.round(vary(last?.cost_index || 50, 0.08)),
        ticket_base:    Math.round(vary(last?.ticket_base || 95)),
        ticket_medium:  Math.round(vary(last?.ticket_medium || 180)),
        ticket_long:    Math.round(vary(last?.ticket_long || 320)),
        landing_small:  Math.round(vary(last?.landing_small || 25)),
        landing_medium: Math.round(vary(last?.landing_medium || 45)),
        landing_large:  Math.round(vary(last?.landing_large || 85)),
        recorded_at:    new Date(),
        source:         'simulated'
      };
    }

    // Save to database if available
    if (db) {
      await db.collection('pricing_history').insertOne(update);
    }

    // Convert response to camelCase for frontend compatibility
    const camelCaseUpdate = {
      fuelCost: update.fuel_cost,
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
