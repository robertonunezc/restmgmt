import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Recipe Ingredients Product Migration SQL Syntax', () => {
  it('should have valid SQL syntax in migration script', () => {
    const migrationPath = path.join(__dirname, '../database/recipe-ingredients-product-migration.sql');
    expect(fs.existsSync(migrationPath)).toBe(true);
    
    const migrationScript = fs.readFileSync(migrationPath, 'utf8');
    
    // Check that the script contains the expected SQL statements
    expect(migrationScript).toContain('ALTER TABLE recipe_ingredients');
    expect(migrationScript).toContain('ADD COLUMN product_id INTEGER');
    expect(migrationScript).toContain('FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT');
    expect(migrationScript).toContain('DROP COLUMN name');
    expect(migrationScript).toContain('CREATE INDEX');
    expect(migrationScript).toContain('idx_recipe_ingredients_product_id');
    expect(migrationScript).toContain('DROP TABLE IF EXISTS recipe_ingredient_products');
    
    // Check that the script is wrapped in a transaction
    expect(migrationScript).toContain('BEGIN;');
    expect(migrationScript).toContain('COMMIT;');
    
    // Check that it updates existing data
    expect(migrationScript).toContain('UPDATE recipe_ingredients');
    expect(migrationScript).toContain('FROM recipe_ingredient_products');
    
    // Check that it sets NOT NULL constraint
    expect(migrationScript).toContain('ALTER COLUMN product_id SET NOT NULL');
  });

  it('should have proper SQL statement order', () => {
    const migrationPath = path.join(__dirname, '../database/recipe-ingredients-product-migration.sql');
    const migrationScript = fs.readFileSync(migrationPath, 'utf8');
    
    // Remove comments and empty lines for easier parsing
    const statements = migrationScript
      .split('\n')
      .filter(line => line.trim() && !line.trim().startsWith('--'))
      .join('\n');
    
    // Check that ADD COLUMN comes before UPDATE
    const addColumnIndex = statements.indexOf('ADD COLUMN product_id');
    const updateIndex = statements.indexOf('UPDATE recipe_ingredients');
    expect(addColumnIndex).toBeLessThan(updateIndex);
    
    // Check that UPDATE comes before SET NOT NULL
    const setNotNullIndex = statements.indexOf('ALTER COLUMN product_id SET NOT NULL');
    expect(updateIndex).toBeLessThan(setNotNullIndex);
    
    // Check that SET NOT NULL comes before ADD CONSTRAINT
    const addConstraintIndex = statements.indexOf('ADD CONSTRAINT');
    expect(setNotNullIndex).toBeLessThan(addConstraintIndex);
    
    // Check that DROP COLUMN comes after ADD CONSTRAINT
    const dropColumnIndex = statements.indexOf('DROP COLUMN name');
    expect(addConstraintIndex).toBeLessThan(dropColumnIndex);
  });

  it('should properly handle the migration steps', () => {
    const migrationPath = path.join(__dirname, '../database/recipe-ingredients-product-migration.sql');
    const migrationScript = fs.readFileSync(migrationPath, 'utf8');
    
    // Check for proper step comments
    expect(migrationScript).toContain('Step 1:');
    expect(migrationScript).toContain('Step 2:');
    expect(migrationScript).toContain('Step 3:');
    expect(migrationScript).toContain('Step 4:');
    expect(migrationScript).toContain('Step 5:');
    expect(migrationScript).toContain('Step 6:');
    
    // Verify the migration preserves data integrity
    expect(migrationScript).toContain('recipe_ingredient_products rip');
    expect(migrationScript).toContain('WHERE recipe_ingredients.id = rip.recipe_ingredient_id');
  });
});