import express from 'express';
import getDb from '../db.js';

const router = express.Router();

// GET all settings
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const docs = await db.collection('settings').find({}).toArray();
    const settings = {};
    docs.forEach(doc => { settings[doc.key] = doc.value; });
    res.json(settings);
  } catch (err) {
    console.error('[Settings GET Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// GET single setting
router.get('/:key', async (req, res) => {
  try {
    const db = await getDb();
    const { key } = req.params;
    const doc = await db.collection('settings').findOne({ key });
    res.json({ value: doc ? doc.value : null });
  } catch (err) {
    console.error('[Settings GET/:key Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT - Upsert setting
router.put('/:key', async (req, res) => {
  try {
    const db = await getDb();
    const { key } = req.params;
    const { value } = req.body;

    await db.collection('settings').updateOne(
      { key },
      { $set: { key, value, updated_at: new Date() } },
      { upsert: true }
    );

    res.json({ success: true });
  } catch (err) {
    console.error('[Settings PUT Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /goals - Save user goals/targets
router.post('/goals', async (req, res) => {
  try {
    const db = await getDb();
    const goals = req.body;

    await db.collection('user_progress').updateOne(
      { key: 'goals' },
      { $set: { ...goals, updated_at: new Date() } },
      { upsert: true }
    );

    res.json({ success: true });
  } catch (err) {
    console.error('[Goals POST Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /goals - Load user goals
router.get('/goals', async (req, res) => {
  try {
    const db = await getDb();
    const doc = await db.collection('user_progress').findOne({ key: 'goals' });

    res.json({
      flights: doc?.flights || 0,
      hours: doc?.hours || 0,
      profit: doc?.profit || 0,
      passengers: doc?.passengers || 0
    });
  } catch (err) {
    console.error('[Goals GET Error]', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
