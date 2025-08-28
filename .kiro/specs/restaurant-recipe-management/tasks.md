# Implementation Plan

- [x] 1. Create database schema and migrations
  - Add recipe tables to database schema with proper constraints and relationships
  - Create indexes for optimal query performance
  - Add sample recipe data for testing
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 2. Implement core recipe data models and validation
- [x] 2.1 Create recipe validation utilities
  - Write validation functions for recipe fields (name, category, times, servings)
  - Implement ingredient validation (name, quantity, unit)
  - Create step validation (instruction text, step numbering)
  - Write unit tests for all validation functions
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 2.2 Create database query utilities
  - Implement database connection and query helper functions
  - Write parameterized queries for recipe CRUD operations
  - Create transaction management utilities for multi-table operations
  - Write unit tests for query utilities
  - _Requirements: 1.4, 2.4, 3.4, 4.3_

- [x] 3. Implement recipe creation endpoint
- [x] 3.1 Create POST /api/recipes endpoint
  - Implement route handler for recipe creation with ingredients and steps
  - Add request validation middleware using validation utilities
  - Implement database transaction for inserting recipe, ingredients, and steps
  - Add error handling for validation failures and database errors
  - Write integration tests for recipe creation scenarios
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 5.1, 5.4_

- [x] 4. Implement recipe retrieval endpoints
- [x] 4.1 Create GET /api/recipes endpoint for listing recipes
  - Implement route handler with pagination support
  - Add filtering by category and search by name functionality
  - Implement database queries with proper JOIN operations
  - Add error handling for database connection issues
  - Write integration tests for listing and filtering scenarios
  - _Requirements: 2.1, 2.3, 2.4, 5.3_

- [x] 4.2 Create GET /api/recipes/:id endpoint for single recipe
  - Implement route handler to fetch complete recipe details
  - Write queries to retrieve recipe with ingredients and steps
  - Add proper error handling for non-existent recipes
  - Write integration tests for single recipe retrieval
  - _Requirements: 2.2, 2.5, 5.3_

- [x] 5. Implement recipe update endpoint
- [x] 5.1 Create PUT /api/recipes/:id endpoint
  - Implement route handler for updating recipe with ingredients and steps
  - Add validation for update data using existing validation utilities
  - Implement database transaction for updating across multiple tables
  - Handle partial updates and ingredient/step additions/removals
  - Add error handling for non-existent recipes and validation failures
  - Write integration tests for various update scenarios
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 5.4_

- [x] 6. Implement recipe deletion endpoint
- [x] 6.1 Create DELETE /api/recipes/:id endpoint
  - Implement route handler for recipe deletion
  - Use CASCADE delete to remove associated ingredients and steps
  - Add proper error handling for non-existent recipes
  - Return appropriate success/error responses
  - Write integration tests for deletion scenarios
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 7. Add comprehensive error handling middleware
- [x] 7.1 Implement global error handling middleware
  - Create middleware for handling JSON parsing errors
  - Add middleware for database connection error handling
  - Implement validation error formatting middleware
  - Add logging for server errors while protecting sensitive information
  - Write tests for error handling scenarios
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 8. Integrate recipe routes into main application
- [x] 8.1 Register recipe routes in server.js
  - Import and mount recipe router at /api/recipes
  - Ensure proper middleware order for error handling
  - Update health check endpoint to verify recipe table connectivity
  - Test complete API integration with existing application
  - _Requirements: All requirements integration_

- [x] 9. Create comprehensive test suite
- [x] 9.1 Write end-to-end API tests
  - Create test scenarios covering complete CRUD workflows
  - Test error conditions and edge cases
  - Implement test data setup and teardown
  - Add performance tests for pagination and filtering
  - Verify all requirements are covered by tests
  - _Requirements: All requirements verification_

- [x] 10. Update database schema for product-based ingredients
- [x] 10.1 Modify recipe_ingredients table structure
  - Add product_id foreign key column to recipe_ingredients table
  - Remove name column from recipe_ingredients (use product reference instead)
  - Add database constraint to prevent deletion of products used in recipes
  - Create database migration script for existing data
  - Update database indexes to include product_id
  - _Requirements: 7.6, 1.2, 1.3_

- [-] 11. Update backend API for product integration
- [x] 11.1 Modify recipe creation endpoint for product references
  - Update recipe creation validation to require product_id instead of ingredient name
  - Add validation to ensure referenced products exist in inventory
  - Modify ingredient data structure to store product references
  - Update recipe creation tests for product-based ingredients
  - _Requirements: 7.6, 1.2, 1.7_

- [ ] 11.2 Update recipe retrieval endpoints for product data
  - Modify recipe queries to JOIN with products table for ingredient names
  - Update recipe response format to include product information
  - Add product availability status to ingredient data
  - Update recipe retrieval tests for new data structure
  - _Requirements: 2.2, 7.3_

- [ ] 11.3 Create product search endpoint for ingredient selection
  - Implement GET /api/products/search endpoint with query parameter
  - Add filtering and pagination for product search results
  - Include product stock levels and units in search results
  - Write tests for product search functionality
  - _Requirements: 7.1, 7.2_

- [ ] 12. Update frontend recipe creation interface
- [ ] 12.1 Replace ingredient text inputs with product selection
  - Remove free-text ingredient name inputs from recipe creation form
  - Implement searchable dropdown/autocomplete for product selection
  - Add product search functionality with real-time filtering
  - Display product name, unit, and stock level in selection options
  - Auto-populate ingredient unit when product is selected
  - _Requirements: 7.1, 7.2, 7.3_

- [ ] 12.2 Add product validation and user feedback
  - Implement client-side validation for product selection
  - Show "No products available" message when inventory is empty
  - Add link to inventory management from recipe creation form
  - Display unit conversion suggestions when units don't match
  - Add loading states and error handling for product searches
  - _Requirements: 7.4, 7.5_

- [ ] 12.3 Update recipe display to show product information
  - Modify recipe view to display product names from inventory
  - Add current stock level indicators for each ingredient
  - Show availability warnings for out-of-stock ingredients
  - Update recipe cards to include cost calculations based on current prices
  - _Requirements: 7.3, 7.6_

- [ ] 13. Add comprehensive testing for product integration
- [ ] 13.1 Write integration tests for product-based recipes
  - Test recipe creation with valid product references
  - Test validation errors for non-existent products
  - Test recipe display with product information
  - Test product search functionality
  - Test edge cases like deleted products and stock changes
  - _Requirements: All requirements verification_