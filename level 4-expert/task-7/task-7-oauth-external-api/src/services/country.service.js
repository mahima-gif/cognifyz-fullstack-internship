/**
 * Country Service: Interacts with the REST Countries API.
 *
 * REST Countries is a free public API providing comprehensive metadata about sovereign nations.
 * Caching policy: 24 hours (86,400,000 ms), since geopolitical metadata changes very rarely.
 */

const { httpClient, mapAxiosError } = require('./httpClient');
const AppError = require('../utils/AppError');
const { cache, InMemoryCache } = require('../utils/cache');

const COUNTRY_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Fetch country metadata by 2-letter ISO country code.
 *
 * @param {string} countryCode - ISO 3166-1 alpha-2 code (e.g. "GB", "US", "IN")
 * @returns {Promise<{ data: Object, fromCache: boolean }>}
 */
async function getCountryByCode(countryCode) {
  const cleanCode = (countryCode || '').trim().toUpperCase();
  if (!cleanCode || cleanCode.length !== 2) {
    throw new AppError(`Invalid country code '${countryCode}'. Must be a 2-letter ISO code.`, 400);
  }

  const cacheKey = InMemoryCache.normalizeCountryKey(cleanCode);
  const cached = cache.get(cacheKey);
  if (cached) {
    return { data: cached, fromCache: true };
  }

  const url = `https://restcountries.com/v3.1/alpha/${cleanCode}`;

  try {
    const response = await httpClient.get(url);
    const raw = Array.isArray(response.data) ? response.data[0] : response.data;

    if (!raw) {
      throw new AppError(`Country details not found for code '${cleanCode}'.`, 404);
    }

    // Extract currencies into clean array of objects
    const currencies = [];
    if (raw.currencies && typeof raw.currencies === 'object') {
      for (const [code, val] of Object.entries(raw.currencies)) {
        currencies.push({
          code,
          name: val.name || code,
          symbol: val.symbol || ''
        });
      }
    }

    // Extract languages into clean array of strings
    const languages = raw.languages && typeof raw.languages === 'object'
      ? Object.values(raw.languages)
      : [];

    const capital = Array.isArray(raw.capital) && raw.capital.length > 0
      ? raw.capital.join(', ')
      : (raw.capital || 'N/A');

    const countryData = {
      code: cleanCode,
      name: {
        common: raw.name?.common || cleanCode,
        official: raw.name?.official || cleanCode
      },
      capital,
      region: raw.region || 'Unknown',
      subregion: raw.subregion || '',
      population: raw.population ?? 0,
      flagEmoji: raw.flag || '🏳️',
      flagUrl: raw.flags?.png || raw.flags?.svg || '',
      flagAlt: raw.flags?.alt || `Flag of ${raw.name?.common || cleanCode}`,
      currencies,
      languages
    };

    cache.set(cacheKey, countryData, COUNTRY_CACHE_TTL_MS);
    return { data: countryData, fromCache: false };
  } catch (error) {
    throw mapAxiosError(error, 'REST Countries API');
  }
}

module.exports = {
  getCountryByCode,
  COUNTRY_CACHE_TTL_MS
};
