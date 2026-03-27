// כל התחלת הקובץ זהה עד לחלק API
// הנה התיקון בלבד לחלק ה-API (שורות 391-434):

// ===== SERVER API =====
const API = {
  async getFlights() {
    const r = await fetch('/api/api.php?action=getFlights');
    return r.json();
  },
  async addFlight(flight) {
    const r = await fetch('/api/api.php?action=addFlight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(flight)
    });
    return r.json();
  },
  async deleteFlight(id) {
    await fetch(`/api/api.php?action=deleteFlight&id=${id}`, { method: 'DELETE' });
  },
  async saveFlight(flight) {
    const r = await fetch(`/api/api.php?action=updateFlight&id=${flight.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(flight)
    });
    return r.json();
  },
  async importFlights(flightsArr) {
    // No direct import endpoint - add flights one by one
    const results = [];
    for (const flight of flightsArr) {
      const r = await fetch('/api/api.php?action=addFlight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(flight)
      });
      results.push(await r.json());
    }
    return results;
  },
  async getSettings() {
    const r = await fetch('/api/api.php?action=getSettings');
    return r.json();
  },
  async saveSetting(key, value) {
    await fetch(`/api/api.php?action=updateSetting&key=${key}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value })
    });
  }
};

