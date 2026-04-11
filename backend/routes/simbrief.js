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
      gc_distance:    extractValue(generalBlock, 'gc_distance'),
      route:          extractValue(generalBlock, 'route'),
      costindex:      extractValue(generalBlock, 'costindex'),
      passengers:     extractValue(generalBlock, 'passengers'),
      // Wind averages are in general block in SimBrief
      avg_wind_spd:   extractValue(generalBlock, 'avg_wind_spd'),
      avg_wind_dir:   extractValue(generalBlock, 'avg_wind_dir'),
      avg_wind_comp:  extractValue(generalBlock, 'avg_wind_comp')
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
      units: extractValue(paramsBlock, 'units')
    },
    weather: {
      // SimBrief avg wind is in the general block
      wind_spd: parseInt(extractValue(generalBlock, 'avg_wind_spd') || extractValue(weatherBlock, 'avg_wind_spd') || extractValue(weatherBlock, 'wind_spd') || '0'),
      wind_dir: extractValue(generalBlock, 'avg_wind_dir') || extractValue(weatherBlock, 'avg_wind_dir') || extractValue(weatherBlock, 'wind_dir'),
      // Destination METAR visibility/ceiling if available
      visibility: parseInt(extractValue(destBlock, 'metar_vis') || extractValue(weatherBlock, 'vis') || '10'),
      ceiling:    parseInt(extractValue(destBlock, 'metar_ceil') || extractValue(weatherBlock, 'ceil') || '5000'),
      conditions: extractValue(destBlock, 'metar_wx') || extractValue(weatherBlock, 'conditions') || 'CAVOK'
    },
    // costindex from general block (primary SimBrief location)
    costindex: parseInt(extractValue(generalBlock, 'costindex') || extractValue(paramsBlock, 'costindex') || '0')
  };
}

export default router;
