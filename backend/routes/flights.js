import express from 'express';
import pool from '../db.js';

const router = express.Router();

// GET all flights
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM flights ORDER BY date DESC'
    );
    res.json({ flights: result.rows });
  } catch (err) {
    console.error('[Flights GET Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// POST - Add flight
router.post('/', async (req, res) => {
  try {
    const {
      date, origin, destination, originName, destName, aircraft,
      distance, duration, durationMins, passengers, fuel, payload, fpm, profit
    } = req.body;

    const result = await pool.query(
      `INSERT INTO flights
       (date, origin, destination, origin_name, dest_name, aircraft, distance, duration, duration_mins, passengers, fuel, payload, fpm, profit)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [date, origin, destination, originName, destName, aircraft, distance, duration, durationMins, passengers, fuel, payload, fpm, profit]
    );

    res.json({ id: result.rows[0].id });
  } catch (err) {
    console.error('[Flights POST Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT - Update flight
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { date, passengers, fuel, payload, fpm, profit, durationMins } = req.body;

    const result = await pool.query(
      `UPDATE flights
       SET date = $1, passengers = $2, fuel = $3, payload = $4, fpm = $5, profit = $6, duration_mins = $7, updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [date, passengers, fuel, payload, fpm, profit, durationMins, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Flight not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[Flights PUT Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE flight
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM flights WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Flight not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[Flights DELETE Error]', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
