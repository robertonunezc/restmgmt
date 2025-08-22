# Design Document - Product Inventory System

## Overview

The Product Inventory System is designed to integrate seamlessly with the existing restaurant management system. It will manage product inventory, link recipe ingredients to inventory products, automatically update quantities based on sales, and provide real-time alerts for low and out-of-stock situations.

The system follows the existing architectural patterns established in the codebase, using Express.js with PostgreSQL, and maintains consistency with the current API design and database schema conventions.

## Architecture

### System Integration
- **Database Layer**: Extends the existing PostgreSQL schema with new inventory-related tables
- **API Layer**: New `/api/inventory` routes following existing Express.js patterns
- **Frontend Integration**: Dashboard components and inventory management interface
- **Business Logic**: Automatic inventory updates triggered by order completion

### Technology Stack
- **Backend**: Node.js with Express.js (existing)
- **Database**: PostgreSQL with existing connection pooling
- **Frontend**: Vanilla JavaScript with existing public folder structure
- **Error Handling**: Existing middleware error handling system

## Components and Interfaces

### Database Schema Extensions

#### Products Table
```sql
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    unit_of_measure VARCHAR(50) NOT NULL, -- 'kg', 'liters', 'pieces', etc.
    current_quantity DECIMAL(10,3) NOT NULL DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 10,
    cost_per_unit DECIMAL(10,2),
    supplier_info TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Recipe Ingredient Product Links Table
```sql
CREATE TABLE recipe_ingredient_products (
    id SERIAL PRIMARY KEY,
    recipe_ingredient_id INTEGER REFERENCES recipe_ingredients(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    quantity_per_serving DECIMAL(10,3) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(recipe_ingredient_id, product_id)
);
```

#### Inventory Transactions Table
```sql
CREATE TABLE inventory_transactions (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('sale', 'restock', 'adjustment', 'waste')),
    quantity_change DECIMAL(10,3) NOT NULL, -- negative for outgoing, positive for incoming
    reference_type VARCHAR(20), -- 'order', 'manual', 'recipe'
    reference_id INTEGER, -- order_id, manual entry id, etc.
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### API Endpoints

#### Product Management
- `GET /api/inventory/products` - List all products with filtering and pagination
- `POST /api/inventory/products` - Create new product
- `GET /api/inventory/products/:id` - Get single product details
- `PUT /api/inventory/products/:id` - Update product information
- `DELETE /api/inventory/products/:id` - Delete product

#### Inventory Operations
- `POST /api/inventory/products/:id/restock` - Add inventory quantity
- `POST /api/inventory/products/:id/adjust` - Manual quantity adjustment
- `GET /api/inventory/transactions` - Get inventory transaction history

#### Recipe Integration
- `POST /api/inventory/recipe-links` - Link recipe ingredients to products
- `GET /api/inventory/recipe-links/:recipeId` - Get product links for a recipe
- `DELETE /api/inventory/recipe-links/:id` - Remove ingredient-product link

#### Alerts and Dashboard
- `GET /api/inventory/alerts/low-stock` - Get low stock alerts
- `GET /api/inventory/alerts/out-of-stock` - Get out-of-stock alerts
- `GET /api/inventory/dashboard` - Get dashboard summary data

### Service Layer Components

#### InventoryService
```javascript
class InventoryService {
  // Product management
  static async createProduct(productData)
  static async updateProduct(productId, productData)
  static async getProducts(filters)
  static async getProductById(productId)
  static async deleteProduct(productId)
  
  // Inventory operations
  static async adjustQuantity(productId, quantityChange, transactionType, reference)
  static async processOrderInventoryUpdate(orderId)
  
  // Alerts
  static async getLowStockAlerts()
  static async getOutOfStockAlerts()
  
  // Recipe integration
  static async linkIngredientToProduct(recipeIngredientId, productId, quantityPerServing)
  static async getRecipeProductLinks(recipeId)
}
```

#### AlertService
```javascript
class AlertService {
  static async checkLowStockAlerts()
  static async checkOutOfStockAlerts()
  static async generateDashboardAlerts()
}
```

## Data Models

### Product Model
```javascript
{
  id: number,
  name: string,
  description: string,
  unit_of_measure: string,
  current_quantity: number,
  low_stock_threshold: number,
  cost_per_unit: number,
  supplier_info: string,
  created_at: timestamp,
  updated_at: timestamp
}
```

### Inventory Transaction Model
```javascript
{
  id: number,
  product_id: number,
  transaction_type: 'sale' | 'restock' | 'adjustment' | 'waste',
  quantity_change: number,
  reference_type: 'order' | 'manual' | 'recipe',
  reference_id: number,
  notes: string,
  created_at: timestamp
}
```

### Recipe Ingredient Product Link Model
```javascript
{
  id: number,
  recipe_ingredient_id: number,
  product_id: number,
  quantity_per_serving: number,
  created_at: timestamp
}
```

## Error Handling

### Validation Rules
- Product names must be unique and non-empty
- Quantities must be non-negative numbers
- Unit of measure must be from predefined list
- Low stock threshold must be positive integer
- Recipe ingredient links require valid recipe ingredient and product IDs

### Error Types
- **ValidationError**: Invalid input data (400)
- **NotFoundError**: Product or link not found (404)
- **ConflictError**: Duplicate product names or links (409)
- **DatabaseError**: Database operation failures (500)

### Error Response Format
```javascript
{
  error: "Error message",
  code: "ERROR_CODE",
  details: {} // Additional error context
}
```

## Testing Strategy

### Unit Tests
- Product CRUD operations
- Inventory quantity calculations
- Alert generation logic
- Recipe ingredient linking
- Validation functions

### Integration Tests
- API endpoint functionality
- Database transaction integrity
- Order processing inventory updates
- Alert system end-to-end flow

### Test Data Setup
- Sample products with various quantities
- Recipe ingredient product links
- Order scenarios for inventory deduction
- Edge cases for low/out-of-stock situations

### Performance Tests
- Large inventory list pagination
- Concurrent inventory updates
- Alert generation with many products
- Recipe processing with multiple ingredients

## Implementation Considerations

### Automatic Inventory Updates
- Hook into existing order completion workflow
- Calculate ingredient quantities from recipe servings
- Batch update multiple products in single transaction
- Log all automatic updates for audit trail

### Dashboard Integration
- Extend existing dashboard with inventory widgets
- Real-time alert banners for out-of-stock items
- Inventory summary cards
- Quick action buttons for common operations

### Data Migration
- No existing inventory data to migrate
- Recipe ingredients can be gradually linked to products
- Existing recipes remain functional without product links

### Scalability
- Database indexes on frequently queried columns
- Pagination for large product lists
- Efficient alert queries with proper indexing
- Transaction logging with retention policies