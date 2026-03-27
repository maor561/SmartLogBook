import express from 'express';
import pool from '../db.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as flights_count,
        COALESCE(SUM(passengers), 0) as total_passengers,
        COALESCE(SUM(distance), 0) as total_distance,
        COALESCE(SUM(fuel), 0) as total_fuel,
        COALESCE(SUM(profit), 0) as total_profit,
        COALESCE(SUM(duration_mins), 0) as total_duration_mins,
        COALESCE(AVG(passengers), 0) as avg_passengers,
        COALESCE(AVG(distance), 0) as avg_distance,
        COALESCE(AVG(fuel), 0) as avg_fuel,
        COALESCE(AVG(profit), 0) as avg_profit,
        COALESCE(AVG(duration_mins), 0) as avg_duration_mins
      FROM flights
    `);

    res.json(result.rows[0]);
  } catch (err) {
    console.error('[Stats GET Error]', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
