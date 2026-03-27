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

export default router;
