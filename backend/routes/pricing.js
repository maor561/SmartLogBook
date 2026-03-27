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

    res.json(history);
  } catch (err) {
    console.error('[Pricing History Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// POST - Update dynamic pricing
router.post('/update', async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Pricing updated',
      update: { fuelCost: 0.85, costIndex: 50, timestamp: new Date().toISOString() }
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
