import express from 'express';
import getDb from '../db.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const flights = await db.collection('flights').find({}).toArray();

    const sum = (field) => flights.reduce((acc, f) => acc + (Number(f[field]) || 0), 0);
    const avg = (field) => flights.length ? sum(field) / flights.length : 0;

    res.json({
      flights_count: flights.length,
      total_passengers: sum('passengers'),
      total_distance: sum('distance'),
      total_fuel: sum('fuel'),
      total_profit: sum('profit'),
      total_duration_mins: sum('duration_mins'),
      avg_passengers: avg('passengers'),
      avg_distance: avg('distance'),
      avg_fuel: avg('fuel'),
      avg_profit: avg('profit'),
      avg_duration_mins: avg('duration_mins')
    });
  } catch (err) {
    console.error('[Stats GET Error]', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
