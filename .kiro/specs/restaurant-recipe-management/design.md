# Design Document

## Overview

The restaurant recipe management system will extend the existing Express.js application with PostgreSQL database to provide comprehensive CRUD operations for managing food and drink recipes. The design follows the established patterns in the codebase, using Express routers for API endpoints and PostgreSQL for data persistence.

The system will manage recipes as complex entities containing metadata, ingredients, and preparation steps, while maintaining referential integrity and providing robust validation and error handling.

## Architecture

### High-Level Architecture

The recipe management feature integrates into the existing three-tier architecture:

1. **Presentation Layer**: RESTful API endpoints following existing patterns
2. **Business Logic Layer**: Route handlers with validation and business rules
3. **Data Layer**: PostgreSQL database with normalized schema

### API Design

The recipe API will follow REST conventions and match existing endpoint patterns:

- `GET /api/recipes` - List all recipes with optional filtering
- `GET /api/recipes/:id` - Get specific recipe with full details
- `POST /api/recipes` - Create new recipe
- `PUT /api/recipes/:id` - Update existing recipe
- `DELETE /api/recipes/:id` - Delete recipe

Query parameters for filtering:
- `category` - Filter by food/drink
- `search` - Search by recipe name
- `page` & `limit` - Pagination support

## Components and Interfaces

### Database Schema

The recipe system integrates with the existing product inventory system. The main changes involve updating the recipe_ingredients table to reference products:

```sql
-- Main recipes table (unchanged)
CREATE TABLE recipes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(10) NOT NULL CHECK (category IN ('food', 'drink')),
    prep_time INTEGER, -- in minutes
    cook_time INTEGER, -- in minutes  
    servings INTEGER,
    difficulty VARCHAR(10) CHECK (difficulty IN ('easy', 'medium', 'hard')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Recipe ingredients (updated to reference products)
CREATE TABLE recipe_ingredients (
    id SERIAL PRIMARY KEY,
    recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE RESTRICT,
    quantity DECIMAL(10,3) NOT NULL,
    unit VARCHAR(50), -- should match or be convertible to product unit
    notes TEXT,
    order_index INTEGER DEFAULT 0
);

-- Recipe preparation steps (unchanged)
CREATE TABLE recipe_steps (
    id SERIAL PRIMARY KEY,
    recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    instruction TEXT NOT NULL,
    timing INTEGER, -- optional timing in minutes
    UNIQUE(recipe_id, step_number)
);
```

**Key Changes:**
- `recipe_ingredients.name` removed - ingredient name comes from referenced product
- `recipe_ingredients.product_id` added with foreign key to products table
- `ON DELETE RESTRICT` prevents deletion of products that are used in recipes
- Unit validation ensures compatibility with product units

### API Route Structure

Following the existing pattern in `routes/menu.js`, the recipe routes will be implemented in `routes/recipes.js`:

```javascript
const express = require('express');
const router = express.Router();
const { pool } = require('../server');

// Route handlers for CRUD operations
// GET /api/recipes
// GET /api/recipes/:id  
// POST /api/recipes
// PUT /api/recipes/:id
// DELETE /api/recipes/:id
```

### Data Models

#### Recipe Entity
```javascript
{
  id: number,
  name: string,
  description: string,
  category: 'food' | 'drink',
  prep_time: number, // minutes
  cook_time: number, // minutes
  servings: number,
  difficulty: 'easy' | 'medium' | 'hard',
  ingredients: Ingredient[],
  steps: Step[],
  created_at: timestamp,
  updated_at: timestamp
}
```

#### Ingredient Entity
```javascript
{
  id: number,
  recipe_id: number,
  product_id: number,
  product_name: string, // populated from products table
  quantity: number,
  unit: string,
  notes: string,
  order_index: number
}
```

#### Step Entity
```javascript
{
  id: number,
  recipe_id: number,
  step_number: number,
  instruction: string,
  timing: number // optional
}
```

### Validation Layer

Input validation will be implemented using middleware functions:

- **Recipe validation**: Name length, category values, positive numbers for times/servings
- **Ingredient validation**: Required name, positive quantities, valid units
- **Step validation**: Non-empty instructions, sequential step numbers

## Data Models

### Database Relationships

- `recipes` table serves as the parent entity
- `recipe_ingredients` has a foreign key to `recipes` with CASCADE delete
- `recipe_steps` has a foreign key to `recipes` with CASCADE delete
- Ingredients are ordered by `order_index` for consistent display
- Steps are ordered by `step_number` with uniqueness constraint per recipe

### Query Patterns

