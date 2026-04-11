import express from 'express';
import { ObjectId } from 'mongodb';
import getDb from '../db.js';

const router = express.Router();

// GET all flights
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const flights = await db.collection('flights').find({}).sort({ date: -1 }).toArray();
    const mapped = flights.map(f => ({
      ...f,
      id: f._id.toString(),
      costIndex: f.cost_index || 80,
      windSpeed: f.wind_speed || 0,
      visibility: f.visibility || 10,
      ceiling: f.ceiling || 5000,
      weatherConditions: f.weather_conditions || 'CAVOK'
    }));
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
      distance, duration, durationMins, passengers, fuel, payload, fpm, profit,
      originLat, originLon, destLat, destLon,
      costIndex, windSpeed, visibility, ceiling, weatherConditions,
      aircraft_max_passengers, aircraft_max_cargo
    } = req.body;

    const result = await db.collection('flights').insertOne({
      date, origin, destination,
      origin_name: originName, dest_name: destName,
      aircraft, distance, duration,
      duration_mins: durationMins,
      passengers, fuel, payload, fpm, profit,
      originLat, originLon, destLat, destLon,
      cost_index: costIndex || 80,
      wind_speed: windSpeed || 0,
      visibility: visibility || 10,
      ceiling: ceiling || 5000,
      weather_conditions: weatherConditions || 'CAVOK',
      aircraft_max_passengers: req.body.aircraft_max_passengers || 189,
      aircraft_max_cargo: req.body.aircraft_max_cargo || 5000,
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
    const {
      date, passengers, fuel, payload, fpm, profit, durationMins,
      costIndex, windSpeed, visibility, ceiling, weatherConditions,
      aircraft_max_passengers, aircraft_max_cargo
    } = req.body;

    const result = await db.collection('flights').findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: {
        date, passengers, fuel, payload, fpm, profit,
        duration_mins: durationMins,
        cost_index: costIndex || 80,
        wind_speed: windSpeed || 0,
        visibility: visibility || 10,
        ceiling: ceiling || 5000,
        weather_conditions: weatherConditions || 'CAVOK',
        aircraft_max_passengers: aircraft_max_passengers || 189,
        aircraft_max_cargo: aircraft_max_cargo || 5000,
        updated_at: new Date()
      } }
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

// PATCH /update-safety-defaults - Update all flights with default safety parameters
router.patch('/update-safety-defaults', async (req, res) => {
  try {
    const db = await getDb();

    // Update all flights that don't have safety data
    const result = await db.collection('flights').updateMany(
      {
        $or: [
          { cost_index: { $exists: false } },
          { wind_speed: { $exists: false } },
          { visibility: { $exists: false } },
          { ceiling: { $exists: false } },
          { weather_conditions: { $exists: false } }
        ]
      },
      {
        $set: {
          cost_index: 80,
          wind_speed: 0,
          visibility: 10,
          ceiling: 5000,
          weather_conditions: 'CAVOK',
          updated_at: new Date()
        }
      }
    );

    console.log(`[Flights Safety Update] Updated ${result.modifiedCount} flights with safety defaults`);
    res.json({
      success: true,
      updated: result.modifiedCount,
      message: `Updated ${result.modifiedCount} flights with safety defaults (CI: 80, Weather: CAVOK)`
    });
  } catch (err) {
    console.error('[Flights Safety Update Error]', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
