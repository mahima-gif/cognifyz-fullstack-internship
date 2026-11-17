const cacheService = require('./cache');

function getDbDelay() {
  return process.env.TEST_FAST_DELAY ? 25 : 2000;
}

let productsDB = [
  { id: '1', name: 'Ultra Wireless Noise-Cancelling Headphones', category: 'electronics', price: 199.99, stock: 45, description: 'High fidelity audio with 40-hour battery life.' },
  { id: '2', name: 'Mechanical Ergonomic Keyboard', category: 'electronics', price: 129.50, stock: 80, description: 'Hot-swappable switches with RGB backlight.' },
  { id: '3', name: '4K IPS Developer Monitor 32-inch', category: 'electronics', price: 449.00, stock: 15, description: 'True color accuracy with USB-C 90W power delivery.' },
  { id: '4', name: 'Clean Architecture by Robert C. Martin', category: 'books', price: 34.99, stock: 120, description: 'A craftsman guide to software structure and design.' },
  { id: '5', name: 'Designing Data-Intensive Applications', category: 'books', price: 42.50, stock: 95, description: 'The big ideas behind reliable, scalable, and maintainable systems.' },
  { id: '6', name: 'Solid Oak Adjustable Standing Desk', category: 'furniture', price: 599.00, stock: 8, description: 'Dual motor electric height adjustable workstation.' },
  { id: '7', name: 'Ergonomic Mesh Task Chair', category: 'furniture', price: 349.99, stock: 22, description: 'Lumbar support with 4D adjustable armrests.' },
  { id: '8', name: 'Smart Home Mesh Wi-Fi 6 Router', category: 'electronics', price: 179.99, stock: 35, description: 'Blazing fast speeds covering up to 5,000 sq ft.' },
  { id: '9', name: 'Refactoring: Improving the Design of Existing Code', category: 'books', price: 47.00, stock: 60, description: 'Martin Fowler classic guide to code quality.' },
  { id: '10', name: 'Studio USB Condenser Microphone', category: 'electronics', price: 119.00, stock: 50, description: 'Cardioid polar pattern with zero-latency monitoring.' },
];

/**
 * Service handling simulated slow database operations and cache invalidations
 */
class ProductsService {
  /**
   * Retrieves products with filtering, search, and pagination after a simulated 2-second DB delay
   */
  async getProducts({ category, search, page = 1, limit = 10 } = {}) {
    // Simulate slow database read
    await new Promise((resolve) => setTimeout(resolve, getDbDelay()));

    let items = [...productsDB];

    if (category) {
      const cat = category.toLowerCase();
      items = items.filter((p) => p.category.toLowerCase() === cat);
    }

    if (search) {
      const q = search.toLowerCase();
      items = items.filter((p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
    }

    const total = items.length;
    const startIndex = (page - 1) * limit;
    const paginatedItems = items.slice(startIndex, startIndex + limit);

    return {
      products: paginatedItems,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getProductById(id) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return productsDB.find((p) => p.id === String(id)) || null;
  }

  /**
   * Adds a new product and invalidates all cached product query results
   */
  async createProduct({ name, category, price, stock, description }) {
    const newProduct = {
      id: String(productsDB.length + 1),
      name,
      category,
      price: parseFloat(price),
      stock: parseInt(stock, 10) || 0,
      description: description || '',
    };

    productsDB.push(newProduct);

    // Invalidate product cache entries
    await this.invalidateProductsCache();

    return newProduct;
  }

  /**
   * Updates an existing product and invalidates cache
   */
  async updateProduct(id, updates) {
    const index = productsDB.findIndex((p) => p.id === String(id));
    if (index === -1) {
      return null;
    }

    productsDB[index] = {
      ...productsDB[index],
      ...updates,
      id: productsDB[index].id, // Prevent id modification
    };

    await this.invalidateProductsCache();
    return productsDB[index];
  }

  /**
   * Deletes a product and invalidates cache
   */
  async deleteProduct(id) {
    const index = productsDB.findIndex((p) => p.id === String(id));
    if (index === -1) {
      return false;
    }

    productsDB.splice(index, 1);
    await this.invalidateProductsCache();
    return true;
  }

  /**
   * Invalidates every cached product route key using prefix matching (SCAN in Redis, prefix in memory)
   */
  async invalidateProductsCache() {
    await cacheService.delByPrefix('cache:GET:/api/products');
  }

  /**
   * Resets products list (for test isolation)
   */
  reset(seed = null) {
    if (seed) {
      productsDB = [...seed];
    }
  }
}

module.exports = new ProductsService();
