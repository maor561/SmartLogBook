import express from 'express';
import getDb from '../db.js';

const router = express.Router();

// GET - החזר משימות עתידיות + משימות שהושלמו
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const today = new Date().toISOString().split('T')[0];

    // טען רשימת משימות שהושלמו
    const progressDoc = await db.collection('user_progress').findOne({ key: 'completed_missions' });
    const completedIds = progressDoc?.ids || [];

    const missions = await db.collection('missions')
      .find({
        $or: [
          { date: { $gte: today } },           // משימות עתידיות
          { date: { $exists: false } },         // משימות ללא תאריך
          { id: { $in: completedIds } }         // משימות שהושלמו (גם ישנות)
        ]
      })
      .sort({ date: 1 })
      .toArray();

    console.log(`[Missions GET] Found ${missions.length} missions (${completedIds.length} completed tracked)`);

    // שמור ID סמנטי, fallback ל-_id
    res.json({ missions: missions.map(m => ({ ...m, id: m.id || m._id.toString() })) });
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

    // טען רשימת משימות שהושלמו - לא למחוק אותן!
    const progressDoc = await db.collection('user_progress').findOne({ key: 'completed_missions' });
    const completedIds = progressDoc?.ids || [];

    // מחק רק auto missions שלא הושלמו
    await db.collection('missions').deleteMany({
      source: 'auto',
      id: { $nin: completedIds }
    });

    // הוסף משימות חדשות - רק עתידיות, upsert לשמור קיימות
    const futureMissions = missions
      .filter(m => !m.date || m.date >= today);

    if (futureMissions.length > 0) {
      const ops = futureMissions.map(m => ({
        updateOne: {
          filter: { id: m.id },
          update: { $set: { ...m, source: 'auto', updated_at: new Date() } },
          upsert: true
        }
      }));
      await db.collection('missions').bulkWrite(ops);
    }

    const total = await db.collection('missions').countDocuments();

    res.json({
      success: true,
      upserted: futureMissions.length,
      skipped_past: missions.length - futureMissions.length,
      preserved_completed: completedIds.length,
      total_in_db: total
    });
  } catch (err) {
    console.error('[Missions UPDATE Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /clear - נקה משימות אוטומטיות (שומר על הושלמו)
router.delete('/clear', async (req, res) => {
  try {
    const db = await getDb();
    const progressDoc = await db.collection('user_progress').findOne({ key: 'completed_missions' });
    const completedIds = progressDoc?.ids || [];

    const result = await db.collection('missions').deleteMany({
      source: 'auto',
      id: { $nin: completedIds }
    });
    res.json({ deleted: result.deletedCount, preserved: completedIds.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET completed mission IDs
router.get('/completed', async (req, res) => {
  try {
    const db = await getDb();
    const doc = await db.collection('user_progress').findOne({ key: 'completed_missions' });
    const completed = doc?.ids || [];
    console.log(`[Missions Completed GET] Found ${completed.length} completed missions`);
    res.json({ completed });
  } catch (err) {
    console.error('[Missions Completed GET Error]', err);
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
