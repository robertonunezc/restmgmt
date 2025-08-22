const express = require('express');
const router = express.Router();
const { validateProductForCreation, validateProductForUpdate } = require('../models/Product');
const { ProductQueries } = require('../utils/product-database');
const { createValidationError } = require('../middleware/errorHandler');

console.log('Inventory router module loaded');

/**
 * GET /api/inventory/products - List all products with optional filtering and pagination
 * Requirements: 1.1, 1.3
 * 
 * Query parameters:
 * - search (optional): Search by product name or description (case-insensitive)
 * - unit (optional): Filter by unit of measure
 * - lowStock (optional): Filter products with low stock (boolean)
 * - outOfStock (optional): Filter products that are out of stock (boolean)
 * - page (optional): Page number for pagination (default: 1)
 * - limit (optional): Number of products per page (default: 20, max: 100)
 * - sortBy (optional): Sort field (name, current_quantity, low_stock_threshold, cost_per_unit, created_at)
 * - sortOrder (optional): Sort order (ASC, DESC)
 */
router.get('/products', async (req, res, next) => {
  try {
    console.log('GET /api/inventory/products called with query:', req.query);
    
    // Extract and validate query parameters
    const { 
      search, 
      unit, 
      lowStock, 
      outOfStock, 
      page = 1, 
      limit = 20,
      sortBy = 'name',
      sortOrder = 'ASC'
    } = req.query;
    
    // Validate pagination parameters
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({
        error: 'Invalid page parameter. Must be a positive integer.'
      });
    }
    
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        error: 'Invalid limit parameter. Must be between 1 and 100.'
      });
    }
    
    // Validate sort parameters
    const validSortFields = ['name', 'current_quantity', 'low_stock_threshold', 'cost_per_unit', 'created_at'];
    const validSortOrders = ['ASC', 'DESC'];
    
    if (!validSortFields.includes(sortBy)) {
      return res.status(400).json({
        error: `Invalid sortBy parameter. Must be one of: ${validSortFields.join(', ')}`
      });
    }
    
    if (!validSortOrders.includes(sortOrder.toUpperCase())) {
      return res.status(400).json({
        error: 'Invalid sortOrder parameter. Must be ASC or DESC.'
      });
    }
    
    // Build query options
    const options = {
      search: search || null,
      unit: unit || null,
      lowStock: lowStock === 'true',
      outOfStock: outOfStock === 'true',
      page: pageNum,
      limit: limitNum,
      sortBy,
      sortOrder: sortOrder.toUpperCase()
    };
    
    // Get products and total count
    const [products, totalCount] = await Promise.all([
      ProductQueries.getProducts(options),
      ProductQueries.getProductCount({
        search: options.search,
        unit: options.unit,
        lowStock: options.lowStock,
        outOfStock: options.outOfStock
      })
    ]);
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;
    
    console.log(`Retrieved ${products.length} products (page ${pageNum}/${totalPages})`);
    
    // Return paginated results with metadata
    res.json({
      products,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages,
        hasNextPage,
        hasPrevPage
      }
    });

  } catch (error) {
    // Pass error to error handling middleware
    next(error);
  }
});

/**
 * POST /api/inventory/products - Create new product
 * Requirements: 1.1, 1.2
 * 
 * Request body should contain:
 * - name (required): Product name (must be unique)
 * - description (optional): Product description
 * - unit_of_measure (required): Unit of measure from valid list
 * - current_quantity (required): Current quantity (non-negative number)
 * - low_stock_threshold (optional): Low stock threshold (default: 10)
 * - cost_per_unit (optional): Cost per unit
 * - supplier_info (optional): Supplier information
 */
