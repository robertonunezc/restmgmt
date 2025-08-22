/**
 * Recipe validation utilities
 * Provides validation functions for recipe data according to requirements 6.1-6.6
 */

/**
 * Validates recipe basic fields
 * @param {Object} recipe - Recipe object to validate
 * @returns {Object} - { isValid: boolean, errors: Array }
 */
function validateRecipe(recipe) {
  const errors = [];

  // Requirement 6.1: name is required and between 1-200 characters
  if (!recipe.name || typeof recipe.name !== 'string') {
    errors.push({ field: 'name', message: 'Name is required' });
  } else if (recipe.name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Name cannot be empty' });
  } else if (recipe.name.length > 200) {
    errors.push({ field: 'name', message: 'Name must be 200 characters or less' });
  }

  // Requirement 6.4: category must be 'food' or 'drink'
  if (!recipe.category) {
    errors.push({ field: 'category', message: 'Category is required' });
  } else if (!['food', 'drink'].includes(recipe.category)) {
    errors.push({ field: 'category', message: 'Category must be "food" or "drink"' });
  }

  // Requirement 6.3: preparation times must be positive integers (in minutes)
  if (recipe.prep_time !== undefined && recipe.prep_time !== null) {
    if (!Number.isInteger(recipe.prep_time) || recipe.prep_time < 0) {
      errors.push({ field: 'prep_time', message: 'Preparation time must be a positive integer' });
    }
  }

  if (recipe.cook_time !== undefined && recipe.cook_time !== null) {
    if (!Number.isInteger(recipe.cook_time) || recipe.cook_time < 0) {
      errors.push({ field: 'cook_time', message: 'Cooking time must be a positive integer' });
    }
  }

  // Validate servings if provided
  if (recipe.servings !== undefined && recipe.servings !== null) {
    if (!Number.isInteger(recipe.servings) || recipe.servings <= 0) {
      errors.push({ field: 'servings', message: 'Servings must be a positive integer' });
    }
  }

  // Validate difficulty if provided
  if (recipe.difficulty !== undefined && recipe.difficulty !== null) {
    if (!['easy', 'medium', 'hard'].includes(recipe.difficulty)) {
      errors.push({ field: 'difficulty', message: 'Difficulty must be "easy", "medium", or "hard"' });
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates ingredient data
 * @param {Object} ingredient - Ingredient object to validate
 * @returns {Object} - { isValid: boolean, errors: Array }
 */
function validateIngredient(ingredient) {
  const errors = [];

  // Requirement 6.1: ingredient name is required
  if (!ingredient.name || typeof ingredient.name !== 'string') {
    errors.push({ field: 'name', message: 'Ingredient name is required' });
  } else if (ingredient.name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Ingredient name cannot be empty' });
  }

  // Requirement 6.2: quantities must be positive numbers
  if (ingredient.quantity !== undefined && ingredient.quantity !== null) {
    const quantity = parseFloat(ingredient.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      errors.push({ field: 'quantity', message: 'Quantity must be a positive number' });
    }
  }

  // Validate unit if provided
  if (ingredient.unit !== undefined && ingredient.unit !== null) {
    if (typeof ingredient.unit !== 'string') {
      errors.push({ field: 'unit', message: 'Unit must be a string' });
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates preparation step data
 * @param {Object} step - Step object to validate
 * @returns {Object} - { isValid: boolean, errors: Array }
 */
function validateStep(step) {
  const errors = [];

  // Requirement 6.6: each step must have non-empty instruction text
  if (!step.instruction || typeof step.instruction !== 'string') {
    errors.push({ field: 'instruction', message: 'Step instruction is required' });
  } else if (step.instruction.trim().length === 0) {
    errors.push({ field: 'instruction', message: 'Step instruction cannot be empty' });
  }

  // Validate step number
  if (step.step_number !== undefined && step.step_number !== null) {
    if (!Number.isInteger(step.step_number) || step.step_number <= 0) {
      errors.push({ field: 'step_number', message: 'Step number must be a positive integer' });
    }
  }

  // Validate timing if provided
  if (step.timing !== undefined && step.timing !== null) {
    if (!Number.isInteger(step.timing) || step.timing < 0) {
      errors.push({ field: 'timing', message: 'Step timing must be a non-negative integer' });
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates complete recipe with ingredients and steps
 * @param {Object} recipeData - Complete recipe data including ingredients and steps
 * @returns {Object} - { isValid: boolean, errors: Array }
 */
function validateCompleteRecipe(recipeData) {
  const errors = [];

  // Validate main recipe data
  const recipeValidation = validateRecipe(recipeData);
  if (!recipeValidation.isValid) {
    errors.push(...recipeValidation.errors);
  }

  // Requirement 6.1: at least one ingredient is required
  if (!recipeData.ingredients || !Array.isArray(recipeData.ingredients) || recipeData.ingredients.length === 0) {
    errors.push({ field: 'ingredients', message: 'At least one ingredient is required' });
  } else {
    // Validate each ingredient
    recipeData.ingredients.forEach((ingredient, index) => {
      const ingredientValidation = validateIngredient(ingredient);
      if (!ingredientValidation.isValid) {
        ingredientValidation.errors.forEach(error => {
          errors.push({
            field: `ingredients[${index}].${error.field}`,
            message: error.message
          });
        });
      }
    });
  }

  // Validate steps if provided
  if (recipeData.steps && Array.isArray(recipeData.steps)) {
    recipeData.steps.forEach((step, index) => {
      const stepValidation = validateStep(step);
      if (!stepValidation.isValid) {
        stepValidation.errors.forEach(error => {
          errors.push({
            field: `steps[${index}].${error.field}`,
            message: error.message
          });
        });
      }
    });

    // Validate step numbering is sequential
    const stepNumbers = recipeData.steps
      .filter(step => step.step_number !== undefined && step.step_number !== null)
      .map(step => step.step_number)
      .sort((a, b) => a - b);
    
    for (let i = 0; i < stepNumbers.length; i++) {
      if (stepNumbers[i] !== i + 1) {
        errors.push({ field: 'steps', message: 'Step numbers must be sequential starting from 1' });
        break;
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

module.exports = {
  validateRecipe,
  validateIngredient,
  validateStep,
  validateCompleteRecipe
};