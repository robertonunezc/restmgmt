import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from "vitest";
import { app, pool } from "../server.js";
import request from "supertest";

describe("Recipe API Integration Tests", () => {
  let testRecipeId;

  beforeAll(async () => {
    // Ensure database connection is ready
    await pool.query("SELECT 1");
  });

  afterAll(async () => {
    // Clean up test data and close connections
    if (testRecipeId) {
      await pool.query("DELETE FROM recipes WHERE id = $1", [testRecipeId]);
    }
    await pool.end();
  });

  beforeEach(async () => {
    // Clean up any existing test recipes
    await pool.query("DELETE FROM recipes WHERE name LIKE 'Test Recipe%'");
  });

  describe("POST /api/recipes", () => {
    it("should create a new recipe successfully", async () => {
      const recipeData = {
        name: "Test Recipe - Chocolate Cake",
        description: "A delicious chocolate cake",
        category: "food",
        prep_time: 20,
        cook_time: 45,
        servings: 8,
        difficulty: "medium",
        ingredients: [
          {
            name: "All-purpose flour",
            quantity: 2,
            unit: "cups",
            notes: "Sifted",
          },
          {
            name: "Sugar",
            quantity: 1.5,
            unit: "cups",
          },
          {
            name: "Cocoa powder",
            quantity: 0.75,
            unit: "cups",
          },
        ],
        steps: [
          {
            step_number: 1,
            instruction: "Preheat oven to 350°F (175°C)",
            timing: 5,
          },
          {
            step_number: 2,
            instruction: "Mix all dry ingredients in a large bowl",
            timing: 10,
          },
          {
            step_number: 3,
            instruction:
              "Bake for 45 minutes or until toothpick comes out clean",
            timing: 45,
          },
        ],
      };

      const response = await request(app)
        .post("/api/recipes")
        .send(recipeData)
        .expect(201);

      expect(response.body).toHaveProperty(
        "message",
        "Recipe created successfully"
      );
      expect(response.body).toHaveProperty("recipe");
      expect(response.body.recipe).toHaveProperty("id");
      expect(response.body.recipe.name).toBe(recipeData.name);
      expect(response.body.recipe.category).toBe(recipeData.category);
      expect(response.body.recipe.prep_time).toBe(recipeData.prep_time);
      expect(response.body.recipe.cook_time).toBe(recipeData.cook_time);
      expect(response.body.recipe.servings).toBe(recipeData.servings);
      expect(response.body.recipe.difficulty).toBe(recipeData.difficulty);

      testRecipeId = response.body.recipe.id;

      // Verify ingredients were created
      const ingredientsResult = await pool.query(
        "SELECT * FROM recipe_ingredients WHERE recipe_id = $1 ORDER BY order_index",
        [testRecipeId]
      );
      expect(ingredientsResult.rows).toHaveLength(3);
      expect(ingredientsResult.rows[0].name).toBe("All-purpose flour");
      expect(ingredientsResult.rows[0].quantity).toBe("2.000");
      expect(ingredientsResult.rows[0].unit).toBe("cups");
      expect(ingredientsResult.rows[0].notes).toBe("Sifted");

      // Verify steps were created
      const stepsResult = await pool.query(
        "SELECT * FROM recipe_steps WHERE recipe_id = $1 ORDER BY step_number",
        [testRecipeId]
      );
      expect(stepsResult.rows).toHaveLength(3);
      expect(stepsResult.rows[0].step_number).toBe(1);
      expect(stepsResult.rows[0].instruction).toBe(
        "Preheat oven to 350°F (175°C)"
      );
      expect(stepsResult.rows[0].timing).toBe(5);
    });

    it("should create recipe with minimal required fields", async () => {
      const recipeData = {
        name: "Test Recipe - Simple Salad",
        category: "food",
        ingredients: [
          {
            name: "Lettuce",
          },
        ],
      };

      const response = await request(app)
        .post("/api/recipes")
        .send(recipeData)
        .expect(201);

      expect(response.body.recipe.name).toBe(recipeData.name);
      expect(response.body.recipe.category).toBe(recipeData.category);
      expect(response.body.recipe.prep_time).toBeNull();
      expect(response.body.recipe.cook_time).toBeNull();
      expect(response.body.recipe.servings).toBeNull();
      expect(response.body.recipe.difficulty).toBeNull();

      testRecipeId = response.body.recipe.id;
    });

    it("should auto-assign step numbers if not provided", async () => {
      const recipeData = {
        name: "Test Recipe - Auto Steps",
        category: "food",
        ingredients: [{ name: "Test Ingredient" }],
        steps: [
          { instruction: "First step without number" },
          { instruction: "Second step without number" },
          { instruction: "Third step without number" },
        ],
      };

      const response = await request(app)
        .post("/api/recipes")
        .send(recipeData)
        .expect(201);

      testRecipeId = response.body.recipe.id;

      // Verify steps were assigned sequential numbers
      const stepsResult = await pool.query(
        "SELECT * FROM recipe_steps WHERE recipe_id = $1 ORDER BY step_number",
        [testRecipeId]
      );
      expect(stepsResult.rows).toHaveLength(3);
      expect(stepsResult.rows[0].step_number).toBe(1);
      expect(stepsResult.rows[1].step_number).toBe(2);
      expect(stepsResult.rows[2].step_number).toBe(3);
    });

    it("should return 422 for missing required fields", async () => {
      const recipeData = {
        description: "Missing name and category",
      };

      const response = await request(app)
        .post("/api/recipes")
        .send(recipeData)
        .expect(422);

      expect(response.body).toHaveProperty("error", "Validation failed");
      expect(response.body).toHaveProperty("details");
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: "name",
            message: "Name is required",
          }),
          expect.objectContaining({
            field: "category",
            message: "Category is required",
          }),
          expect.objectContaining({
            field: "ingredients",
            message: "At least one ingredient is required",
          }),
        ])
      );
    });

    it("should return 422 for invalid category", async () => {
      const recipeData = {
        name: "Test Recipe",
        category: "invalid_category",
        ingredients: [{ name: "Test Ingredient" }],
      };

      const response = await request(app)
        .post("/api/recipes")
        .send(recipeData)
        .expect(422);

      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: "category",
            message: 'Category must be "food" or "drink"',
          }),
        ])
      );
    });

    it("should return 422 for invalid ingredient data", async () => {
      const recipeData = {
        name: "Test Recipe",
        category: "food",
        ingredients: [
          { name: "Valid Ingredient" },
          { name: "", quantity: -1 },
          { quantity: 2, unit: "cups" }, // missing name
        ],
      };

      const response = await request(app)
        .post("/api/recipes")
        .send(recipeData)
        .expect(422);

      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: "ingredients[1].name",
            message: "Ingredient name is required",
          }),
          expect.objectContaining({
            field: "ingredients[1].quantity",
            message: "Quantity must be a positive number",
          }),
          expect.objectContaining({
            field: "ingredients[2].name",
            message: "Ingredient name is required",
          }),
        ])
      );
    });

    it("should return 422 for invalid step data", async () => {
      const recipeData = {
        name: "Test Recipe",
        category: "food",
        ingredients: [{ name: "Test Ingredient" }],
        steps: [
          { step_number: 1, instruction: "Valid step" },
          { step_number: 2, instruction: "" }, // empty instruction
          { step_number: 0, instruction: "Invalid step number" }, // invalid step number
        ],
      };

      const response = await request(app)
        .post("/api/recipes")
        .send(recipeData)
        .expect(422);

      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: "steps[1].instruction",
            message: "Step instruction is required",
          }),
          expect.objectContaining({
            field: "steps[2].step_number",
            message: "Step number must be a positive integer",
          }),
        ])
      );
    });

    it("should return 422 for non-sequential step numbers", async () => {
      const recipeData = {
        name: "Test Recipe",
        category: "food",
        ingredients: [{ name: "Test Ingredient" }],
        steps: [
          { step_number: 1, instruction: "First step" },
          { step_number: 3, instruction: "Third step" }, // skipping step 2
        ],
      };

      const response = await request(app)
        .post("/api/recipes")
        .send(recipeData)
        .expect(422);

      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: "steps",
            message: "Step numbers must be sequential starting from 1",
          }),
        ])
      );
    });

    it("should return 400 for invalid JSON", async () => {
      const response = await request(app)
        .post("/api/recipes")
        .send("invalid json")
        .set("Content-Type", "application/json");

      expect(response.status).toBe(400);
    });

    it("should handle database errors gracefully", async () => {
      // Create a recipe with extremely long name to trigger database constraint
      const recipeData = {
        name: "x".repeat(300), // Exceeds database limit
        category: "food",
        ingredients: [{ name: "Test Ingredient" }],
      };

      const response = await request(app).post("/api/recipes").send(recipeData);

      // The validation should catch the long name and return 422, not 500
      expect(response.status).toBe(422);
      expect(response.body).toHaveProperty("error", "Validation failed");
    });
  });

  describe("GET /api/recipes", () => {
    let testRecipes = [];

    beforeEach(async () => {
      // Clean up all existing test recipes first
      await pool.query("DELETE FROM recipes WHERE name LIKE 'Test Recipe%'");

      // Create test recipes for listing tests
      const testData = [
        {
          name: "Test Recipe - Pasta",
          category: "food",
          prep_time: 15,
          cook_time: 20,
          servings: 4,
          difficulty: "easy",
          ingredients: [{ name: "Pasta" }, { name: "Tomato Sauce" }],
          steps: [{ instruction: "Boil pasta" }, { instruction: "Add sauce" }],
        },
        {
          name: "Test Recipe - Smoothie",
          category: "drink",
          prep_time: 5,
          servings: 2,
          difficulty: "easy",
          ingredients: [{ name: "Banana" }, { name: "Milk" }],
          steps: [{ instruction: "Blend ingredients" }],
        },
        {
          name: "Test Recipe - Pizza",
          category: "food",
          prep_time: 30,
          cook_time: 15,
          servings: 6,
          difficulty: "medium",
          ingredients: [
            { name: "Dough" },
            { name: "Cheese" },
            { name: "Tomato Sauce" },
          ],
          steps: [
            { instruction: "Roll dough" },
            { instruction: "Add toppings" },
            { instruction: "Bake" },
          ],
        },
      ];

      for (const recipe of testData) {
        const response = await request(app).post("/api/recipes").send(recipe);
        testRecipes.push(response.body.recipe);
      }
    });

    afterEach(async () => {
      // Clean up test recipes
      for (const recipe of testRecipes) {
        await pool.query("DELETE FROM recipes WHERE id = $1", [recipe.id]);
      }
      testRecipes = [];
    });

    it("should list all recipes with pagination", async () => {
      const response = await request(app).get("/api/recipes").expect(200);

      expect(response.body).toHaveProperty("recipes");
      expect(response.body).toHaveProperty("pagination");
      expect(response.body.recipes).toHaveLength(3);
      expect(response.body.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 3,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      });

      // Check recipe structure
      const recipe = response.body.recipes[0];
      expect(recipe).toHaveProperty("id");
      expect(recipe).toHaveProperty("name");
      expect(recipe).toHaveProperty("category");
      expect(recipe).toHaveProperty("ingredient_count");
      expect(recipe).toHaveProperty("step_count");
    });

    it("should filter recipes by category", async () => {
      const response = await request(app)
        .get("/api/recipes?category=food")
        .expect(200);

      expect(response.body.recipes).toHaveLength(2);
      expect(response.body.pagination.total).toBe(2);

      // All returned recipes should be food category
      response.body.recipes.forEach((recipe) => {
        expect(recipe.category).toBe("food");
      });
    });

    it("should search recipes by name", async () => {
      const response = await request(app)
        .get("/api/recipes?search=pasta")
        .expect(200);

      expect(response.body.recipes).toHaveLength(1);
      expect(response.body.recipes[0].name).toContain("Pasta");
      expect(response.body.pagination.total).toBe(1);
    });

    it("should search recipes case-insensitively", async () => {
      const response = await request(app)
        .get("/api/recipes?search=SMOOTHIE")
        .expect(200);

      expect(response.body.recipes).toHaveLength(1);
      expect(response.body.recipes[0].name).toContain("Smoothie");
    });

    it("should combine category filter and search", async () => {
      const response = await request(app)
        .get("/api/recipes?category=food&search=pizza")
        .expect(200);

      expect(response.body.recipes).toHaveLength(1);
      expect(response.body.recipes[0].name).toContain("Pizza");
      expect(response.body.recipes[0].category).toBe("food");
    });

    it("should handle pagination with custom page and limit", async () => {
      const response = await request(app)
        .get("/api/recipes?page=1&limit=2")
        .expect(200);

      expect(response.body.recipes).toHaveLength(2);
      expect(response.body.pagination).toEqual({
        page: 1,
        limit: 2,
        total: 3,
        totalPages: 2,
        hasNextPage: true,
        hasPrevPage: false,
      });
    });

    it("should handle second page of pagination", async () => {
      const response = await request(app)
        .get("/api/recipes?page=2&limit=2")
        .expect(200);

      expect(response.body.recipes).toHaveLength(1);
      expect(response.body.pagination).toEqual({
        page: 2,
        limit: 2,
        total: 3,
        totalPages: 2,
        hasNextPage: false,
        hasPrevPage: true,
      });
    });

    it("should return empty results for non-matching search", async () => {
      const response = await request(app)
        .get("/api/recipes?search=nonexistent")
        .expect(200);

      expect(response.body.recipes).toHaveLength(0);
      expect(response.body.pagination.total).toBe(0);
    });

    it("should return 400 for invalid page parameter", async () => {
      const response = await request(app)
        .get("/api/recipes?page=invalid")
        .expect(400);

      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("Invalid page parameter");
    });

    it("should return 400 for invalid limit parameter", async () => {
      const response = await request(app)
        .get("/api/recipes?limit=0")
        .expect(400);

      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("Invalid limit parameter");
    });

    it("should return 400 for limit exceeding maximum", async () => {
      const response = await request(app)
        .get("/api/recipes?limit=101")
        .expect(400);

      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("Invalid limit parameter");
    });

    it("should return 400 for invalid category", async () => {
      const response = await request(app)
        .get("/api/recipes?category=invalid")
        .expect(400);

      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("Invalid category parameter");
    });
  });

  describe("GET /api/recipes/:id", () => {
    let testRecipe;

    beforeEach(async () => {
      // Clean up all existing test recipes first
      await pool.query("DELETE FROM recipes WHERE name LIKE 'Test Recipe%'");

      // Create a test recipe with full details
      const recipeData = {
        name: "Test Recipe - Detailed Cake",
        description: "A detailed test recipe",
        category: "food",
        prep_time: 25,
        cook_time: 40,
        servings: 8,
        difficulty: "medium",
        ingredients: [
          {
            name: "Flour",
            quantity: 2,
            unit: "cups",
            notes: "All-purpose",
            order_index: 1,
          },
          {
            name: "Sugar",
            quantity: 1.5,
            unit: "cups",
            order_index: 2,
          },
          {
            name: "Eggs",
            quantity: 3,
            unit: "pieces",
            order_index: 3,
          },
        ],
        steps: [
          {
            step_number: 1,
            instruction: "Preheat oven to 350°F",
            timing: 5,
          },
          {
            step_number: 2,
            instruction: "Mix dry ingredients",
            timing: 10,
          },
          {
            step_number: 3,
            instruction: "Add wet ingredients and mix",
            timing: 15,
          },
          {
            step_number: 4,
            instruction: "Bake for 40 minutes",
            timing: 40,
          },
        ],
      };

      const response = await request(app).post("/api/recipes").send(recipeData);
      testRecipe = response.body.recipe;
    });

    afterEach(async () => {
      // Clean up test recipe
      if (testRecipe) {
        await pool.query("DELETE FROM recipes WHERE id = $1", [testRecipe.id]);
      }
    });

    it("should get recipe with complete details", async () => {
      const response = await request(app)
        .get(`/api/recipes/${testRecipe.id}`)
        .expect(200);

      expect(response.body).toHaveProperty("recipe");
      const recipe = response.body.recipe;

      // Check main recipe data
      expect(recipe.id).toBe(testRecipe.id);
      expect(recipe.name).toBe("Test Recipe - Detailed Cake");
      expect(recipe.description).toBe("A detailed test recipe");
      expect(recipe.category).toBe("food");
      expect(recipe.prep_time).toBe(25);
      expect(recipe.cook_time).toBe(40);
      expect(recipe.servings).toBe(8);
      expect(recipe.difficulty).toBe("medium");

      // Check ingredients
      expect(recipe.ingredients).toHaveLength(3);
      expect(recipe.ingredients[0]).toEqual(
        expect.objectContaining({
          name: "Flour",
          quantity: "2.000",
          unit: "cups",
          notes: "All-purpose",
          order_index: 1,
        })
      );

      // Check steps
      expect(recipe.steps).toHaveLength(4);
      expect(recipe.steps[0]).toEqual(
        expect.objectContaining({
          step_number: 1,
          instruction: "Preheat oven to 350°F",
          timing: 5,
        })
      );
      expect(recipe.steps[3]).toEqual(
        expect.objectContaining({
          step_number: 4,
          instruction: "Bake for 40 minutes",
          timing: 40,
        })
      );
    });

    it("should return 404 for non-existent recipe", async () => {
      const response = await request(app).get("/api/recipes/99999").expect(404);

      expect(response.body).toHaveProperty("error", "Recipe not found");
    });

    it("should return 400 for invalid recipe ID", async () => {
      const response = await request(app)
        .get("/api/recipes/invalid")
        .expect(400);

      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("Invalid recipe ID");
    });

    it("should return 400 for negative recipe ID", async () => {
      const response = await request(app).get("/api/recipes/-1").expect(400);

      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("Invalid recipe ID");
    });

    it("should return 400 for zero recipe ID", async () => {
      const response = await request(app).get("/api/recipes/0").expect(400);

      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("Invalid recipe ID");
    });
  });

  describe("PUT /api/recipes/:id", () => {
    let testRecipe;

    beforeEach(async () => {
      // Clean up all existing test recipes first
      await pool.query("DELETE FROM recipes WHERE name LIKE 'Test Recipe%'");

      // Create a test recipe to update
      const recipeData = {
        name: "Test Recipe - Original",
        description: "Original description",
        category: "food",
        prep_time: 20,
        cook_time: 30,
        servings: 4,
        difficulty: "easy",
        ingredients: [
          {
            name: "Original Ingredient 1",
            quantity: 1,
            unit: "cup",
            notes: "Original notes",
          },
          {
            name: "Original Ingredient 2",
            quantity: 2,
            unit: "pieces",
          },
        ],
        steps: [
          {
            step_number: 1,
            instruction: "Original step 1",
            timing: 10,
          },
          {
            step_number: 2,
            instruction: "Original step 2",
            timing: 20,
          },
        ],
      };

      const response = await request(app).post("/api/recipes").send(recipeData);
      testRecipe = response.body.recipe;
    });

    afterEach(async () => {
      // Clean up test recipe
      if (testRecipe) {
        await pool.query("DELETE FROM recipes WHERE id = $1", [testRecipe.id]);
      }
    });

    it("should update recipe with complete new data", async () => {
      const updateData = {
        name: "Test Recipe - Updated",
        description: "Updated description",
        category: "drink",
        prep_time: 15,
        cook_time: 25,
        servings: 6,
        difficulty: "medium",
        ingredients: [
          {
            name: "Updated Ingredient 1",
            quantity: 1.5,
            unit: "liters",
            notes: "Updated notes",
          },
          {
            name: "Updated Ingredient 2",
            quantity: 3,
            unit: "tablespoons",
          },
          {
            name: "New Ingredient 3",
            quantity: 0.5,
            unit: "cups",
          },
        ],
        steps: [
          {
            step_number: 1,
            instruction: "Updated step 1",
            timing: 5,
          },
          {
            step_number: 2,
            instruction: "Updated step 2",
            timing: 10,
          },
          {
            step_number: 3,
            instruction: "New step 3",
            timing: 10,
          },
        ],
      };

      const response = await request(app)
        .put(`/api/recipes/${testRecipe.id}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty(
        "message",
        "Recipe updated successfully"
      );
      expect(response.body).toHaveProperty("recipe");

      const updatedRecipe = response.body.recipe;
      expect(updatedRecipe.id).toBe(testRecipe.id);
      expect(updatedRecipe.name).toBe(updateData.name);
      expect(updatedRecipe.description).toBe(updateData.description);
      expect(updatedRecipe.category).toBe(updateData.category);
      expect(updatedRecipe.prep_time).toBe(updateData.prep_time);
      expect(updatedRecipe.cook_time).toBe(updateData.cook_time);
      expect(updatedRecipe.servings).toBe(updateData.servings);
      expect(updatedRecipe.difficulty).toBe(updateData.difficulty);

      // Verify ingredients were updated in database
      const ingredientsResult = await pool.query(
        "SELECT * FROM recipe_ingredients WHERE recipe_id = $1 ORDER BY order_index",
        [testRecipe.id]
      );
      expect(ingredientsResult.rows).toHaveLength(3);
      expect(ingredientsResult.rows[0].name).toBe("Updated Ingredient 1");
      expect(ingredientsResult.rows[0].quantity).toBe("1.500");
      expect(ingredientsResult.rows[0].unit).toBe("liters");
      expect(ingredientsResult.rows[2].name).toBe("New Ingredient 3");

      // Verify steps were updated in database
      const stepsResult = await pool.query(
        "SELECT * FROM recipe_steps WHERE recipe_id = $1 ORDER BY step_number",
        [testRecipe.id]
      );
      expect(stepsResult.rows).toHaveLength(3);
      expect(stepsResult.rows[0].instruction).toBe("Updated step 1");
      expect(stepsResult.rows[2].instruction).toBe("New step 3");
    });

    it("should handle partial updates (fewer ingredients and steps)", async () => {
      const updateData = {
        name: "Test Recipe - Simplified",
        category: "food",
        ingredients: [
          {
            name: "Single Ingredient",
            quantity: 1,
            unit: "piece",
          },
        ],
        steps: [
          {
            step_number: 1,
            instruction: "Single step",
          },
        ],
      };

      const response = await request(app)
        .put(`/api/recipes/${testRecipe.id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.recipe.name).toBe(updateData.name);

      // Verify old ingredients/steps were removed and new ones added
      const ingredientsResult = await pool.query(
        "SELECT * FROM recipe_ingredients WHERE recipe_id = $1",
        [testRecipe.id]
      );
      expect(ingredientsResult.rows).toHaveLength(1);
      expect(ingredientsResult.rows[0].name).toBe("Single Ingredient");

      const stepsResult = await pool.query(
        "SELECT * FROM recipe_steps WHERE recipe_id = $1",
        [testRecipe.id]
      );
      expect(stepsResult.rows).toHaveLength(1);
      expect(stepsResult.rows[0].instruction).toBe("Single step");
    });

    it("should handle updates with more ingredients and steps", async () => {
      const updateData = {
        name: "Test Recipe - Expanded",
        category: "food",
        ingredients: [
          { name: "Ingredient 1" },
          { name: "Ingredient 2" },
          { name: "Ingredient 3" },
          { name: "Ingredient 4" },
          { name: "Ingredient 5" },
        ],
        steps: [
          { step_number: 1, instruction: "Step 1" },
          { step_number: 2, instruction: "Step 2" },
          { step_number: 3, instruction: "Step 3" },
          { step_number: 4, instruction: "Step 4" },
        ],
      };

      const response = await request(app)
        .put(`/api/recipes/${testRecipe.id}`)
        .send(updateData)
        .expect(200);

      // Verify all new ingredients and steps were added
      const ingredientsResult = await pool.query(
        "SELECT * FROM recipe_ingredients WHERE recipe_id = $1",
        [testRecipe.id]
      );
      expect(ingredientsResult.rows).toHaveLength(5);

      const stepsResult = await pool.query(
        "SELECT * FROM recipe_steps WHERE recipe_id = $1",
        [testRecipe.id]
      );
      expect(stepsResult.rows).toHaveLength(4);
    });

    it("should update recipe with minimal required fields only", async () => {
      const updateData = {
        name: "Test Recipe - Minimal Update",
        category: "drink",
        ingredients: [{ name: "Water" }],
      };

      const response = await request(app)
        .put(`/api/recipes/${testRecipe.id}`)
        .send(updateData)
        .expect(200);

      const updatedRecipe = response.body.recipe;
      expect(updatedRecipe.name).toBe(updateData.name);
      expect(updatedRecipe.category).toBe(updateData.category);
      expect(updatedRecipe.prep_time).toBeNull();
      expect(updatedRecipe.cook_time).toBeNull();
      expect(updatedRecipe.servings).toBeNull();
      expect(updatedRecipe.difficulty).toBeNull();
    });

    it("should return 404 for non-existent recipe", async () => {
      const updateData = {
        name: "Test Recipe - Non-existent",
        category: "food",
        ingredients: [{ name: "Test Ingredient" }],
      };

      const response = await request(app)
        .put("/api/recipes/99999")
        .send(updateData)
        .expect(404);

      expect(response.body).toHaveProperty("error", "Recipe not found");
    });

    it("should return 400 for invalid recipe ID", async () => {
      const updateData = {
        name: "Test Recipe",
        category: "food",
        ingredients: [{ name: "Test Ingredient" }],
      };

      const response = await request(app)
        .put("/api/recipes/invalid")
        .send(updateData)
        .expect(400);

      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("Invalid recipe ID");
    });

    it("should return 422 for validation failures", async () => {
      const updateData = {
        name: "", // Invalid empty name
        category: "invalid_category", // Invalid category
        ingredients: [], // No ingredients
      };

      const response = await request(app)
        .put(`/api/recipes/${testRecipe.id}`)
        .send(updateData)
        .expect(422);

      expect(response.body).toHaveProperty("error", "Validation failed");
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: "name",
            message: "Name is required",
          }),
          expect.objectContaining({
            field: "category",
            message: 'Category must be "food" or "drink"',
          }),
          expect.objectContaining({
            field: "ingredients",
            message: "At least one ingredient is required",
          }),
        ])
      );
    });
  });

  describe("DELETE /api/recipes/:id", () => {
    let testRecipe;

    beforeEach(async () => {
      // Clean up all existing test recipes first
      await pool.query("DELETE FROM recipes WHERE name LIKE 'Test Recipe%'");

      // Create a test recipe to delete
      const recipeData = {
        name: "Test Recipe - To Delete",
        description: "A recipe that will be deleted",
        category: "food",
        prep_time: 15,
        cook_time: 20,
        servings: 4,
        difficulty: "easy",
        ingredients: [
          {
            name: "Test Ingredient 1",
            quantity: 1,
            unit: "cup",
            notes: "Test notes",
          },
          {
            name: "Test Ingredient 2",
            quantity: 2,
            unit: "pieces",
          },
        ],
        steps: [
          {
            step_number: 1,
            instruction: "Test step 1",
            timing: 10,
          },
          {
            step_number: 2,
            instruction: "Test step 2",
            timing: 10,
          },
        ],
      };

      const response = await request(app).post("/api/recipes").send(recipeData);
      testRecipe = response.body.recipe;
    });

    afterEach(async () => {
      // Clean up any remaining test recipe (in case test failed)
      if (testRecipe) {
        await pool.query("DELETE FROM recipes WHERE id = $1", [testRecipe.id]);
      }
    });

    it("should delete recipe and all associated data successfully", async () => {
      // Verify recipe exists before deletion
      const beforeResult = await pool.query(
        "SELECT * FROM recipes WHERE id = $1",
        [testRecipe.id]
      );
      expect(beforeResult.rows).toHaveLength(1);

      // Verify ingredients exist
      const ingredientsBeforeResult = await pool.query(
        "SELECT * FROM recipe_ingredients WHERE recipe_id = $1",
        [testRecipe.id]
      );
      expect(ingredientsBeforeResult.rows).toHaveLength(2);

      // Verify steps exist
      const stepsBeforeResult = await pool.query(
        "SELECT * FROM recipe_steps WHERE recipe_id = $1",
        [testRecipe.id]
      );
      expect(stepsBeforeResult.rows).toHaveLength(2);

      // Delete the recipe
      const response = await request(app)
        .delete(`/api/recipes/${testRecipe.id}`)
        .expect(200);

      expect(response.body).toHaveProperty(
        "message",
        "Recipe deleted successfully"
      );

      // Verify recipe was deleted
      const afterResult = await pool.query(
        "SELECT * FROM recipes WHERE id = $1",
        [testRecipe.id]
      );
      expect(afterResult.rows).toHaveLength(0);

      // Verify ingredients were deleted (CASCADE)
      const ingredientsAfterResult = await pool.query(
        "SELECT * FROM recipe_ingredients WHERE recipe_id = $1",
        [testRecipe.id]
      );
      expect(ingredientsAfterResult.rows).toHaveLength(0);

      // Verify steps were deleted (CASCADE)
      const stepsAfterResult = await pool.query(
        "SELECT * FROM recipe_steps WHERE recipe_id = $1",
        [testRecipe.id]
      );
      expect(stepsAfterResult.rows).toHaveLength(0);

      // Clear testRecipe to prevent cleanup in afterEach
      testRecipe = null;
    });

    it("should return 404 for non-existent recipe", async () => {
      const response = await request(app)
        .delete("/api/recipes/99999")
        .expect(404);

      expect(response.body).toHaveProperty("error", "Recipe not found");
    });

    it("should return 400 for invalid recipe ID", async () => {
      const response = await request(app)
        .delete("/api/recipes/invalid")
        .expect(400);

      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("Invalid recipe ID");
    });

    it("should return 400 for negative recipe ID", async () => {
      const response = await request(app).delete("/api/recipes/-1").expect(400);

      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("Invalid recipe ID");
    });

    it("should return 400 for zero recipe ID", async () => {
      const response = await request(app).delete("/api/recipes/0").expect(400);

      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("Invalid recipe ID");
    });

    it("should handle multiple deletion attempts gracefully", async () => {
      // First deletion should succeed
      const firstResponse = await request(app)
        .delete(`/api/recipes/${testRecipe.id}`)
        .expect(200);

      expect(firstResponse.body).toHaveProperty(
        "message",
        "Recipe deleted successfully"
      );

      // Second deletion should return 404
      const secondResponse = await request(app)
        .delete(`/api/recipes/${testRecipe.id}`)
        .expect(404);

      expect(secondResponse.body).toHaveProperty("error", "Recipe not found");

      // Clear testRecipe to prevent cleanup in afterEach
      testRecipe = null;
    });

    it("should delete recipe with minimal data (no steps)", async () => {
      // Create a recipe with only ingredients, no steps
      const minimalRecipeData = {
        name: "Test Recipe - Minimal for Delete",
        category: "food",
        ingredients: [{ name: "Single Ingredient" }],
      };

      const createResponse = await request(app)
        .post("/api/recipes")
        .send(minimalRecipeData);

      const minimalRecipe = createResponse.body.recipe;

      // Delete the minimal recipe
      const deleteResponse = await request(app)
        .delete(`/api/recipes/${minimalRecipe.id}`)
        .expect(200);

      expect(deleteResponse.body).toHaveProperty(
        "message",
        "Recipe deleted successfully"
      );

      // Verify recipe was deleted
      const afterResult = await pool.query(
        "SELECT * FROM recipes WHERE id = $1",
        [minimalRecipe.id]
      );
      expect(afterResult.rows).toHaveLength(0);
    });
  });
});