#### List Recipes with Filtering
```sql
SELECT r.*, 
       COUNT(ri.id) as ingredient_count,
       COUNT(rs.id) as step_count
FROM recipes r
LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
LEFT JOIN recipe_steps rs ON r.id = rs.recipe_id
WHERE ($1::text IS NULL OR r.category = $1)
  AND ($2::text IS NULL OR r.name ILIKE '%' || $2 || '%')
GROUP BY r.id
ORDER BY r.name
LIMIT $3 OFFSET $4;
```

#### Get Recipe with Full Details
```sql
-- Main recipe data
SELECT * FROM recipes WHERE id = $1;

-- Recipe ingredients with product information
SELECT ri.*, p.name as product_name, p.unit as product_unit
FROM recipe_ingredients ri
JOIN products p ON ri.product_id = p.id
WHERE ri.recipe_id = $1 
ORDER BY ri.order_index, ri.id;

-- Recipe steps  
SELECT * FROM recipe_steps 
WHERE recipe_id = $1 
ORDER BY step_number;
```

## Error Handling

### HTTP Status Codes

- `200 OK` - Successful GET, PUT operations
- `201 Created` - Successful POST operations  
- `400 Bad Request` - Invalid JSON or malformed requests
- `404 Not Found` - Recipe not found for GET, PUT, DELETE by ID
- `422 Unprocessable Entity` - Validation errors
- `500 Internal Server Error` - Database or server errors

### Error Response Format

Consistent with existing API patterns:

```javascript
// Validation errors
{
  error: "Validation failed",
  details: [
    { field: "name", message: "Name is required" },
    { field: "category", message: "Category must be 'food' or 'drink'" }
  ]
}

// Not found errors
{
  error: "Recipe not found"
}

// Server errors  
{
  error: "Internal server error"
}
```

### Transaction Management

Recipe creation and updates will use database transactions to ensure data consistency across the three tables:

```javascript
const client = await pool.connect();
try {
  await client.query('BEGIN');
  
  // Insert/update recipe
  // Insert/update ingredients  
  // Insert/update steps
  
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
}
```

## Testing Strategy

### Unit Tests

- **Validation functions**: Test input validation for recipes, ingredients, and steps
- **Database queries**: Test SQL query construction and parameter binding
- **Error handling**: Test error response formatting and status codes

### Integration Tests

- **API endpoints**: Test complete request/response cycles for all CRUD operations
- **Database transactions**: Test rollback behavior on failures
- **Filtering and pagination**: Test query parameters and result formatting

### Test Data

Create test fixtures with:
- Valid recipes with various categories and complexity levels
- Edge cases for validation (empty names, invalid categories, negative numbers)
- Recipes with multiple ingredients and steps for relationship testing

### Test Environment

- Use separate test database to avoid affecting development data
- Mock database connections for unit tests
- Use supertest for API endpoint testing following existing patterns in the codebase

## Frontend Integration

### Product Selection Interface

The recipe creation form will be enhanced to support product-based ingredient selection:

#### API Endpoints for Product Selection
- `GET /api/products/search?q={query}` - Search products for ingredient selection
- `GET /api/products` - Get all products for dropdown population

#### Frontend Components

**Product Search/Selection:**
- Replace free-text ingredient input with searchable dropdown
- Implement autocomplete functionality for product search
- Display product name, unit, and current stock level
- Auto-populate unit field when product is selected

**Validation:**
- Ensure selected products exist in inventory
- Validate quantity units against product units
- Provide unit conversion suggestions when applicable

**User Experience:**
- Show "No products available" message when inventory is empty
- Provide link to add products to inventory from recipe creation form
- Display product stock levels to help with recipe planning

### Enhanced Recipe Display

When displaying recipes, ingredient information will include:
- Product name from inventory
- Current stock levels for each ingredient
- Cost calculations based on current product prices
- Availability warnings for out-of-stock ingredients

## Performance Considerations

### Database Indexing

```sql
-- Indexes for common query patterns
CREATE INDEX idx_recipes_category ON recipes(category);
CREATE INDEX idx_recipes_name ON recipes(name);
CREATE INDEX idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);
CREATE INDEX idx_recipe_ingredients_product_id ON recipe_ingredients(product_id);
CREATE INDEX idx_recipe_steps_recipe_id ON recipe_steps(recipe_id);
```

### Query Optimization

- Use JOIN queries to fetch related data in single requests
- Implement pagination to limit result set sizes
- Use prepared statements for parameterized queries
- Consider connection pooling for concurrent requests (already implemented)
- Cache product lists for ingredient selection

### Caching Strategy

- Consider implementing Redis caching for frequently accessed recipes
- Cache recipe lists with common filter combinations
- Cache product lists for ingredient selection dropdowns
- Implement cache invalidation on recipe updates/deletes