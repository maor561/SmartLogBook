import express from 'express';
import pool from '../db.js';

const router = express.Router();

// GET all settings
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT key, value FROM settings ORDER BY key');
    const settings = {};
    result.rows.forEach(row => {
      settings[row.key] = row.value;
    });
    res.json(settings);
  } catch (err) {
    console.error('[Settings GET Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// GET single setting
router.get('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const result = await pool.query('SELECT value FROM settings WHERE key = $1', [key]);

    if (result.rows.length === 0) {
      return res.json({ value: null });
    }

    res.json({ value: result.rows[0].value });
  } catch (err) {
    console.error('[Settings GET/:key Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT - Update setting
router.put('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    // Try update first, if no rows affected, insert
    const updateResult = await pool.query(
      'UPDATE settings SET value = $1, updated_at = NOW() WHERE key = $2',
      [value, key]
    );

    if (updateResult.rowCount === 0) {
      await pool.query(
        'INSERT INTO settings (key, value) VALUES ($1, $2)',
        [key, value]
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[Settings PUT Error]', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
