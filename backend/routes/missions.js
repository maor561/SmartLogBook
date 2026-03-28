import express from 'express';
import getDb from '../db.js';

const router = express.Router();

// GET - החזר משימות עתידיות בלבד
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const today = new Date().toISOString().split('T')[0];

    const missions = await db.collection('missions')
      .find({
        $or: [
          { date: { $gte: today } },
          { date: { $exists: false } }
        ]
      })
      .sort({ date: 1 })
      .toArray();

    res.json({ missions: missions.map(m => ({ ...m, id: m._id.toString() })) });
  } catch (err) {
    console.error('[Missions GET Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /update - קבל רשימת משימות מ-Claude ועדכן MongoDB
router.post('/update', async (req, res) => {
  try {
    const secret = req.headers['x-update-secret'];
    const expected = process.env.MISSIONS_SECRET || 'SmartLogBook2026';
    if (secret !== expected) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { missions } = req.body;
    if (!Array.isArray(missions) || missions.length === 0) {
      return res.status(400).json({ error: 'missions array required' });
    }

    const db = await getDb();
    const today = new Date().toISOString().split('T')[0];

    // מחק משימות ישנות שנוצרו אוטומטית (שמור ידניות)
    await db.collection('missions').deleteMany({ source: 'auto' });

    // הוסף משימות חדשות - רק עתידיות
    const futureMissions = missions
      .filter(m => !m.date || m.date >= today)
      .map(m => ({ ...m, source: 'auto', updated_at: new Date() }));

    if (futureMissions.length > 0) {
      await db.collection('missions').insertMany(futureMissions);
    }

    const total = await db.collection('missions').countDocuments();

    res.json({
      success: true,
      inserted: futureMissions.length,
      skipped_past: missions.length - futureMissions.length,
      total_in_db: total
    });
  } catch (err) {
    console.error('[Missions UPDATE Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /clear - נקה משימות אוטומטיות שברורות (זמני)
router.delete('/clear', async (req, res) => {
  try {
    const db = await getDb();
    const result = await db.collection('missions').deleteMany({ source: 'auto' });
    res.json({ deleted: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET completed mission IDs
router.get('/completed', async (req, res) => {
  try {
    const db = await getDb();
    const doc = await db.collection('user_progress').findOne({ key: 'completed_missions' });
    res.json({ completed: doc?.ids || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /complete - שמור משימה שהושלמה
router.post('/complete', async (req, res) => {
  try {
    const { missionId } = req.body;
    if (!missionId) return res.status(400).json({ error: 'missionId required' });

    const db = await getDb();
    await db.collection('user_progress').updateOne(
      { key: 'completed_missions' },
      { $addToSet: { ids: missionId }, $set: { updated_at: new Date() } },
      { upsert: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /complete/:missionId - בטל השלמת משימה
router.delete('/complete/:missionId', async (req, res) => {
  try {
    const { missionId } = req.params;
    const db = await getDb();
    await db.collection('user_progress').updateOne(
      { key: 'completed_missions' },
      { $pull: { ids: missionId } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
