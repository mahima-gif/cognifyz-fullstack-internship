const productsService = require('../services/products.service');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Controller: List products with simulated database latency
 * GET /api/products
 */
const listProducts = asyncHandler(async (req, res) => {
  const { category, search, page, limit } = req.query;

  const data = await productsService.getProducts({
    category,
    search,
    page: parseInt(page, 10) || 1,
    limit: parseInt(limit, 10) || 10,
  });

  res.status(200).json({
    success: true,
    data,
    message: 'Products retrieved successfully',
    errors: [],
  });
});

/**
 * Controller: Get product by ID
 * GET /api/products/:id
 */
const getProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const product = await productsService.getProductById(id);

  if (!product) {
    throw new AppError(`Product with ID "${id}" was not found`, 404);
  }

  res.status(200).json({
    success: true,
    data: product,
    message: 'Product retrieved successfully',
    errors: [],
  });
});

/**
 * Controller: Create product & invalidate cache
 * POST /api/products
 */
const createProduct = asyncHandler(async (req, res) => {
  const { name, category, price, stock, description } = req.body;

  const product = await productsService.createProduct({
    name,
    category,
    price,
    stock,
    description,
  });

  res.status(201).json({
    success: true,
    data: product,
    message: 'Product created and product cache invalidated',
    errors: [],
  });
});

/**
 * Controller: Update product & invalidate cache
 * PUT /api/products/:id
 */
const updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updated = await productsService.updateProduct(id, req.body);

  if (!updated) {
    throw new AppError(`Product with ID "${id}" was not found`, 404);
  }

  res.status(200).json({
    success: true,
    data: updated,
    message: 'Product updated and product cache invalidated',
    errors: [],
  });
});

/**
 * Controller: Delete product & invalidate cache
 * DELETE /api/products/:id
 */
const deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const deleted = await productsService.deleteProduct(id);

  if (!deleted) {
    throw new AppError(`Product with ID "${id}" was not found`, 404);
  }

  res.status(200).json({
    success: true,
    data: { id, deleted: true },
    message: 'Product deleted and product cache invalidated',
    errors: [],
  });
});

module.exports = {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
};
