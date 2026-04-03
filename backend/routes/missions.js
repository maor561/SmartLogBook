import express from 'express';
import getDb from '../db.js';

const router = express.Router();

// Default missions - fallback לעברית נכונה (תמיד כ-backup)
const DEFAULT_MISSIONS = [
  {id: 'sports-1', category: 'sports', emoji: '🏆', title: 'נבחרת ישראל בכדורגל - מיון UEFA', description: 'טוס עם נבחרת ישראל למדריד למשחק המיון של UEFA.', origin: 'LLBG', destination: 'LEMD', reward_cash: 5000, reward_badge: 'גיבור דיפלומטי', event: 'ספרד נגד ישראל - מיון UEFA'},
  {id: 'sports-2', category: 'sports', emoji: '🏆', title: 'נבחרת ישראל בכדורעף - הזמנה לפריז', description: 'טוס עם נבחרת ישראל בכדורעף לפריז לאליפות הזמנה.', origin: 'LLBG', destination: 'LFPG', reward_cash: 4500, reward_badge: 'שגריר ספורט', event: 'אליפות כדורעף פריז'},
  {id: 'sports-3', category: 'sports', emoji: '🏆', title: 'קבוצת כדורסל - EuroBasket', description: 'טוס עם קבוצת הכדורסל הישראלית לרומא לתחרות EuroBasket.', origin: 'LLBG', destination: 'LIRF', reward_cash: 5500, reward_badge: 'מאמן הקבוצה', event: 'טורניר EuroBasket'},
  {id: 'sports-4', category: 'sports', emoji: '🏆', title: 'אולימפיאדה - ספורטאים ישראלים לטוקיו', description: 'טוס עם הספורטאים הישראלים לטוקיו למשחקים האולימפיים.', origin: 'LLBG', destination: 'RJTT', reward_cash: 8000, reward_badge: 'אלוף אולימפי', event: 'אולימפיאדת טוקיו'},
  {id: 'culture-1', category: 'culture', emoji: '🎤', title: 'משלחת אירוויזיון - שטוקהולם', description: 'טוס עם משלחת האירוויזיון הישראלית לשטוקהולם.', origin: 'LLBG', destination: 'ESSA', reward_cash: 3500, reward_badge: 'שגריר תרבות', event: 'תחרות אירוויזיון'},
  {id: 'culture-2', category: 'culture', emoji: '🎤', title: 'התזמורת הפילהרמונית - ברלין', description: 'טוס עם התזמורת הפילהרמונית הישראלית לברלין לסיבוב הופעות.', origin: 'LLBG', destination: 'EDDB', reward_cash: 4000, reward_badge: 'חובב מוזיקה', event: 'סדרת הופעות ברלין'},
  {id: 'culture-3', category: 'culture', emoji: '🎤', title: 'להקת תיאטרון - ניו יורק', description: 'טוס עם להקת התיאטרון הישראלית לניו יורק להופעות בברודווי.', origin: 'LLBG', destination: 'KJFK', reward_cash: 6000, reward_badge: 'חסיד תיאטרון', event: 'פסטיבל תיאטרון ניו יורק'},
  {id: 'diplomatic-1', category: 'diplomatic', emoji: '🤝', title: 'שר החוץ - פסגת האו"ם', description: 'טוס עם שר החוץ לניו יורק לאסיפה הכללית של האו"ם.', origin: 'LLBG', destination: 'KJFK', reward_cash: 4500, reward_badge: 'דיפלומט', event: 'האסיפה הכללית של האו"ם'},
  {id: 'diplomatic-2', category: 'diplomatic', emoji: '🤝', title: 'משלחת סחר - בריסל', description: 'טוס עם המשלחת העסקית למשא ומתן סחר עם האיחוד האירופי.', origin: 'LLBG', destination: 'EBBR', reward_cash: 3500, reward_badge: 'מומחה סחר', event: 'פסגת סחר האיחוד האירופי'},
  {id: 'diplomatic-3', category: 'diplomatic', emoji: '🤝', title: 'משלחת שיחות שלום - קהיר', description: 'טוס עם המשלחת הדיפלומטית למשא ומתן שלום במצרים.', origin: 'LLBG', destination: 'HECA', reward_cash: 5000, reward_badge: 'עושה שלום', event: 'שיחות שלום קהיר'},
  {id: 'diplomatic-4', category: 'diplomatic', emoji: '🤝', title: 'פסגת היי-טק - סיליקון ואלי', description: 'טוס עם מנהיגי ההיי-טק הישראלי לכנס בקליפורניה.', origin: 'LLBG', destination: 'KSJC', reward_cash: 6500, reward_badge: 'חלוץ טכנולוגיה', event: 'כנס הטכנולוגיה בסיליקון ואלי'},
  {id: 'emergency-1', category: 'emergency', emoji: '🚨', title: 'פינוי רפואי - קפריסין', description: 'פינוי דחוף של צוות רפואי ישראלי לקפריסין לסיוע הומניטרי.', origin: 'LLBG', destination: 'LCRA', reward_cash: 4000, reward_badge: 'מגיב חירום', event: 'מצב חירום רפואי בקפריסין'},
  {id: 'emergency-2', category: 'emergency', emoji: '🚨', title: 'סיוע הומניטרי - טורקיה', description: 'הבאת סיוע הומניטרי חירום לאחר רעידת האדמה בטורקיה.', origin: 'LLBG', destination: 'LTAC', reward_cash: 5500, reward_badge: 'גיבור הומניטרי', event: 'סיוע לרעידת האדמה בטורקיה'},
  {id: 'emergency-3', category: 'emergency', emoji: '🚨', title: 'פינוי אזרחים - סודן', description: 'פינוי חירום של אזרחים ישראלים מסודן.', origin: 'LLBG', destination: 'HSSS', reward_cash: 4500, reward_badge: 'מציל חיים', event: 'פינוי סודן'},
  {id: 'state-1', category: 'state', emoji: '👥', title: 'ביקור ראש הממשלה - וושינגטון', description: 'טוס עם ראש הממשלה לביקור רשמי בוושינגטון.', origin: 'LLBG', destination: 'KDCA', reward_cash: 7000, reward_badge: 'נציג ממשלתי', event: 'ביקור מדינה בוושינגטון'},
  {id: 'state-2', category: 'state', emoji: '👥', title: 'משלחת ממשלתית - פריז', description: 'טוס עם המשלחת הממשלתית לפגישות שיתוף פעולה ישראל-צרפת.', origin: 'LLBG', destination: 'LFPG', reward_cash: 5000, reward_badge: 'קישור ממשלתי', event: 'פסגה ממשלתית פריז'},
  {id: 'state-3', category: 'state', emoji: '👥', title: 'חילופי תרבות - מרוקו', description: 'טוס עם משלחת חילופי תרבות למרוקו.', origin: 'LLBG', destination: 'GMMC', reward_cash: 3500, reward_badge: 'גשר תרבות', event: 'חילופי תרבות עם מרוקו'},
];

