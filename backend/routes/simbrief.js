import express from 'express';
import axios from 'axios';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { userid } = req.query;

    if (!userid) {
      return res.status(400).json({ error: 'userid parameter required' });
    }

    // Fetch from SimBrief API
    const response = await axios.get(`https://www.simbrief.com/api/xml.fetcher.php?userid=${userid}`, {
      timeout: 10000
    });

    // Parse XML response and convert to JSON
    const xmlData = response.data;

    // Simple XML to JSON conversion for SimBrief format
    const flight = extractFlightData(xmlData);

    res.json(flight);
  } catch (err) {
    console.error('[SimBrief Error]', err.message);
    res.status(500).json({
      error: 'Failed to fetch SimBrief data',
      message: err.message
    });
  }
});

function extractFlightData(xmlData) {
  // Extract key data from SimBrief XML
  const extract = (tag) => {
    const match = xmlData.match(new RegExp(`<${tag}>([^<]+)<\/${tag}>`));
    return match ? match[1] : null;
  };

  return {
    origin: extract('origin'),
    destination: extract('destination'),
    aircraft: extract('aircraft_icao'),
    distance: parseInt(extract('distance')) || 0,
    passengers: parseInt(extract('pax')) || 0,
    fuel: parseInt(extract('fuel')) || 0,
    cruiseSpeed: extract('cruise_speed'),
    cruiseAltitude: extract('cruise_altitude'),
    routeText: extract('route')
  };
}

export default router;
