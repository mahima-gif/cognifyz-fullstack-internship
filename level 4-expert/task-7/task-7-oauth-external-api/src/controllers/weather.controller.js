/**
 * Weather Controller.
 * Coordinates Open-Meteo weather lookups, REST Countries enrichment, session history, and caching headers.
 */

const weatherService = require('../services/weather.service');
const countryService = require('../services/country.service');

/**
 * GET /api/weather?city=London&units=metric
 *
 * Fetches current weather and 5-day forecast.
 * Gracefully attempts to enrich with country metadata; if REST Countries fails,
 * weather data is still returned with country: null and a warning.
 */
async function getWeather(req, res) {
  const { city, units = 'metric' } = req.query;

  // 1. Fetch weather from Open-Meteo (or in-memory cache)
  const { data: weatherData, fromCache } = await weatherService.getWeatherForCity(city, units);

  // Set X-Cache response header
  res.set('X-Cache', fromCache ? 'HIT' : 'MISS');

  // 2. Graceful country enrichment via REST Countries
  let countryDetails = null;
  const warnings = [];

  if (weatherData.countryCode) {
    try {
      const countryResult = await countryService.getCountryByCode(weatherData.countryCode);
      countryDetails = countryResult.data;
    } catch (countryError) {
      // Graceful degradation: we log the warning on server but do not fail the request
      countryDetails = null;
      warnings.push('Country information from REST Countries is temporarily unavailable.');
    }
  }

  // 3. Record search in session history (last 10 unique searches)
  if (req.session) {
    if (!Array.isArray(req.session.searchHistory)) {
      req.session.searchHistory = [];
    }

    const newEntry = {
      city: weatherData.city,
      country: weatherData.country,
      countryCode: weatherData.countryCode,
      searchedAt: new Date().toISOString()
    };

    // Deduplicate and prepend
    req.session.searchHistory = [
      newEntry,
      ...req.session.searchHistory.filter(
        (item) => item.city.toLowerCase() !== weatherData.city.toLowerCase()
      )
    ].slice(0, 10);
  }

  const responsePayload = {
    success: true,
    data: {
      ...weatherData,
      country: countryDetails
    }
  };

  if (warnings.length > 0) {
    responsePayload.warnings = warnings;
  }

  return res.status(200).json(responsePayload);
}

module.exports = {
  getWeather
};
