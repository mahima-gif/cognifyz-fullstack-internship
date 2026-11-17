/**
 * Country Controller.
 * Handles requests for country information via the REST Countries service.
 */

const countryService = require('../services/country.service');

/**
 * GET /api/country/:code
 * Returns metadata for the specified country code.
 */
async function getCountry(req, res) {
  const { code } = req.params;
  const { data, fromCache } = await countryService.getCountryByCode(code);

  res.set('X-Cache', fromCache ? 'HIT' : 'MISS');
  return res.status(200).json({
    success: true,
    data
  });
}

module.exports = {
  getCountry
};
