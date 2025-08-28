import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DatabaseUtils } from '../utils/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Recipe Ingredients Product Migration', () => {
  beforeAll(async () => {
    // Reset database to initial state
    const resetScript = fs.readFileSync(path.join(__dirname, '../database/reset-database.sql'), 'utf8');
    await DatabaseUtils.query(resetScript);
  });

  afterAll(async () => {
    // Database connection cleanup is handled by the DatabaseUtils class
  });

  it('should successfully migrate recipe_ingredients to use product references', async () => {
    // Verify initial state - recipe_ingredients should have name column
    const initialCheck = await DatabaseUtils.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'recipe_ingredients' 
      AND column_name = 'name'
    `);
    expect(initialCheck.rows.length).toBe(1);

    // Verify we have some recipe ingredients with names
    const initialIngredients = await DatabaseUtils.query('SELECT COUNT(*) as count FROM recipe_ingredients WHERE name IS NOT NULL');
    expect(parseInt(initialIngredients.rows[0].count)).toBeGreaterThan(0);

    // Run the migration script
    const migrationScript = fs.readFileSync(path.join(__dirname, '../database/recipe-ingredients-product-migration.sql'), 'utf8');
    await DatabaseUtils.query(migrationScript);

    // Verify migration results
    
    // 1. Check that name column is removed
    const nameColumnCheck = await DatabaseUtils.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'recipe_ingredients' 
      AND column_name = 'name'
    `);
    expect(nameColumnCheck.rows.length).toBe(0);

    // 2. Check that product_id column exists and is NOT NULL
    const productIdCheck = await DatabaseUtils.query(`
      SELECT column_name, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'recipe_ingredients' 
      AND column_name = 'product_id'
    `);
    expect(productIdCheck.rows.length).toBe(1);
    expect(productIdCheck.rows[0].is_nullable).toBe('NO');

    // 3. Check that foreign key constraint exists
    const fkCheck = await DatabaseUtils.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'recipe_ingredients' 
      AND constraint_type = 'FOREIGN KEY'
      AND constraint_name = 'fk_recipe_ingredients_product_id'
    `);
    expect(fkCheck.rows.length).toBe(1);

    // 4. Check that all recipe_ingredients have valid product_id references
    const validReferences = await DatabaseUtils.query(`
      SELECT COUNT(*) as count 
      FROM recipe_ingredients ri 
      JOIN products p ON ri.product_id = p.id
    `);
    const totalIngredients = await DatabaseUtils.query('SELECT COUNT(*) as count FROM recipe_ingredients');
    expect(validReferences.rows[0].count).toBe(totalIngredients.rows[0].count);

    // 5. Check that the index was created
    const indexCheck = await DatabaseUtils.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'recipe_ingredients' 
      AND indexname = 'idx_recipe_ingredients_product_id'
    `);
    expect(indexCheck.rows.length).toBe(1);

    // 6. Verify that recipe_ingredient_products table was dropped
    const tableCheck = await DatabaseUtils.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'recipe_ingredient_products'
    `);
    expect(tableCheck.rows.length).toBe(0);

    // 7. Test that we can query recipes with product information
    const recipeWithProducts = await DatabaseUtils.query(`
      SELECT r.name as recipe_name, p.name as product_name, ri.quantity, ri.unit
      FROM recipes r
      JOIN recipe_ingredients ri ON r.id = ri.recipe_id
      JOIN products p ON ri.product_id = p.id
      WHERE r.id = 1
      ORDER BY ri.order_index
    `);
    expect(recipeWithProducts.rows.length).toBeGreaterThan(0);
    expect(recipeWithProducts.rows[0].product_name).toBeDefined();
  });

  it('should prevent deletion of products used in recipes', async () => {
    // Try to delete a product that's used in a recipe
    const productInUse = await DatabaseUtils.query(`
      SELECT DISTINCT p.id 
      FROM products p 
      JOIN recipe_ingredients ri ON p.id = ri.product_id 
      LIMIT 1
    `);
    
    if (productInUse.rows.length > 0) {
      const productId = productInUse.rows[0].id;
      
      // This should fail due to the RESTRICT constraint
      await expect(
        DatabaseUtils.query('DELETE FROM products WHERE id = $1', [productId])
      ).rejects.toThrow();
    }
  });

  it('should allow deletion of products not used in recipes', async () => {
    // Create a test product that's not used in any recipe
    const testProduct = await DatabaseUtils.query(`
      INSERT INTO products (name, description, unit_of_measure, current_quantity, low_stock_threshold, cost_per_unit)
      VALUES ('Test Product', 'For deletion test', 'pieces', 0, 5, 1.00)
      RETURNING id
    `);
    
    const productId = testProduct.rows[0].id;
    
    // This should succeed since the product is not used in any recipe
    const deleteResult = await DatabaseUtils.query('DELETE FROM products WHERE id = $1', [productId]);
    expect(deleteResult.rowCount).toBe(1);
  });
});