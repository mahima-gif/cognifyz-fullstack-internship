/**
 * Weather Service: Interacts with the Open-Meteo Geocoding and Forecast APIs.
 *
 * Open-Meteo is open-source and free, requiring NO API keys.
 * Flow:
 * 1. Geocoding API: converts city string to latitude, longitude, and ISO country code.
 * 2. Forecast API: retrieves current weather and multi-day daily forecasts.
 * 3. Maps WMO codes to friendly descriptions and emojis.
 * 4. Simplifies raw payload into a clean, well-typed schema.
 */

const { httpClient, mapAxiosError } = require('./httpClient');
const AppError = require('../utils/AppError');
const { cache, InMemoryCache } = require('../utils/cache');

// WMO Weather Interpretation Codes (WW)
const WMO_CODE_MAP = {
  0: { description: 'Clear sky', emoji: '☀️' },
  1: { description: 'Mainly clear', emoji: '🌤️' },
  2: { description: 'Partly cloudy', emoji: '⛅' },
  3: { description: 'Overcast', emoji: '☁️' },
  45: { description: 'Foggy', emoji: '🌫️' },
  48: { description: 'Depositing rime fog', emoji: '🌫️' },
  51: { description: 'Light drizzle', emoji: '🌦️' },
  53: { description: 'Moderate drizzle', emoji: '🌦️' },
  55: { description: 'Dense drizzle', emoji: '🌧️' },
  56: { description: 'Light freezing drizzle', emoji: '🌧️' },
  57: { description: 'Dense freezing drizzle', emoji: '🌧️' },
  61: { description: 'Slight rain', emoji: '🌧️' },
  63: { description: 'Moderate rain', emoji: '🌧️' },
  65: { description: 'Heavy rain', emoji: '🌧️' },
  66: { description: 'Light freezing rain', emoji: '🌧️' },
  67: { description: 'Heavy freezing rain', emoji: '🌧️' },
  71: { description: 'Slight snow fall', emoji: '❄️' },
  73: { description: 'Moderate snow fall', emoji: '❄️' },
  75: { description: 'Heavy snow fall', emoji: '❄️' },
  77: { description: 'Snow grains', emoji: '❄️' },
  80: { description: 'Slight rain showers', emoji: '🌦️' },
  81: { description: 'Moderate rain showers', emoji: '🌧️' },
  82: { description: 'Violent rain showers', emoji: '⛈️' },
  85: { description: 'Slight snow showers', emoji: '🌨️' },
  86: { description: 'Heavy snow showers', emoji: '🌨️' },
  95: { description: 'Thunderstorm', emoji: '⛈️' },
  96: { description: 'Thunderstorm with slight hail', emoji: '⛈️' },
  99: { description: 'Thunderstorm with heavy hail', emoji: '⛈️' }
};

function decodeWeatherCode(code) {
  return WMO_CODE_MAP[code] || { description: 'Variable weather', emoji: '🌡️' };
}

/**
 * Geocode a city name into geographical coordinates using Open-Meteo.
 * @param {string} city
 * @returns {Promise<Object>} { name, latitude, longitude, country, countryCode }
 */
async function geocodeCity(city) {
  const url = 'https://geocoding-api.open-meteo.com/v1/search';
  try {
    const response = await httpClient.get(url, {
      params: {
        name: city,
        count: 1,
        language: 'en',
        format: 'json'
      }
    });

    const results = response.data?.results;
    if (!results || results.length === 0) {
      throw new AppError(`City '${city}' not found. Please verify spelling.`, 404);
    }

    const first = results[0];
    return {
      name: first.name,
      latitude: first.latitude,
      longitude: first.longitude,
      country: first.country || '',
      countryCode: (first.country_code || '').toUpperCase()
    };
  } catch (error) {
    throw mapAxiosError(error, 'Open-Meteo Geocoding Service');
  }
}

/**
 * Fetch weather forecast for latitude and longitude.
 * @param {number} latitude
 * @param {number} longitude
 * @param {string} units - 'metric' or 'imperial'
 */
async function fetchForecast(latitude, longitude, units = 'metric') {
  const isImperial = units.toLowerCase() === 'imperial';
  const url = 'https://api.open-meteo.com/v1/forecast';

  const params = {
    latitude,
    longitude,
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min',
    timezone: 'auto'
  };

  if (isImperial) {
    params.temperature_unit = 'fahrenheit';
    params.wind_speed_unit = 'mph';
  }

  try {
    const response = await httpClient.get(url, { params });
    const current = response.data?.current || {};
    const daily = response.data?.daily || {};

    const currentWeatherCode = current.weather_code ?? 0;
    const { description: currentDesc, emoji: currentEmoji } = decodeWeatherCode(currentWeatherCode);

    // Map 5-day daily forecast
    const forecast = [];
    const dates = daily.time || [];
    const maxTemps = daily.temperature_2m_max || [];
    const minTemps = daily.temperature_2m_min || [];
    const dailyCodes = daily.weather_code || [];

    const daysCount = Math.min(dates.length, 5);
    for (let i = 0; i < daysCount; i += 1) {
      const code = dailyCodes[i] ?? 0;
      const { description, emoji } = decodeWeatherCode(code);
      forecast.push({
        date: dates[i],
        tempMax: maxTemps[i] ?? null,
        tempMin: minTemps[i] ?? null,
        weatherCode: code,
        description,
        emoji
      });
    }

    return {
      units: {
        temperature: isImperial ? '°F' : '°C',
        windSpeed: isImperial ? 'mph' : 'km/h'
      },
      current: {
        temperature: current.temperature_2m ?? null,
        feelsLike: current.apparent_temperature ?? null,
        humidity: current.relative_humidity_2m ?? null,
        windSpeed: current.wind_speed_10m ?? null,
        weatherCode: currentWeatherCode,
        description: currentDesc,
        emoji: currentEmoji
      },
      forecast
    };
  } catch (error) {
    throw mapAxiosError(error, 'Open-Meteo Forecast Service');
  }
}

/**
 * Get aggregated weather data for a city with caching support.
 *
 * @param {string} city
 * @param {string} [units='metric']
 * @returns {Promise<{ data: Object, fromCache: boolean }>}
 */
async function getWeatherForCity(city, units = 'metric') {
  const normalizedUnits = units.toLowerCase() === 'imperial' ? 'imperial' : 'metric';
  const cacheKey = InMemoryCache.normalizeWeatherKey(city, normalizedUnits);

  // Check cache (TTL 10 minutes)
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    return { data: cachedData, fromCache: true };
  }

  // 1. Geocode
  const geo = await geocodeCity(city);

  // 2. Fetch forecast
  const weather = await fetchForecast(geo.latitude, geo.longitude, normalizedUnits);

  const payload = {
    city: geo.name,
    country: geo.country,
    countryCode: geo.countryCode,
    coordinates: {
      latitude: geo.latitude,
      longitude: geo.longitude
    },
    units: weather.units,
    current: weather.current,
    forecast: weather.forecast
  };

  // Cache for 10 minutes (600,000 ms)
  cache.set(cacheKey, payload, 10 * 60 * 1000);

  return { data: payload, fromCache: false };
}

module.exports = {
  geocodeCity,
  fetchForecast,
  getWeatherForCity,
  decodeWeatherCode
};
