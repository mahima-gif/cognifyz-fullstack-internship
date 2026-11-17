const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const cacheMiddleware = require('../middleware/cache');
const {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/products.controller');

const router = express.Router();

const productValidation = [
  body('name').trim().notEmpty().withMessage('Product name is required'),
  body('category').trim().notEmpty().withMessage('Product category is required'),
  body('price').isFloat({ gt: 0 }).withMessage('Price must be a positive number'),
  body('stock').optional().isInt({ min: 0 }).withMessage('Stock must be an integer >= 0'),
  body('description').optional().trim(),
];

// GET routes: cached for 60 seconds with single-flight stampede protection
router.get('/', cacheMiddleware(60), listProducts);
router.get('/:id', cacheMiddleware(60), getProduct);

// Mutation routes: automatically invalidate products cache
router.post('/', validate(productValidation), createProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);

module.exports = router;