// בדוק אם משימה מכילה רישומים מקודדים בעברית
function isHebrew(str) {
  return /[\u0590-\u05FF]/.test(str);
}

// GET - החזר משימות עתידיות + משימות שהושלמו
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const today = new Date().toISOString().split('T')[0];

    // אם DB לא זמין, החזר DEFAULT_MISSIONS
    if (!db) {
      console.log('[Missions GET] DB not available - using DEFAULT_MISSIONS fallback');
      return res.json({ missions: DEFAULT_MISSIONS });
    }

    // טען רשימת משימות שהושלמו
    let completedIds = [];
    try {
      const progressDoc = await db.collection('user_progress').findOne({ key: 'completed_missions' });
      completedIds = progressDoc?.ids || [];
    } catch (err) {
      console.warn('[Missions GET] Could not fetch completed missions:', err.message);
    }

    let missions = [];
    try {
      missions = await db.collection('missions')
        .find({
          $or: [
            { date: { $gte: today } },           // משימות עתידיות
            { date: { $exists: false } },         // משימות ללא תאריך
            { id: { $in: completedIds } }         // משימות שהושלמו (גם ישנות)
          ]
        })
        .sort({ date: 1 })
        .toArray();
    } catch (err) {
      console.warn('[Missions GET] Could not fetch missions from DB:', err.message);
      missions = [];
    }

    // אם אין משימות או יש encoding issues, החזר DEFAULT_MISSIONS
    if (missions.length === 0) {
      missions = DEFAULT_MISSIONS;
      console.log('[Missions GET] MongoDB empty - using DEFAULT_MISSIONS fallback');
    } else {
      // בדוק אם יש encoding issues (תוים ???? או לא עברית) ותקן
      missions = missions.map(m => {
        const hasEncodingIssue =
          !isHebrew(m.title || '') ||
          (m.title && m.title.includes('?')) ||
          (m.description && m.description.includes('?'));

        if (hasEncodingIssue) {
          const defaultMission = DEFAULT_MISSIONS.find(d => d.id === m.id);
          if (defaultMission) {
            console.log(`[Missions GET] Fixed encoding for mission ${m.id}`);
            return { ...m, title: defaultMission.title, description: defaultMission.description, event: defaultMission.event, reward_badge: defaultMission.reward_badge };
          }
        }
        return m;
      });
    }

    console.log(`[Missions GET] Found ${missions.length} missions (${completedIds.length} completed tracked)`);

    // שמור ID סמנטי, fallback ל-_id
    res.json({ missions: missions.map(m => ({ ...m, id: m.id || m._id?.toString() || m.id })) });
  } catch (err) {
    console.error('[Missions GET Error]', err);
    // fallback סופי - החזר DEFAULT_MISSIONS אם יש שגיאה
    res.json({ missions: DEFAULT_MISSIONS });
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
