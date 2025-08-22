const express = require('express');
const router = express.Router();
const { validateCompleteRecipe } = require('../utils/validation');
const { RecipeQueries } = require('../utils/database');
const { createValidationError } = require('../middleware/errorHandler');

console.log('Recipes router module loaded');

/**
 * GET /api/recipes - List all recipes with optional filtering and pagination
 * Requirements: 2.1, 2.3, 2.4, 5.3
 * 
 * Query parameters:
 * - category (optional): Filter by 'food' or 'drink'
 * - search (optional): Search by recipe name (case-insensitive)
 * - page (optional): Page number for pagination (default: 1)
 * - limit (optional): Number of recipes per page (default: 20, max: 100)
 */
router.get('/', async (req, res, next) => {
  try {
    console.log('GET /api/recipes called with query:', req.query);
    
    // Extract and validate query parameters
    const { category, search, page = 1, limit = 20 } = req.query;
    
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
    
    // Validate category parameter
    if (category && !['food', 'drink'].includes(category)) {
      return res.status(400).json({
        error: 'Invalid category parameter. Must be "food" or "drink".'
      });
    }
    
    // Build query options
    const options = {
      category: category || null,
      search: search || null,
      page: pageNum,
      limit: limitNum
    };
    
    // Get recipes and total count
    const [recipes, totalCount] = await Promise.all([
      RecipeQueries.getRecipes(options),
      RecipeQueries.getRecipeCount({ category: options.category, search: options.search })
    ]);
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;
    
    console.log(`Retrieved ${recipes.length} recipes (page ${pageNum}/${totalPages})`);
    
    // Return paginated results with metadata
    res.json({
      recipes,
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
 * POST /api/recipes - Create new recipe
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 5.1, 5.4
 * 
 * Request body should contain:
 * - name (required): Recipe name
 * - description (optional): Recipe description
 * - category (required): 'food' or 'drink'
 * - prep_time (optional): Preparation time in minutes
 * - cook_time (optional): Cooking time in minutes
 * - servings (optional): Number of servings
 * - difficulty (optional): 'easy', 'medium', or 'hard'
 * - ingredients (required): Array of ingredient objects
 * - steps (optional): Array of step objects
 */
router.post('/', async (req, res, next) => {
  try {
    console.log('POST /api/recipes called with data:', req.body);
    
    // Validate request data using validation utilities
    const validation = validateCompleteRecipe(req.body);
    if (!validation.isValid) {
      throw createValidationError(validation.errors);
    }

    // Create recipe using database transaction
    const createdRecipe = await RecipeQueries.createRecipe(req.body);
    
    console.log('Recipe created successfully:', createdRecipe.id);
    
    // Return created recipe with 201 status
    res.status(201).json({
      message: 'Recipe created successfully',
      recipe: createdRecipe
    });

  } catch (error) {
    // Pass error to error handling middleware
    next(error);
  }
});

/**
 * GET /api/recipes/:id - Get single recipe with complete details
 * Requirements: 2.2, 2.5, 5.3
 * 
 * Returns complete recipe data including ingredients and steps
 */
router.get('/:id', async (req, res, next) => {
  try {
    const recipeId = parseInt(req.params.id);
    
    console.log('GET /api/recipes/:id called with ID:', recipeId);
    
    // Validate recipe ID parameter
    if (isNaN(recipeId) || recipeId < 1) {
      return res.status(400).json({
        error: 'Invalid recipe ID. Must be a positive integer.'
      });
    }
    
    // Get recipe with full details
    const recipe = await RecipeQueries.getRecipeById(recipeId);
    
    // Handle recipe not found (Requirement 2.5)
    if (!recipe) {
      return res.status(404).json({
        error: 'Recipe not found'
      });
    }
    
    console.log('Recipe retrieved successfully:', recipe.id);
    
    // Return complete recipe data
    res.json({
      recipe
    });

  } catch (error) {
    // Pass error to error handling middleware
    next(error);
  }
});

/**
 * PUT /api/recipes/:id - Update existing recipe
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 5.4
 * 
 * Updates an existing recipe with new data including ingredients and steps.
 * Supports partial updates and handles ingredient/step additions/removals.
 * 
 * Request body should contain:
 * - name (required): Recipe name
 * - description (optional): Recipe description
 * - category (required): 'food' or 'drink'
 * - prep_time (optional): Preparation time in minutes
 * - cook_time (optional): Cooking time in minutes
 * - servings (optional): Number of servings
 * - difficulty (optional): 'easy', 'medium', or 'hard'
 * - ingredients (required): Array of ingredient objects
 * - steps (optional): Array of step objects
 */
router.put('/:id', async (req, res, next) => {
  try {
    const recipeId = parseInt(req.params.id);
    
    console.log('PUT /api/recipes/:id called with ID:', recipeId, 'and data:', req.body);
    
    // Validate recipe ID parameter (Requirement 3.5)
    if (isNaN(recipeId) || recipeId < 1) {
      return res.status(400).json({
        error: 'Invalid recipe ID. Must be a positive integer.'
      });
    }
    
    // Validate request data using validation utilities (Requirement 3.6, 5.4)
    const validation = validateCompleteRecipe(req.body);
    if (!validation.isValid) {
      throw createValidationError(validation.errors);
    }

    // Update recipe using database transaction (Requirement 3.2, 3.3, 3.4)
    const updatedRecipe = await RecipeQueries.updateRecipe(recipeId, req.body);
    
    // Handle recipe not found (Requirement 3.5)
    if (!updatedRecipe) {
      return res.status(404).json({
        error: 'Recipe not found'
      });
    }
    
    console.log('Recipe updated successfully:', updatedRecipe.id);
    
    // Return updated recipe (Requirement 3.1)
    res.json({
      message: 'Recipe updated successfully',
      recipe: updatedRecipe
    });

  } catch (error) {
    // Pass error to error handling middleware
    next(error);
  }
});

/**
 * DELETE /api/recipes/:id - Delete recipe and all associated data
 * Requirements: 4.1, 4.2, 4.3, 4.4
 * 
 * Permanently removes a recipe and all associated ingredients and steps.
 * Uses CASCADE delete to ensure referential integrity.
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const recipeId = parseInt(req.params.id);
    
    console.log('DELETE /api/recipes/:id called with ID:', recipeId);
    
    // Validate recipe ID parameter (Requirement 4.2)
    if (isNaN(recipeId) || recipeId < 1) {
      return res.status(400).json({
        error: 'Invalid recipe ID. Must be a positive integer.'
      });
    }
    
    // Delete recipe using CASCADE delete (Requirement 4.1)
    const deleted = await RecipeQueries.deleteRecipe(recipeId);
    
    // Handle recipe not found (Requirement 4.2)
    if (!deleted) {
      return res.status(404).json({
        error: 'Recipe not found'
      });
    }
    
    console.log('Recipe deleted successfully:', recipeId);
    
    // Return success confirmation (Requirement 4.3)
    res.json({
      message: 'Recipe deleted successfully'
    });

  } catch (error) {
    // Pass error to error handling middleware
    next(error);
  }
});

console.log('Recipes router configured');
module.exports = router;