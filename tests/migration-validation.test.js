import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Migration Validation', () => {
  it('should validate that migration script exists and is readable', () => {
    const migrationPath = path.join(__dirname, '../database/recipe-ingredients-product-migration.sql');
    expect(fs.existsSync(migrationPath)).toBe(true);
    
    const stats = fs.statSync(migrationPath);
    expect(stats.isFile()).toBe(true);
    expect(stats.size).toBeGreaterThan(0);
  });

  it('should validate that updated schema exists and contains product references', () => {
    const schemaPath = path.join(__dirname, '../database/schema-updated.sql');
    expect(fs.existsSync(schemaPath)).toBe(true);
    
    const schemaContent = fs.readFileSync(schemaPath, 'utf8');
    
    // Check that recipe_ingredients table has product_id and NOT NULL constraint
    expect(schemaContent).toContain('product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT');
    
    // Check that recipe_ingredients table does NOT have name column
    const recipeIngredientsTableMatch = schemaContent.match(/CREATE TABLE IF NOT EXISTS recipe_ingredients \([^)]+\)/s);
    expect(recipeIngredientsTableMatch).toBeTruthy();
    expect(recipeIngredientsTableMatch[0]).not.toContain('name VARCHAR');
    
    // Check that products table is created before recipe_ingredients
    const productsIndex = schemaContent.indexOf('CREATE TABLE IF NOT EXISTS products');
    const recipeIngredientsIndex = schemaContent.indexOf('CREATE TABLE IF NOT EXISTS recipe_ingredients');
    expect(productsIndex).toBeLessThan(recipeIngredientsIndex);
    
    // Check that sample data uses product_id instead of name
    expect(schemaContent).toContain('INSERT INTO recipe_ingredients (recipe_id, product_id');
    expect(schemaContent).not.toContain('INSERT INTO recipe_ingredients (recipe_id, name');
  });

  it('should validate that migration preserves data integrity', () => {
    const migrationPath = path.join(__dirname, '../database/recipe-ingredients-product-migration.sql');
    const migrationScript = fs.readFileSync(migrationPath, 'utf8');
    
    // Check that migration updates existing data before adding constraints
    expect(migrationScript).toContain('UPDATE recipe_ingredients');
    expect(migrationScript).toContain('SET product_id = rip.product_id');
    expect(migrationScript).toContain('FROM recipe_ingredient_products rip');
    expect(migrationScript).toContain('WHERE recipe_ingredients.id = rip.recipe_ingredient_id');
    
    // Check that NOT NULL constraint is added after data migration
    expect(migrationScript).toContain('ALTER COLUMN product_id SET NOT NULL');
    
    // Check that the UPDATE comes before the ALTER COLUMN in the script
    const updateIndex = migrationScript.indexOf('UPDATE recipe_ingredients');
    const alterIndex = migrationScript.indexOf('ALTER COLUMN product_id SET NOT NULL');
    expect(updateIndex).toBeGreaterThan(-1);
    expect(alterIndex).toBeGreaterThan(-1);
    expect(updateIndex).toBeLessThan(alterIndex);
  });

  it('should validate that foreign key constraint prevents product deletion', () => {
    const migrationPath = path.join(__dirname, '../database/recipe-ingredients-product-migration.sql');
    const migrationScript = fs.readFileSync(migrationPath, 'utf8');
    
    // Check that the foreign key uses ON DELETE RESTRICT
    expect(migrationScript).toContain('REFERENCES products(id) ON DELETE RESTRICT');
    
    // Check that the constraint has a proper name
    expect(migrationScript).toContain('CONSTRAINT fk_recipe_ingredients_product_id');
  });

  it('should validate that indexes are properly created', () => {
    const migrationPath = path.join(__dirname, '../database/recipe-ingredients-product-migration.sql');
    const migrationScript = fs.readFileSync(migrationPath, 'utf8');
    
    // Check that index is created on product_id
    expect(migrationScript).toContain('CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_product_id ON recipe_ingredients(product_id)');
  });

  it('should validate that cleanup is performed', () => {
    const migrationPath = path.join(__dirname, '../database/recipe-ingredients-product-migration.sql');
    const migrationScript = fs.readFileSync(migrationPath, 'utf8');
    
    // Check that the linking table is dropped
    expect(migrationScript).toContain('DROP TABLE IF EXISTS recipe_ingredient_products');
    
    // Check that the name column is dropped
    expect(migrationScript).toContain('DROP COLUMN name');
  });
});