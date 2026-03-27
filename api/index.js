import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import flightsRouter from '../backend/routes/flights.js';
import settingsRouter from '../backend/routes/settings.js';
import statsRouter from '../backend/routes/stats.js';
import pricingRouter from '../backend/routes/pricing.js';
import simbriefRouter from '../backend/routes/simbrief.js';
import missionsRouter from '../backend/routes/missions.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/flights', flightsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/stats', statsRouter);
app.use('/api/pricing', pricingRouter);
app.use('/api/simbrief', simbriefRouter);
app.use('/api/missions', missionsRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

export default app;