router.post('/products', async (req, res, next) => {
  try {
    console.log('POST /api/inventory/products called with data:', req.body);
    
    // Validate request data using validation utilities
    const validation = validateProductForCreation(req.body);
    if (!validation.isValid) {
      throw createValidationError(validation.errors);
    }

    // Check for duplicate product name
    const existingProduct = await ProductQueries.getProductByName(req.body.name);
    if (existingProduct) {
      return res.status(409).json({
        error: 'Product name already exists. Product names must be unique.'
      });
    }

    // Create product
    const createdProduct = await ProductQueries.createProduct(req.body);
    
    console.log('Product created successfully:', createdProduct.id);
    
    // Return created product with 201 status
    res.status(201).json({
      message: 'Product created successfully',
      product: createdProduct
    });

  } catch (error) {
    // Pass error to error handling middleware
    next(error);
  }
});

/**
 * GET /api/inventory/products/:id - Get single product details
 * Requirements: 1.1, 1.3
 * 
 * Returns complete product data
 */
router.get('/products/:id', async (req, res, next) => {
  try {
    const productId = parseInt(req.params.id);
    
    console.log('GET /api/inventory/products/:id called with ID:', productId);
    
    // Validate product ID parameter
    if (isNaN(productId) || productId < 1) {
      return res.status(400).json({
        error: 'Invalid product ID. Must be a positive integer.'
      });
    }
    
    // Get product details
    const product = await ProductQueries.getProductById(productId);
    
    // Handle product not found
    if (!product) {
      return res.status(404).json({
        error: 'Product not found'
      });
    }
    
    console.log('Product retrieved successfully:', product.id);
    
    // Return product data
    res.json({
      product
    });

  } catch (error) {
    // Pass error to error handling middleware
    next(error);
  }
});

/**
 * PUT /api/inventory/products/:id - Update existing product
 * Requirements: 1.1, 1.2, 1.3
 * 
 * Updates an existing product with new data.
 * Supports partial updates.
 * 
 * Request body can contain any of:
 * - name: Product name (must be unique if changed)
 * - description: Product description
 * - unit_of_measure: Unit of measure from valid list
 * - current_quantity: Current quantity (non-negative number)
 * - low_stock_threshold: Low stock threshold
 * - cost_per_unit: Cost per unit
 * - supplier_info: Supplier information
 */
router.put('/products/:id', async (req, res, next) => {
  try {
    const productId = parseInt(req.params.id);
    
    console.log('PUT /api/inventory/products/:id called with ID:', productId, 'and data:', req.body);
    
    // Validate product ID parameter
    if (isNaN(productId) || productId < 1) {
      return res.status(400).json({
        error: 'Invalid product ID. Must be a positive integer.'
      });
    }
    
    // Validate request data using validation utilities
    const validation = validateProductForUpdate(req.body);
    if (!validation.isValid) {
      throw createValidationError(validation.errors);
    }

    // Check for duplicate product name if name is being updated
    if (req.body.name) {
      const existingProduct = await ProductQueries.getProductByName(req.body.name, productId);
      if (existingProduct) {
        return res.status(409).json({
          error: 'Product name already exists. Product names must be unique.'
        });
      }
    }

    // Update product
    const updatedProduct = await ProductQueries.updateProduct(productId, req.body);
    
    // Handle product not found
    if (!updatedProduct) {
      return res.status(404).json({
        error: 'Product not found'
      });
    }
    
    console.log('Product updated successfully:', updatedProduct.id);
    
    // Return updated product
    res.json({
      message: 'Product updated successfully',
      product: updatedProduct
    });

  } catch (error) {
    // Pass error to error handling middleware
    next(error);
  }
});

/**
 * DELETE /api/inventory/products/:id - Delete product
 * Requirements: 1.1, 1.3
 * 
 * Permanently removes a product from inventory.
 */
