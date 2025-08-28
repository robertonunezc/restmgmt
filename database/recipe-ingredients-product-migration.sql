-- Recipe Ingredients Product Integration Migration
-- This script modifies the recipe_ingredients table to directly reference products
-- and migrates existing data from the recipe_ingredient_products linking table

BEGIN;

-- Step 1: Add product_id column to recipe_ingredients table
ALTER TABLE recipe_ingredients 
ADD COLUMN product_id INTEGER;

-- Step 2: Migrate existing data from recipe_ingredient_products to recipe_ingredients
-- Update recipe_ingredients with product_id from the linking table
UPDATE recipe_ingredients 
SET product_id = rip.product_id
FROM recipe_ingredient_products rip
WHERE recipe_ingredients.id = rip.recipe_ingredient_id;

-- Step 3: Add foreign key constraint to products table with RESTRICT to prevent deletion of products used in recipes
-- First make product_id NOT NULL since all existing ingredients should have been migrated
ALTER TABLE recipe_ingredients 
ALTER COLUMN product_id SET NOT NULL;

-- Then add the foreign key constraint
ALTER TABLE recipe_ingredients 
ADD CONSTRAINT fk_recipe_ingredients_product_id 
FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT;

-- Step 4: Remove the name column from recipe_ingredients (product name will come from products table)
ALTER TABLE recipe_ingredients 
DROP COLUMN name;

-- Step 5: Create index on product_id for optimal query performance
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_product_id ON recipe_ingredients(product_id);

-- Step 6: Drop the recipe_ingredient_products linking table as it's no longer needed
DROP TABLE IF EXISTS recipe_ingredient_products;

-- Step 7: Update any existing NULL product_id values with a default product (if needed)
-- This handles any recipe_ingredients that weren't linked to products
-- For now, we'll leave them as NULL and handle in application logic

COMMIT;