import express from 'express';
import axios from 'axios';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { userid } = req.query;

    if (!userid) {
      return res.status(400).json({ error: 'userid parameter required' });
    }

    const response = await axios.get(
      `https://www.simbrief.com/api/xml.fetcher.php?userid=${userid}`,
      { timeout: 10000 }
    );

    const xmlData = response.data;
    const flight = extractFlightData(xmlData);
    res.json(flight);
  } catch (err) {
    console.error('[SimBrief Error]', err.message);
    res.status(500).json({ error: 'Failed to fetch SimBrief data', message: err.message });
  }
});

// Extract a block of XML between tags
function extractBlock(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? match[1] : '';
}

// Extract a single text value from XML
function extractValue(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([^<]*)<\\/${tag}>`, 'i'));
  return match ? match[1].trim() : null;
}

function extractFlightData(xmlData) {
  const originBlock      = extractBlock(xmlData, 'origin');
  const destBlock        = extractBlock(xmlData, 'destination');
  const aircraftBlock    = extractBlock(xmlData, 'aircraft');
  const generalBlock     = extractBlock(xmlData, 'general');
  const timesBlock       = extractBlock(xmlData, 'times');
  const fuelBlock        = extractBlock(xmlData, 'fuel');
  const weightsBlock     = extractBlock(xmlData, 'weights');
  const paramsBlock      = extractBlock(xmlData, 'params');
  const weatherBlock     = extractBlock(xmlData, 'weather');

  return {
    origin: {
      icao_code: extractValue(originBlock, 'icao_code'),
      iata_code: extractValue(originBlock, 'iata_code'),
      name:      extractValue(originBlock, 'name'),
      pos_lat:   extractValue(originBlock, 'pos_lat'),
      pos_long:  extractValue(originBlock, 'pos_long')
    },
    destination: {
      icao_code: extractValue(destBlock, 'icao_code'),
      iata_code: extractValue(destBlock, 'iata_code'),
      name:      extractValue(destBlock, 'name'),
      pos_lat:   extractValue(destBlock, 'pos_lat'),
      pos_long:  extractValue(destBlock, 'pos_long')
    },
    aircraft: {
      icaocode:  extractValue(aircraftBlock, 'icaocode'),
      name:      extractValue(aircraftBlock, 'name')
    },
    general: {
      route_distance: extractValue(generalBlock, 'route_distance'),
      route:          extractValue(generalBlock, 'route')
    },
    times: {
      est_time_enroute: extractValue(timesBlock, 'est_time_enroute')
    },
    fuel: {
      plan_ramp:    extractValue(fuelBlock, 'plan_ramp'),
      plan_takeoff: extractValue(fuelBlock, 'plan_takeoff')
    },
    weights: {
      pax_count_actual: extractValue(weightsBlock, 'pax_count_actual'),
      payload:          extractValue(weightsBlock, 'payload'),
      pax_weight:       extractValue(weightsBlock, 'pax_weight')
    },
    params: {
      units: extractValue(paramsBlock, 'units'),
      costindex: parseInt(extractValue(paramsBlock, 'costindex') || '0')
    },
    weather: {
      // Wind at destination (average)
      wind_dir: extractValue(weatherBlock, 'wind_dir'),
      wind_spd: parseInt(extractValue(weatherBlock, 'wind_spd') || '0'),
      // Visibility (in statute miles)
      visibility: parseInt(extractValue(weatherBlock, 'vis') || '10'),
      // Ceiling (in feet)
      ceiling: parseInt(extractValue(weatherBlock, 'ceil') || '5000'),
      // Temperature
      temp: extractValue(weatherBlock, 'temp'),
      // General conditions
      conditions: extractValue(weatherBlock, 'conditions') || 'CAVOK'
    }
  };
}

export default router;
