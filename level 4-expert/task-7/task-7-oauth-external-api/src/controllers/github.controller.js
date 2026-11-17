/**
 * GitHub API Controller.
 * Proxies requests to GitHub using stored server-side OAuth access tokens.
 */

const githubService = require('../services/github.service');

/**
 * GET /api/github/profile
 * Returns simplified profile metadata and scopes.
 */
async function getProfile(req, res) {
  const { data, fromCache } = await githubService.getGitHubProfile(req.user);

  res.set('X-Cache', fromCache ? 'HIT' : 'MISS');
  return res.status(200).json({
    success: true,
    data
  });
}

/**
 * GET /api/github/repos
 * Returns user's 6 most recently updated public repositories.
 */
async function getRepos(req, res) {
  const { data, fromCache } = await githubService.getGitHubRepos(req.user);

  res.set('X-Cache', fromCache ? 'HIT' : 'MISS');
  return res.status(200).json({
    success: true,
    data
  });
}

module.exports = {
  getProfile,
  getRepos
};
