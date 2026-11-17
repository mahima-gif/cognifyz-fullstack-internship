const express = require('express');
const {
  getHealth,
  getCacheStats,
  clearCache,
  getLogTail,
} = require('../controllers/system.controller');

const router = express.Router();

router.get('/health', getHealth);
router.get('/cache/stats', getCacheStats);
router.delete('/cache', clearCache);
router.get('/logs/tail', getLogTail);

module.exports = router;
