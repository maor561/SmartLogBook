import express from 'express';
import { ObjectId } from 'mongodb';
import getDb from '../db.js';

const router = express.Router();

// GET all flights
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const flights = await db.collection('flights').find({}).sort({ date: -1 }).toArray();
    const mapped = flights.map(f => ({ ...f, id: f._id.toString() }));
    res.json({ flights: mapped });
  } catch (err) {
    console.error('[Flights GET Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// POST - Add flight
router.post('/', async (req, res) => {
  try {
    const db = await getDb();
    const {
      date, origin, destination, originName, destName, aircraft,
      distance, duration, durationMins, passengers, fuel, payload, fpm, profit
    } = req.body;

    const result = await db.collection('flights').insertOne({
      date, origin, destination,
      origin_name: originName, dest_name: destName,
      aircraft, distance, duration,
      duration_mins: durationMins,
      passengers, fuel, payload, fpm, profit,
      created_at: new Date()
    });

    res.json({ id: result.insertedId.toString() });
  } catch (err) {
    console.error('[Flights POST Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT - Update flight
router.put('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const { date, passengers, fuel, payload, fpm, profit, durationMins } = req.body;

    const result = await db.collection('flights').findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { date, passengers, fuel, payload, fpm, profit, duration_mins: durationMins, updated_at: new Date() } }
    );

    if (!result) {
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
    const db = await getDb();
    const { id } = req.params;

    const result = await db.collection('flights').deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Flight not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[Flights DELETE Error]', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
