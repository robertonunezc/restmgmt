# Recipe Ingredients Product Migration

This migration script (`recipe-ingredients-product-migration.sql`) modifies the `recipe_ingredients` table to directly reference products from the inventory system instead of using free-text ingredient names.

## What This Migration Does

### Schema Changes
1. **Adds `product_id` column** to `recipe_ingredients` table
2. **Adds foreign key constraint** with `ON DELETE RESTRICT` to prevent deletion of products used in recipes
3. **Removes `name` column** from `recipe_ingredients` table (replaced by product reference)
4. **Makes `product_id` NOT NULL** since all ingredients must reference a product
5. **Creates index** on `product_id` for optimal query performance
6. **Drops `recipe_ingredient_products` table** since direct references eliminate the need for the intermediate table

### Data Migration
1. **Matches existing ingredients** to products based on name similarity
2. **Creates missing products** automatically for any ingredients that don't match existing products
3. **Preserves all data** - no recipe ingredients are lost during migration
4. **Cleans up orphaned records** that couldn't be migrated

## How to Run the Migration

### Prerequisites
- Ensure the database is running and accessible
- Ensure the `products` table exists (run inventory migration first if needed)
- Backup your database before running the migration

### Running the Migration

```bash
# Option 1: Using psql directly
psql -d restaurant_db -f database/recipe-ingredients-product-migration.sql

# Option 2: Using the database reset script (includes migration)
npm run db:reset

# Option 3: Using Node.js
node -e "
const { pool } = require('./utils/db-connection');
const fs = require('fs');
const script = fs.readFileSync('./database/recipe-ingredients-product-migration.sql', 'utf8');
pool.query(script).then(() => console.log('Migration complete')).catch(console.error);
"
```

## Verification

After running the migration, you can verify it worked correctly:

```sql
-- Check that all recipe ingredients have valid product references
SELECT COUNT(*) as total_ingredients,
       COUNT(ri.product_id) as ingredients_with_products
FROM recipe_ingredients ri;

-- View recipe ingredients with product information
SELECT r.name as recipe_name, 
       p.name as product_name, 
       ri.quantity, 
       ri.unit,
       p.unit_of_measure as product_unit
FROM recipes r
JOIN recipe_ingredients ri ON r.id = ri.recipe_id
JOIN products p ON ri.product_id = p.id
ORDER BY r.name, ri.order_index;

-- Check that products can't be deleted if used in recipes
-- This should fail:
-- DELETE FROM products WHERE id IN (SELECT DISTINCT product_id FROM recipe_ingredients LIMIT 1);
```

## Impact on Application Code

After this migration, any code that:
- Queries `recipe_ingredients.name` will need to JOIN with `products` table
- Inserts into `recipe_ingredients` must provide a valid `product_id`
- Updates recipe ingredients must reference existing products

### Example Query Changes

**Before Migration:**
```sql
SELECT ri.name, ri.quantity, ri.unit 
FROM recipe_ingredients ri 
WHERE ri.recipe_id = $1;
```

**After Migration:**
```sql
SELECT p.name, ri.quantity, ri.unit, p.unit_of_measure
FROM recipe_ingredients ri
JOIN products p ON ri.product_id = p.id
WHERE ri.recipe_id = $1;
```

## Rollback

If you need to rollback this migration:

1. **Add back the `name` column:**
   ```sql
   ALTER TABLE recipe_ingredients ADD COLUMN name VARCHAR(100);
   ```

2. **Populate names from products:**
   ```sql
   UPDATE recipe_ingredients 
   SET name = p.name 
   FROM products p 
   WHERE recipe_ingredients.product_id = p.id;
   ```

3. **Remove product_id column:**
   ```sql
   ALTER TABLE recipe_ingredients DROP COLUMN product_id;
   ```

**Note:** This rollback will lose the connection to inventory tracking.

## Requirements Addressed

This migration addresses the following requirements:
- **7.6**: Store product_id reference for accurate inventory tracking
- **1.2**: Only allow selection of ingredients from existing products
- **1.3**: Store product reference, quantity, unit, and notes for each ingredient