router.delete('/products/:id', async (req, res, next) => {
  try {
    const productId = parseInt(req.params.id);
    
    console.log('DELETE /api/inventory/products/:id called with ID:', productId);
    
    // Validate product ID parameter
    if (isNaN(productId) || productId < 1) {
      return res.status(400).json({
        error: 'Invalid product ID. Must be a positive integer.'
      });
    }
    
    // Delete product
    const deleted = await ProductQueries.deleteProduct(productId);
    
    // Handle product not found
    if (!deleted) {
      return res.status(404).json({
        error: 'Product not found'
      });
    }
    
    console.log('Product deleted successfully:', productId);
    
    // Return success confirmation
    res.json({
      message: 'Product deleted successfully'
    });

  } catch (error) {
    // Pass error to error handling middleware
    next(error);
  }
});

/**
 * POST /api/inventory/recipe-links - Create ingredient-product link
 * Requirements: 2.1, 2.2, 2.3
 * 
 * Request body should contain:
 * - recipe_ingredient_id (required): Recipe ingredient ID (positive integer)
 * - product_id (required): Product ID (positive integer)
 * - quantity_per_serving (required): Quantity per serving (positive number)
 */
router.post('/recipe-links', async (req, res, next) => {
  try {
    console.log('POST /api/inventory/recipe-links called with data:', req.body);
    
    const { RecipeIngredientProductQueries } = await import('../utils/inventory-database.js');
    
    // Create link with full validation
    const result = await RecipeIngredientProductQueries.createLinkWithValidation(req.body);
    
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.errors
      });
    }
    
    console.log('Recipe ingredient link created successfully:', result.data.id);
    
    // Return created link with 201 status
    res.status(201).json({
      message: 'Recipe ingredient link created successfully',
      link: result.data
    });

  } catch (error) {
    // Pass error to error handling middleware
    next(error);
  }
});

/**
 * GET /api/inventory/recipe-links/:recipeId - Get product links for a recipe
 * Requirements: 2.1, 2.2, 2.3
 * 
 * Returns array of links with ingredient and product information
 */
router.get('/recipe-links/:recipeId', async (req, res, next) => {
  try {
    const recipeId = parseInt(req.params.recipeId);
    
    console.log('GET /api/inventory/recipe-links/:recipeId called with ID:', recipeId);
    
    // Validate recipe ID parameter
    if (isNaN(recipeId) || recipeId < 1) {
      return res.status(400).json({
        error: 'Invalid recipe ID. Must be a positive integer.'
      });
    }
    
    const { RecipeIngredientProductQueries } = await import('../utils/inventory-database.js');
    
    // Get recipe product links
    const links = await RecipeIngredientProductQueries.getRecipeProductLinks(recipeId);
    
    console.log(`Retrieved ${links.length} recipe ingredient links for recipe ${recipeId}`);
    
    // Return links data
    res.json({
      recipeId,
      links
    });

  } catch (error) {
    // Pass error to error handling middleware
    next(error);
  }
});

/**
 * DELETE /api/inventory/recipe-links/:id - Remove ingredient-product link
 * Requirements: 2.1, 2.2, 2.3
 * 
 * Permanently removes a link between recipe ingredient and product
 */
router.delete('/recipe-links/:id', async (req, res, next) => {
  try {
    const linkId = parseInt(req.params.id);
    
    console.log('DELETE /api/inventory/recipe-links/:id called with ID:', linkId);
    
    // Validate link ID parameter
    if (isNaN(linkId) || linkId < 1) {
      return res.status(400).json({
        error: 'Invalid link ID. Must be a positive integer.'
      });
    }
    
    const { RecipeIngredientProductQueries } = await import('../utils/inventory-database.js');
    
    // Delete link
    const deleted = await RecipeIngredientProductQueries.deleteLink(linkId);
    
    // Handle link not found
    if (!deleted) {
      return res.status(404).json({
        error: 'Recipe ingredient link not found'
      });
    }
    
    console.log('Recipe ingredient link deleted successfully:', linkId);
    
    // Return success confirmation
    res.json({
      message: 'Recipe ingredient link deleted successfully'
    });

  } catch (error) {
    // Pass error to error handling middleware
    next(error);
  }
});

console.log('Inventory router configured');
module.exports = router;