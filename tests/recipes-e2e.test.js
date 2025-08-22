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

describe("Recipe API End-to-End Tests", () => {
  let testRecipeIds = [];

  beforeAll(async () => {
    // Ensure database connection is ready
    await pool.query("SELECT 1");
  });

  afterAll(async () => {
    // Clean up all test data
    if (testRecipeIds.length > 0) {
      await pool.query(
        `DELETE FROM recipes WHERE id = ANY($1)`,
        [testRecipeIds]
      );
    }
    await pool.end();
  });

  beforeEach(async () => {
    // Clean up any existing test recipes
    await pool.query("DELETE FROM recipes WHERE name LIKE 'E2E Test Recipe%'");
    testRecipeIds = [];
  });

  afterEach(async () => {
    // Clean up test recipes created during tests
    if (testRecipeIds.length > 0) {
      await pool.query(
        `DELETE FROM recipes WHERE id = ANY($1)`,
        [testRecipeIds]
      );
      testRecipeIds = [];
    }
  });

  describe("Complete CRUD Workflow Tests", () => {
    it("should complete full recipe lifecycle: create -> read -> update -> delete", async () => {
      // Step 1: Create a recipe
      const initialRecipeData = {
        name: "E2E Test Recipe - Lifecycle Test",
        description: "Testing complete lifecycle",
        category: "food",
        prep_time: 15,
        cook_time: 30,
        servings: 4,
        difficulty: "medium",
        ingredients: [
          {
            name: "Chicken breast",
            quantity: 2,
            unit: "pieces",
            notes: "Boneless, skinless",
          },
          {
            name: "Olive oil",
            quantity: 2,
            unit: "tablespoons",
          },
          {
            name: "Salt",
            quantity: 1,
            unit: "teaspoon",
          },
        ],
        steps: [
          {
            step_number: 1,
            instruction: "Season chicken with salt",
            timing: 5,
          },
          {
            step_number: 2,
            instruction: "Heat olive oil in pan",
            timing: 2,
          },
          {
            step_number: 3,
            instruction: "Cook chicken for 15 minutes each side",
            timing: 30,
          },
        ],
      };

      const createResponse = await request(app)
        .post("/api/recipes")
        .send(initialRecipeData)
        .expect(201);

      expect(createResponse.body.message).toBe("Recipe created successfully");
      const recipeId = createResponse.body.recipe.id;
      testRecipeIds.push(recipeId);

      // Step 2: Read the created recipe
      const readResponse = await request(app)
        .get(`/api/recipes/${recipeId}`)
        .expect(200);

      const recipe = readResponse.body.recipe;
      expect(recipe.name).toBe(initialRecipeData.name);
      expect(recipe.ingredients).toHaveLength(3);
      expect(recipe.steps).toHaveLength(3);
      expect(recipe.ingredients[0].name).toBe("Chicken breast");
      expect(recipe.steps[0].instruction).toBe("Season chicken with salt");

      // Step 3: Update the recipe
      const updateData = {
        name: "E2E Test Recipe - Updated Lifecycle Test",
        description: "Updated description for lifecycle test",
        category: "food",
        prep_time: 20,
        cook_time: 35,
        servings: 6,
        difficulty: "easy",
        ingredients: [
          {
            name: "Chicken thighs",
            quantity: 4,
            unit: "pieces",
            notes: "Bone-in, skin-on",
          },
          {
            name: "Butter",
            quantity: 3,
            unit: "tablespoons",
          },
          {
            name: "Black pepper",
            quantity: 0.5,
            unit: "teaspoon",
          },
          {
            name: "Garlic powder",
            quantity: 1,
            unit: "teaspoon",
          },
        ],
        steps: [
          {
            step_number: 1,
            instruction: "Season chicken with pepper and garlic powder",
            timing: 5,
          },
          {
            step_number: 2,
            instruction: "Melt butter in pan over medium heat",
            timing: 3,
          },
          {
            step_number: 3,
            instruction: "Cook chicken skin-side down for 20 minutes",
            timing: 20,
          },
          {
            step_number: 4,
            instruction: "Flip and cook for 15 more minutes",
            timing: 15,
          },
        ],
      };

      const updateResponse = await request(app)
        .put(`/api/recipes/${recipeId}`)
        .send(updateData)
        .expect(200);

      expect(updateResponse.body.message).toBe("Recipe updated successfully");
      expect(updateResponse.body.recipe.name).toBe(updateData.name);
      expect(updateResponse.body.recipe.servings).toBe(6);

      // Verify update in database
      const updatedReadResponse = await request(app)
        .get(`/api/recipes/${recipeId}`)
        .expect(200);

      const updatedRecipe = updatedReadResponse.body.recipe;
      expect(updatedRecipe.ingredients).toHaveLength(4);
      expect(updatedRecipe.steps).toHaveLength(4);
      expect(updatedRecipe.ingredients[0].name).toBe("Chicken thighs");
      expect(updatedRecipe.steps[3].instruction).toBe(
        "Flip and cook for 15 more minutes"
      );

      // Step 4: Delete the recipe
      const deleteResponse = await request(app)
        .delete(`/api/recipes/${recipeId}`)
        .expect(200);

      expect(deleteResponse.body.message).toBe("Recipe deleted successfully");

      // Verify deletion
      await request(app).get(`/api/recipes/${recipeId}`).expect(404);

      // Remove from cleanup list since it's already deleted
      testRecipeIds = testRecipeIds.filter((id) => id !== recipeId);
    });

    it("should handle complex recipe with many ingredients and steps", async () => {
      const complexRecipeData = {
        name: "E2E Test Recipe - Complex Lasagna",
        description: "A complex multi-layer lasagna recipe",
        category: "food",
        prep_time: 45,
        cook_time: 60,
        servings: 12,
        difficulty: "hard",
        ingredients: [
          { name: "Lasagna noodles", quantity: 1, unit: "box" },
          { name: "Ground beef", quantity: 1, unit: "pound" },
          { name: "Italian sausage", quantity: 0.5, unit: "pound" },
          { name: "Onion", quantity: 1, unit: "large" },
          { name: "Garlic cloves", quantity: 4, unit: "pieces" },
          { name: "Crushed tomatoes", quantity: 28, unit: "oz can" },
          { name: "Tomato paste", quantity: 6, unit: "oz can" },
          { name: "Ricotta cheese", quantity: 15, unit: "oz container" },
          { name: "Mozzarella cheese", quantity: 16, unit: "oz shredded" },
          { name: "Parmesan cheese", quantity: 1, unit: "cup grated" },
          { name: "Eggs", quantity: 2, unit: "large" },
          { name: "Fresh basil", quantity: 0.25, unit: "cup chopped" },
          { name: "Italian seasoning", quantity: 2, unit: "teaspoons" },
          { name: "Salt", quantity: 1, unit: "teaspoon" },
          { name: "Black pepper", quantity: 0.5, unit: "teaspoon" },
        ],
        steps: [
          {
            step_number: 1,
            instruction: "Preheat oven to 375°F",
            timing: 5,
          },
          {
            step_number: 2,
            instruction: "Cook lasagna noodles according to package directions",
            timing: 12,
          },
          {
            step_number: 3,
            instruction: "Brown ground beef and sausage with onion and garlic",
            timing: 15,
          },
          {
            step_number: 4,
            instruction: "Add crushed tomatoes, tomato paste, and seasonings",
            timing: 5,
          },
          {
            step_number: 5,
            instruction: "Simmer meat sauce for 20 minutes",
            timing: 20,
          },
          {
            step_number: 6,
            instruction: "Mix ricotta, eggs, basil, salt, and pepper",
            timing: 5,
          },
          {
            step_number: 7,
            instruction: "Layer sauce, noodles, ricotta mixture, and mozzarella",
            timing: 15,
          },
          {
            step_number: 8,
            instruction: "Repeat layers twice more",
            timing: 10,
          },
          {
            step_number: 9,
            instruction: "Top with remaining mozzarella and Parmesan",
            timing: 3,
          },
          {
            step_number: 10,
            instruction: "Cover with foil and bake for 45 minutes",
            timing: 45,
          },
          {
            step_number: 11,
            instruction: "Remove foil and bake 15 more minutes",
            timing: 15,
          },
          {
            step_number: 12,
            instruction: "Let rest for 10 minutes before serving",
            timing: 10,
          },
        ],
      };

      const response = await request(app)
        .post("/api/recipes")
        .send(complexRecipeData)
        .expect(201);

      const recipeId = response.body.recipe.id;
      testRecipeIds.push(recipeId);

      // Verify all ingredients and steps were created
      const fullRecipe = await request(app)
        .get(`/api/recipes/${recipeId}`)
        .expect(200);

      expect(fullRecipe.body.recipe.ingredients).toHaveLength(15);
      expect(fullRecipe.body.recipe.steps).toHaveLength(12);
      expect(fullRecipe.body.recipe.name).toBe(complexRecipeData.name);
      expect(fullRecipe.body.recipe.difficulty).toBe("hard");
    });

    it("should handle drink recipe workflow", async () => {
      const drinkRecipeData = {
        name: "E2E Test Recipe - Craft Cocktail",
        description: "A sophisticated craft cocktail",
        category: "drink",
        prep_time: 5,
        servings: 1,
        difficulty: "medium",
        ingredients: [
          { name: "Bourbon whiskey", quantity: 2, unit: "oz" },
          { name: "Sweet vermouth", quantity: 1, unit: "oz" },
          { name: "Angostura bitters", quantity: 2, unit: "dashes" },
          { name: "Maraschino cherry", quantity: 1, unit: "piece" },
          { name: "Orange peel", quantity: 1, unit: "piece" },
          { name: "Ice cubes", quantity: 1, unit: "cup" },
        ],
        steps: [
          {
            step_number: 1,
            instruction: "Fill mixing glass with ice",
            timing: 1,
          },
          {
            step_number: 2,
            instruction: "Add bourbon, vermouth, and bitters",
            timing: 1,
          },
          {
            step_number: 3,
            instruction: "Stir for 30 seconds",
            timing: 1,
          },
          {
            step_number: 4,
            instruction: "Strain into chilled coupe glass",
            timing: 1,
          },
          {
            step_number: 5,
            instruction: "Garnish with cherry and orange peel",
            timing: 1,
          },
        ],
      };

      const response = await request(app)
        .post("/api/recipes")
        .send(drinkRecipeData)
        .expect(201);

      const recipeId = response.body.recipe.id;
      testRecipeIds.push(recipeId);

      expect(response.body.recipe.category).toBe("drink");
      expect(response.body.recipe.cook_time).toBeNull(); // Drinks typically don't have cook time

      // Test filtering by drink category
      const drinkListResponse = await request(app)
        .get("/api/recipes?category=drink")
        .expect(200);

      const drinkRecipes = drinkListResponse.body.recipes.filter(
        (r) => r.name === drinkRecipeData.name
      );
      expect(drinkRecipes).toHaveLength(1);
    });
  });

  describe("Error Condition Workflows", () => {
    it("should handle complete error scenarios in sequence", async () => {
      // Test 1: Try to create invalid recipe
      const invalidRecipe = {
        name: "", // Invalid: empty name
        category: "invalid", // Invalid: bad category
        ingredients: [], // Invalid: no ingredients
      };

      await request(app)
        .post("/api/recipes")
        .send(invalidRecipe)
        .expect(422);

      // Test 2: Try to get non-existent recipe
      await request(app).get("/api/recipes/99999").expect(404);

      // Test 3: Try to update non-existent recipe
      const updateData = {
        name: "Non-existent Recipe",
        category: "food",
        ingredients: [{ name: "Test" }],
      };

      await request(app)
        .put("/api/recipes/99999")
        .send(updateData)
        .expect(404);

      // Test 4: Try to delete non-existent recipe
      await request(app).delete("/api/recipes/99999").expect(404);

      // Test 5: Invalid query parameters
      await request(app).get("/api/recipes?page=invalid").expect(400);
      await request(app).get("/api/recipes?limit=0").expect(400);
      await request(app).get("/api/recipes?category=invalid").expect(400);
    });

    it("should handle transaction rollback scenarios", async () => {
      // Create a recipe first
      const validRecipe = {
        name: "E2E Test Recipe - Transaction Test",
        category: "food",
        ingredients: [{ name: "Test Ingredient" }],
        steps: [{ instruction: "Test step" }],
      };

      const createResponse = await request(app)
        .post("/api/recipes")
        .send(validRecipe)
        .expect(201);

      const recipeId = createResponse.body.recipe.id;
      testRecipeIds.push(recipeId);

      // Try to update with invalid data that should cause validation error
      const invalidUpdate = {
        name: "x".repeat(300), // Too long
        category: "food",
        ingredients: [{ name: "Valid ingredient" }],
      };

      await request(app)
        .put(`/api/recipes/${recipeId}`)
        .send(invalidUpdate)
        .expect(422);

      // Verify original recipe is unchanged
      const unchangedResponse = await request(app)
        .get(`/api/recipes/${recipeId}`)
        .expect(200);

      expect(unchangedResponse.body.recipe.name).toBe(validRecipe.name);
    });
  });

  describe("Performance and Pagination Tests", () => {
    beforeEach(async () => {
      // Create multiple test recipes for pagination testing
      const recipePromises = [];
      for (let i = 1; i <= 25; i++) {
        const recipeData = {
          name: `E2E Test Recipe - Pagination ${i.toString().padStart(2, "0")}`,
          category: i % 2 === 0 ? "food" : "drink",
          prep_time: 10 + (i % 5) * 5,
          servings: 2 + (i % 4),
          difficulty: ["easy", "medium", "hard"][i % 3],
          ingredients: [
            { name: `Ingredient ${i}-1`, quantity: 1, unit: "cup" },
            { name: `Ingredient ${i}-2`, quantity: 2, unit: "tbsp" },
          ],
          steps: [
            { step_number: 1, instruction: `Step 1 for recipe ${i}` },
            { step_number: 2, instruction: `Step 2 for recipe ${i}` },
          ],
        };

        recipePromises.push(
          request(app).post("/api/recipes").send(recipeData)
        );
      }

      const responses = await Promise.all(recipePromises);
      testRecipeIds = responses.map((r) => r.body.recipe.id);
    });

    it("should handle large dataset pagination efficiently", async () => {
      // Test first page
      const page1Response = await request(app)
        .get("/api/recipes?page=1&limit=10")
        .expect(200);

      expect(page1Response.body.recipes).toHaveLength(10);
      expect(page1Response.body.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 25,
        totalPages: 3,
        hasNextPage: true,
        hasPrevPage: false,
      });

      // Test middle page
      const page2Response = await request(app)
        .get("/api/recipes?page=2&limit=10")
        .expect(200);

      expect(page2Response.body.recipes).toHaveLength(10);
      expect(page2Response.body.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 25,
        totalPages: 3,
        hasNextPage: true,
        hasPrevPage: true,
      });

      // Test last page
      const page3Response = await request(app)
        .get("/api/recipes?page=3&limit=10")
        .expect(200);

      expect(page3Response.body.recipes).toHaveLength(5);
      expect(page3Response.body.pagination).toEqual({
        page: 3,
        limit: 10,
        total: 25,
        totalPages: 3,
        hasNextPage: false,
        hasPrevPage: true,
      });

      // Verify no duplicate recipes across pages
      const allRecipeIds = [
        ...page1Response.body.recipes.map((r) => r.id),
        ...page2Response.body.recipes.map((r) => r.id),
        ...page3Response.body.recipes.map((r) => r.id),
      ];
      const uniqueIds = new Set(allRecipeIds);
      expect(uniqueIds.size).toBe(25);
    });

    it("should handle filtering with pagination", async () => {
      // Filter by category with pagination
      const foodPage1 = await request(app)
        .get("/api/recipes?category=food&page=1&limit=5")
        .expect(200);

      expect(foodPage1.body.recipes).toHaveLength(5);
      expect(foodPage1.body.pagination.total).toBe(12); // 12 food recipes out of 25

      // All results should be food category
      foodPage1.body.recipes.forEach((recipe) => {
        expect(recipe.category).toBe("food");
      });

      // Test search with pagination
      const searchResults = await request(app)
        .get("/api/recipes?search=Pagination&page=1&limit=10")
        .expect(200);

      expect(searchResults.body.recipes).toHaveLength(10);
      expect(searchResults.body.pagination.total).toBe(25); // All test recipes match "Pagination"

      // All results should contain "Pagination" in name
      searchResults.body.recipes.forEach((recipe) => {
        expect(recipe.name).toContain("Pagination");
      });
    });

    it("should handle concurrent recipe operations", async () => {
      // Test concurrent reads
      const concurrentReads = testRecipeIds.slice(0, 5).map((id) =>
        request(app).get(`/api/recipes/${id}`)
      );

      const readResults = await Promise.all(concurrentReads);
      readResults.forEach((result) => {
        expect(result.status).toBe(200);
        expect(result.body.recipe).toBeDefined();
      });

      // Test concurrent updates
      const updatePromises = testRecipeIds.slice(0, 3).map((id, index) =>
        request(app)
          .put(`/api/recipes/${id}`)
          .send({
            name: `E2E Test Recipe - Concurrent Update ${index + 1}`,
            category: "food",
            ingredients: [{ name: `Updated Ingredient ${index + 1}` }],
          })
      );

      const updateResults = await Promise.all(updatePromises);
      updateResults.forEach((result, index) => {
        expect(result.status).toBe(200);
        expect(result.body.recipe.name).toBe(
          `E2E Test Recipe - Concurrent Update ${index + 1}`
        );
      });
    });

    it("should measure response times for performance", async () => {
      // Test list endpoint performance
      const listStart = Date.now();
      await request(app).get("/api/recipes?limit=20").expect(200);
      const listTime = Date.now() - listStart;
      expect(listTime).toBeLessThan(1000); // Should complete within 1 second

      // Test single recipe retrieval performance
      const singleStart = Date.now();
      await request(app).get(`/api/recipes/${testRecipeIds[0]}`).expect(200);
      const singleTime = Date.now() - singleStart;
      expect(singleTime).toBeLessThan(500); // Should complete within 500ms

      // Test search performance
      const searchStart = Date.now();
      await request(app)
        .get("/api/recipes?search=Pagination&limit=10")
        .expect(200);
      const searchTime = Date.now() - searchStart;
      expect(searchTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe("Data Integrity and Edge Cases", () => {
    it("should maintain data integrity during complex operations", async () => {
      // Create recipe with specific ingredient order
      const recipeData = {
        name: "E2E Test Recipe - Data Integrity",
        category: "food",
        ingredients: [
          { name: "First Ingredient", order_index: 1 },
          { name: "Second Ingredient", order_index: 2 },
          { name: "Third Ingredient", order_index: 3 },
        ],
        steps: [
          { step_number: 1, instruction: "First step" },
          { step_number: 2, instruction: "Second step" },
          { step_number: 3, instruction: "Third step" },
        ],
      };

      const createResponse = await request(app)
        .post("/api/recipes")
        .send(recipeData)
        .expect(201);

      const recipeId = createResponse.body.recipe.id;
      testRecipeIds.push(recipeId);

      // Verify ingredient order is maintained
      const recipeResponse = await request(app)
        .get(`/api/recipes/${recipeId}`)
        .expect(200);

      const ingredients = recipeResponse.body.recipe.ingredients;
      expect(ingredients[0].name).toBe("First Ingredient");
      expect(ingredients[1].name).toBe("Second Ingredient");
      expect(ingredients[2].name).toBe("Third Ingredient");

      // Update with reordered ingredients
      const updateData = {
        name: "E2E Test Recipe - Data Integrity Updated",
        category: "food",
        ingredients: [
          { name: "Third Ingredient", order_index: 1 },
          { name: "First Ingredient", order_index: 2 },
          { name: "New Fourth Ingredient", order_index: 3 },
        ],
        steps: [
          { step_number: 1, instruction: "Updated first step" },
          { step_number: 2, instruction: "New second step" },
        ],
      };

      await request(app)
        .put(`/api/recipes/${recipeId}`)
        .send(updateData)
        .expect(200);

      // Verify new order and that old ingredients were properly replaced
      const updatedResponse = await request(app)
        .get(`/api/recipes/${recipeId}`)
        .expect(200);

      const updatedIngredients = updatedResponse.body.recipe.ingredients;
      expect(updatedIngredients).toHaveLength(3);
      expect(updatedIngredients[0].name).toBe("Third Ingredient");
      expect(updatedIngredients[1].name).toBe("First Ingredient");
      expect(updatedIngredients[2].name).toBe("New Fourth Ingredient");

      const updatedSteps = updatedResponse.body.recipe.steps;
      expect(updatedSteps).toHaveLength(2);
      expect(updatedSteps[0].instruction).toBe("Updated first step");
    });

    it("should handle edge cases in recipe data", async () => {
      // Test with minimal data
      const minimalRecipe = {
        name: "E2E Test Recipe - Minimal",
        category: "drink",
        ingredients: [{ name: "Water" }],
      };

      const minimalResponse = await request(app)
        .post("/api/recipes")
        .send(minimalRecipe)
        .expect(201);

      testRecipeIds.push(minimalResponse.body.recipe.id);

      // Test with maximum allowed name length
      const maxNameRecipe = {
        name: "E2E Test Recipe - " + "x".repeat(180), // Close to 200 char limit
        category: "food",
        ingredients: [{ name: "Test Ingredient" }],
      };

      const maxNameResponse = await request(app)
        .post("/api/recipes")
        .send(maxNameRecipe)
        .expect(201);

      testRecipeIds.push(maxNameResponse.body.recipe.id);

      // Test with decimal quantities
      const decimalRecipe = {
        name: "E2E Test Recipe - Decimal Quantities",
        category: "food",
        ingredients: [
          { name: "Flour", quantity: 2.5, unit: "cups" },
          { name: "Sugar", quantity: 0.75, unit: "cups" },
          { name: "Salt", quantity: 0.125, unit: "teaspoons" },
        ],
        steps: [{ instruction: "Mix ingredients" }],
      };

      const decimalResponse = await request(app)
        .post("/api/recipes")
        .send(decimalRecipe)
        .expect(201);

      testRecipeIds.push(decimalResponse.body.recipe.id);

      // Verify decimal quantities are preserved
      const decimalRecipeDetails = await request(app)
        .get(`/api/recipes/${decimalResponse.body.recipe.id}`)
        .expect(200);

      const decimalIngredients = decimalRecipeDetails.body.recipe.ingredients;
      expect(decimalIngredients[0].quantity).toBe("2.500");
      expect(decimalIngredients[1].quantity).toBe("0.750");
      expect(decimalIngredients[2].quantity).toBe("0.125");
    });
  });

  describe("Requirements Verification Tests", () => {
    it("should verify all Requirement 1 acceptance criteria (Recipe Creation)", async () => {
      const testRecipe = {
        name: "E2E Test Recipe - Req 1 Verification",
        description: "Testing requirement 1 criteria",
        category: "food",
        prep_time: 25,
        cook_time: 40,
        servings: 6,
        difficulty: "medium",
        ingredients: [
          {
            name: "Test Ingredient",
            quantity: 2,
            unit: "cups",
            notes: "Optional notes",
          },
        ],
        steps: [
          {
            step_number: 1,
            instruction: "Test step with timing",
            timing: 10,
          },
        ],
      };

      const response = await request(app)
        .post("/api/recipes")
        .send(testRecipe)
        .expect(201);

      const recipe = response.body.recipe;
      testRecipeIds.push(recipe.id);

      // Verify 1.1: System accepts all required fields
      expect(recipe.name).toBe(testRecipe.name);
      expect(recipe.description).toBe(testRecipe.description);
      expect(recipe.category).toBe(testRecipe.category);
      expect(recipe.prep_time).toBe(testRecipe.prep_time);
      expect(recipe.cook_time).toBe(testRecipe.cook_time);
      expect(recipe.servings).toBe(testRecipe.servings);
      expect(recipe.difficulty).toBe(testRecipe.difficulty);

      // Verify 1.2: System stores ingredient details
      const fullRecipe = await request(app)
        .get(`/api/recipes/${recipe.id}`)
        .expect(200);

      const ingredient = fullRecipe.body.recipe.ingredients[0];
      expect(ingredient.name).toBe("Test Ingredient");
      expect(ingredient.quantity).toBe("2.000");
      expect(ingredient.unit).toBe("cups");
      expect(ingredient.notes).toBe("Optional notes");

      // Verify 1.3: System stores preparation steps
      const step = fullRecipe.body.recipe.steps[0];
      expect(step.step_number).toBe(1);
      expect(step.instruction).toBe("Test step with timing");
      expect(step.timing).toBe(10);

      // Verify 1.4: System assigns unique ID and timestamps
      expect(recipe.id).toBeDefined();
      expect(recipe.created_at).toBeDefined();
      expect(recipe.updated_at).toBeDefined();

      // Verify 1.5: System returns validation errors for missing fields
      const invalidRecipe = { description: "Missing required fields" };
      const errorResponse = await request(app)
        .post("/api/recipes")
        .send(invalidRecipe)
        .expect(422);

      expect(errorResponse.body.error).toBe("Validation failed");
      expect(errorResponse.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: "name" }),
          expect.objectContaining({ field: "category" }),
          expect.objectContaining({ field: "ingredients" }),
        ])
      );
    });

    it("should verify all Requirement 2 acceptance criteria (Recipe Retrieval)", async () => {
      // Create test recipes for retrieval testing
      const foodRecipe = {
        name: "E2E Test Recipe - Food for Req 2",
        category: "food",
        prep_time: 15,
        difficulty: "easy",
        ingredients: [{ name: "Food Ingredient" }],
        steps: [{ instruction: "Food preparation step" }],
      };

      const drinkRecipe = {
        name: "E2E Test Recipe - Drink for Req 2",
        category: "drink",
        prep_time: 5,
        difficulty: "easy",
        ingredients: [{ name: "Drink Ingredient" }],
        steps: [{ instruction: "Drink preparation step" }],
      };

      const foodResponse = await request(app)
        .post("/api/recipes")
        .send(foodRecipe)
        .expect(201);
      const drinkResponse = await request(app)
        .post("/api/recipes")
        .send(drinkRecipe)
        .expect(201);

      testRecipeIds.push(foodResponse.body.recipe.id, drinkResponse.body.recipe.id);

      // Verify 2.1: System returns paginated list with basic information
      const listResponse = await request(app).get("/api/recipes").expect(200);
      expect(listResponse.body.recipes).toBeDefined();
      expect(listResponse.body.pagination).toBeDefined();
      
      const recipeInList = listResponse.body.recipes.find(
        (r) => r.id === foodResponse.body.recipe.id
      );
      expect(recipeInList.name).toBeDefined();
      expect(recipeInList.category).toBeDefined();
      expect(recipeInList.prep_time).toBeDefined();
      expect(recipeInList.difficulty).toBeDefined();

      // Verify 2.2: System returns complete recipe details by ID
      const detailResponse = await request(app)
        .get(`/api/recipes/${foodResponse.body.recipe.id}`)
        .expect(200);
      
      const detailedRecipe = detailResponse.body.recipe;
      expect(detailedRecipe.ingredients).toBeDefined();
      expect(detailedRecipe.steps).toBeDefined();
      expect(detailedRecipe.ingredients).toHaveLength(1);
      expect(detailedRecipe.steps).toHaveLength(1);

      // Verify 2.3: System filters by category
      const foodFilterResponse = await request(app)
        .get("/api/recipes?category=food")
        .expect(200);
      
      const foodRecipes = foodFilterResponse.body.recipes.filter(
        (r) => r.name.includes("Food for Req 2")
      );
      expect(foodRecipes).toHaveLength(1);
      expect(foodRecipes[0].category).toBe("food");

      // Verify 2.4: System searches by name (case-insensitive)
      const searchResponse = await request(app)
        .get("/api/recipes?search=FOOD FOR REQ 2")
        .expect(200);
      
      const searchResults = searchResponse.body.recipes.filter(
        (r) => r.name.includes("Food for Req 2")
      );
      expect(searchResults).toHaveLength(1);

      // Verify 2.5: System returns 404 for non-existent recipe
      await request(app).get("/api/recipes/99999").expect(404);
    });

    it("should verify all Requirement 3 acceptance criteria (Recipe Updates)", async () => {
      // Create a recipe to update
      const originalRecipe = {
        name: "E2E Test Recipe - Original for Req 3",
        category: "food",
        prep_time: 20,
        ingredients: [{ name: "Original Ingredient" }],
        steps: [{ instruction: "Original step" }],
      };

      const createResponse = await request(app)
        .post("/api/recipes")
        .send(originalRecipe)
        .expect(201);

      const recipeId = createResponse.body.recipe.id;
      testRecipeIds.push(recipeId);

      // Verify 3.1: System allows modification of all fields except ID
      const updateData = {
        name: "E2E Test Recipe - Updated for Req 3",
        category: "drink",
        prep_time: 10,
        cook_time: 0,
        servings: 2,
        difficulty: "easy",
        ingredients: [{ name: "Updated Ingredient" }],
        steps: [{ step_number: 1, instruction: "Updated step" }],
      };

      const updateResponse = await request(app)
        .put(`/api/recipes/${recipeId}`)
        .send(updateData)
        .expect(200);

      expect(updateResponse.body.recipe.id).toBe(recipeId); // ID unchanged
      expect(updateResponse.body.recipe.name).toBe(updateData.name);
      expect(updateResponse.body.recipe.category).toBe(updateData.category);

      // Verify 3.2 & 3.3: System supports ingredient and step modifications
      const updatedRecipe = await request(app)
        .get(`/api/recipes/${recipeId}`)
        .expect(200);

      expect(updatedRecipe.body.recipe.ingredients[0].name).toBe("Updated Ingredient");
      expect(updatedRecipe.body.recipe.steps[0].instruction).toBe("Updated step");

      // Verify 3.4: System timestamps modification
      expect(updateResponse.body.recipe.updated_at).toBeDefined();
      expect(new Date(updateResponse.body.recipe.updated_at)).toBeInstanceOf(Date);

      // Verify 3.5: System returns 404 for non-existent recipe
      await request(app)
        .put("/api/recipes/99999")
        .send(updateData)
        .expect(404);

      // Verify 3.6: System returns validation errors without modifying recipe
      const invalidUpdate = {
        name: "", // Invalid
        category: "invalid", // Invalid
        ingredients: [], // Invalid
      };

      await request(app)
        .put(`/api/recipes/${recipeId}`)
        .send(invalidUpdate)
        .expect(422);

      // Verify recipe was not modified
      const unchangedRecipe = await request(app)
        .get(`/api/recipes/${recipeId}`)
        .expect(200);

      expect(unchangedRecipe.body.recipe.name).toBe(updateData.name); // Still the valid update
    });

    it("should verify all Requirement 4 acceptance criteria (Recipe Deletion)", async () => {
      // Create a recipe to delete
      const recipeToDelete = {
        name: "E2E Test Recipe - To Delete for Req 4",
        category: "food",
        ingredients: [{ name: "Ingredient to delete" }],
        steps: [{ instruction: "Step to delete" }],
      };

      const createResponse = await request(app)
        .post("/api/recipes")
        .send(recipeToDelete)
        .expect(201);

      const recipeId = createResponse.body.recipe.id;

      // Verify 4.1: System permanently removes recipe and associated data
      const deleteResponse = await request(app)
        .delete(`/api/recipes/${recipeId}`)
        .expect(200);

      // Verify 4.3: System returns confirmation message
      expect(deleteResponse.body.message).toBe("Recipe deleted successfully");

      // Verify recipe and associated data are gone
      await request(app).get(`/api/recipes/${recipeId}`).expect(404);

      // Verify ingredients and steps are also deleted (CASCADE)
      const ingredientsResult = await pool.query(
        "SELECT * FROM recipe_ingredients WHERE recipe_id = $1",
        [recipeId]
      );
      expect(ingredientsResult.rows).toHaveLength(0);

      const stepsResult = await pool.query(
        "SELECT * FROM recipe_steps WHERE recipe_id = $1",
        [recipeId]
      );
      expect(stepsResult.rows).toHaveLength(0);

      // Verify 4.2: System returns 404 for non-existent recipe
      const nonExistentDeleteResponse = await request(app)
        .delete("/api/recipes/99999")
        .expect(404);

      // Verify 4.4: System returns appropriate error message for failures
      expect(nonExistentDeleteResponse.body.error).toBe("Recipe not found");
    });

    it("should verify all Requirement 5 acceptance criteria (Error Handling)", async () => {
      // Verify 5.1: System returns 400 for invalid JSON
      const invalidJsonResponse = await request(app)
        .post("/api/recipes")
        .send("invalid json")
        .set("Content-Type", "application/json");

      expect(invalidJsonResponse.status).toBe(400);

      // Verify 5.3: System returns 500 for database connection issues
      // Note: This is difficult to test without actually breaking the database
      // The existing implementation handles this in the error middleware

      // Verify 5.4: System returns 422 for validation failures
      const validationErrorResponse = await request(app)
        .post("/api/recipes")
        .send({
          name: "",
          category: "invalid",
          ingredients: [],
        })
        .expect(422);

      expect(validationErrorResponse.body.error).toBe("Validation failed");
      expect(validationErrorResponse.body.details).toBeDefined();

      // Verify 5.5: System logs errors and returns generic 500 for unexpected errors
      // This is handled by the error middleware and would require specific error injection
    });

    it("should verify all Requirement 6 acceptance criteria (Data Validation)", async () => {
      // Verify 6.1: System enforces required fields
      const missingFieldsResponse = await request(app)
        .post("/api/recipes")
        .send({})
        .expect(422);

      const errors = missingFieldsResponse.body.details;
      expect(errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: "name" }),
          expect.objectContaining({ field: "category" }),
          expect.objectContaining({ field: "ingredients" }),
        ])
      );

      // Verify 6.2: System validates positive quantities
      const negativeQuantityResponse = await request(app)
        .post("/api/recipes")
        .send({
          name: "Test Recipe",
          category: "food",
          ingredients: [{ name: "Test", quantity: -1 }],
        })
        .expect(422);

      expect(negativeQuantityResponse.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: "ingredients[0].quantity",
            message: "Quantity must be a positive number",
          }),
        ])
      );

      // Verify 6.3: System validates positive preparation times
      const negativeTimeResponse = await request(app)
        .post("/api/recipes")
        .send({
          name: "Test Recipe",
          category: "food",
          prep_time: -5,
          ingredients: [{ name: "Test" }],
        })
        .expect(422);

      expect(negativeTimeResponse.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: "prep_time",
            message: "Preparation time must be a positive integer",
          }),
        ])
      );

      // Verify 6.4: System validates category values
      const invalidCategoryResponse = await request(app)
        .post("/api/recipes")
        .send({
          name: "Test Recipe",
          category: "invalid",
          ingredients: [{ name: "Test" }],
        })
        .expect(422);

      expect(invalidCategoryResponse.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: "category",
            message: 'Category must be "food" or "drink"',
          }),
        ])
      );

      // Verify 6.5: System validates name length
      const longNameResponse = await request(app)
        .post("/api/recipes")
        .send({
          name: "x".repeat(201), // Exceeds 200 character limit
          category: "food",
          ingredients: [{ name: "Test" }],
        })
        .expect(422);

      expect(longNameResponse.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: "name",
            message: "Name must be 200 characters or less",
          }),
        ])
      );

      // Verify 6.6: System validates step instructions
      const emptyStepResponse = await request(app)
        .post("/api/recipes")
        .send({
          name: "Test Recipe",
          category: "food",
          ingredients: [{ name: "Test" }],
          steps: [{ step_number: 1, instruction: "" }],
        })
        .expect(422);

      expect(emptyStepResponse.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: "steps[0].instruction",
            message: "Step instruction is required",
          }),
        ])
      );

      // Test successful validation with valid data
      const validRecipe = {
        name: "Valid Test Recipe",
        category: "food",
        prep_time: 15,
        cook_time: 30,
        servings: 4,
        ingredients: [
          { name: "Valid Ingredient", quantity: 2.5, unit: "cups" },
        ],
        steps: [
          { step_number: 1, instruction: "Valid step instruction" },
        ],
      };

      const validResponse = await request(app)
        .post("/api/recipes")
        .send(validRecipe)
        .expect(201);

      testRecipeIds.push(validResponse.body.recipe.id);
      expect(validResponse.body.recipe.name).toBe(validRecipe.name);
    });
  });
});