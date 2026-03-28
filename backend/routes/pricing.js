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
      .sort({ recorded_at: -1 })
      .toArray();

    console.log(`[Pricing History] Found ${history.length} records for last ${days} days`);
    res.json({ history });
  } catch (err) {
    console.error('[Pricing History Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// GET pricing history debug - all records
router.get('/history/debug/all', async (req, res) => {
  try {
    const db = await getDb();
    const all = await db.collection('pricing_history').find({}).sort({ recorded_at: -1 }).limit(5).toArray();
    const count = await db.collection('pricing_history').countDocuments();
    res.json({ total: count, latest: all });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST - Update dynamic pricing
router.post('/update', async (req, res) => {
  try {
    const db = await getDb();

    // Get last record for realistic variation
    const last = await db.collection('pricing_history')
      .findOne({}, { sort: { recorded_at: -1 } });

    const vary = (base, pct = 0.05) => {
      const change = base * pct * (Math.random() * 2 - 1);
      return Math.round((base + change) * 100) / 100;
    };

    const update = {
      fuel_cost:      vary(last?.fuel_cost || 0.85),
      cost_index:     Math.round(vary(last?.cost_index || 50, 0.08)),
      ticket_base:    Math.round(vary(last?.ticket_base || 95)),
      ticket_medium:  Math.round(vary(last?.ticket_medium || 180)),
      ticket_long:    Math.round(vary(last?.ticket_long || 320)),
      landing_small:  Math.round(vary(last?.landing_small || 25)),
      landing_medium: Math.round(vary(last?.landing_medium || 45)),
      landing_large:  Math.round(vary(last?.landing_large || 85)),
      recorded_at:    new Date()
    };

    await db.collection('pricing_history').insertOne(update);

    res.json({
      success: true,
      message: 'Pricing updated',
      update: { ...update, timestamp: update.recorded_at.toISOString() }
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
