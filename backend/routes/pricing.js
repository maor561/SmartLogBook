import express from 'express';
import pool from '../db.js';

const router = express.Router();

// GET pricing history
router.get('/history', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;

    const result = await pool.query(`
      SELECT * FROM pricing_history
      WHERE recorded_at >= NOW() - INTERVAL '1 day' * $1
      ORDER BY recorded_at DESC
    `, [days]);

    res.json(result.rows);
  } catch (err) {
    console.error('[Pricing History Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// POST - Update dynamic pricing
router.post('/update', async (req, res) => {
  try {
    // Placeholder for dynamic pricing update
    // In the future, this would fetch from fuel price APIs and calculate cost index
    res.json({
      success: true,
      message: 'Pricing updated',
      update: {
        fuelCost: 0.85,
        costIndex: 50,
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('[Pricing Update Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// POST - Record pricing history
router.post('/history', async (req, res) => {
  try {
    const {
      fuel_price, fuel_cost, cost_index,
      ticket_base, ticket_medium, ticket_long,
      cargo_rate, crew_cost,
      landing_small, landing_medium, landing_large,
      maintenance_cost, penalty, multiplier
    } = req.body;

    const result = await pool.query(`
      INSERT INTO pricing_history
      (fuel_price, fuel_cost, cost_index, ticket_base, ticket_medium, ticket_long,
       cargo_rate, crew_cost, landing_small, landing_medium, landing_large,
       maintenance_cost, penalty, multiplier)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id
    `, [
      fuel_price, fuel_cost, cost_index,
      ticket_base, ticket_medium, ticket_long,
      cargo_rate, crew_cost,
      landing_small, landing_medium, landing_large,
      maintenance_cost, penalty, multiplier
    ]);

    res.json({ id: result.rows[0].id });
  } catch (err) {
    console.error('[Pricing History POST Error]', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
