-- Restaurant Management System Database Schema (Updated for Product Integration)

-- Create database (run this separately)
-- CREATE DATABASE restaurant_db;

-- Tables
CREATE TABLE IF NOT EXISTS tables (
    id SERIAL PRIMARY KEY,
    table_number INTEGER UNIQUE NOT NULL,
    capacity INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved', 'cleaning')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products table for inventory management (must be created before recipe_ingredients)
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL UNIQUE,
    description TEXT,
    unit_of_measure VARCHAR(50) NOT NULL, -- 'kg', 'liters', 'pieces', 'grams', 'ml', etc.
    current_quantity DECIMAL(10,3) NOT NULL DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 10,
    cost_per_unit DECIMAL(10,2),
    supplier_info TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Recipe Management Tables
CREATE TABLE IF NOT EXISTS recipes (
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

-- Recipe ingredients (updated to reference products directly)
CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id SERIAL PRIMARY KEY,
    recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity DECIMAL(10,3),
    unit VARCHAR(50),
    notes TEXT,
    order_index INTEGER DEFAULT 0
);

-- Recipe preparation steps
CREATE TABLE IF NOT EXISTS recipe_steps (
    id SERIAL PRIMARY KEY,
    recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    instruction TEXT NOT NULL,
    timing INTEGER, -- optional timing in minutes
    UNIQUE(recipe_id, step_number)
);

-- Menu Items (now based on recipes)
CREATE TABLE IF NOT EXISTS menu_items (
    id SERIAL PRIMARY KEY,
    recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    category VARCHAR(50) NOT NULL,
    available BOOLEAN DEFAULT true,
    cost_per_serving DECIMAL(10,2), -- calculated from recipe ingredients
    profit_margin DECIMAL(5,2) DEFAULT 0.30, -- 30% default margin
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    table_id INTEGER REFERENCES tables(id),
    customer_name VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'served', 'paid')),
    total DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order Items (junction table)
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id INTEGER REFERENCES menu_items(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory transactions table for audit trail
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('sale', 'restock', 'adjustment', 'waste')),
    quantity_change DECIMAL(10,3) NOT NULL, -- negative for outgoing, positive for incoming
    reference_type VARCHAR(20), -- 'order', 'manual', 'recipe'
    reference_id INTEGER, -- order_id, manual entry id, etc.
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_recipes_category ON recipes(category);
CREATE INDEX IF NOT EXISTS idx_recipes_name ON recipes(name);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_product_id ON recipe_ingredients(product_id);
CREATE INDEX IF NOT EXISTS idx_recipe_steps_recipe_id ON recipe_steps(recipe_id);

-- Inventory indexes
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_low_stock ON products(current_quantity, low_stock_threshold);
CREATE INDEX IF NOT EXISTS idx_products_unit_measure ON products(unit_of_measure);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_product ON inventory_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_type ON inventory_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_reference ON inventory_transactions(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_created_at ON inventory_transactions(created_at);

-- Sample Data
INSERT INTO tables (table_number, capacity) VALUES 
(1, 2), (2, 4), (3, 4), (4, 6), (5, 2), (6, 8);

-- Sample inventory data for testing
INSERT INTO products (name, description, unit_of_measure, current_quantity, low_stock_threshold, cost_per_unit, supplier_info) VALUES 
('Pizza Dough Balls', 'Fresh pizza dough balls, ready to use', 'pieces', 25, 10, 1.50, 'Local Bakery Supply'),
('Tomato Sauce', 'San Marzano tomato sauce for pizza', 'liters', 8.5, 5, 3.20, 'Italian Imports Co'),
('Fresh Mozzarella', 'Buffalo mozzarella cheese', 'kg', 12.0, 3, 8.50, 'Dairy Fresh Ltd'),
('Fresh Basil', 'Organic fresh basil leaves', 'grams', 500, 100, 0.02, 'Herb Garden Supply'),
('Extra Virgin Olive Oil', 'Premium olive oil', 'liters', 3.2, 2, 12.00, 'Mediterranean Oils'),
('Sea Salt', 'Coarse sea salt', 'kg', 5.0, 1, 2.50, 'Salt Works'),
('Fresh Lemons', 'Organic lemons for beverages', 'pieces', 45, 20, 0.75, 'Citrus Grove'),
('Granulated Sugar', 'White granulated sugar', 'kg', 15.0, 5, 1.20, 'Sweet Supply Co'),
('Spaghetti Pasta', 'High quality spaghetti', 'kg', 8.0, 3, 2.80, 'Pasta Masters'),
('Chicken Breast', 'Fresh boneless chicken breast', 'kg', 6.5, 2, 12.00, 'Farm Fresh Poultry'),
('Bacon Strips', 'Thick cut bacon', 'kg', 3.2, 1, 15.50, 'Premium Meats'),
('Fresh Eggs', 'Free range eggs', 'pieces', 60, 24, 0.35, 'Happy Hens Farm'),
('Parmesan Cheese', 'Aged parmesan cheese', 'kg', 2.8, 1, 25.00, 'Cheese Artisans'),
('Heavy Cream', 'Full fat heavy cream', 'liters', 4.5, 2, 4.20, 'Dairy Fresh Ltd'),
('Garlic Cloves', 'Fresh garlic', 'grams', 800, 200, 0.01, 'Herb Garden Supply'),
('Black Pepper', 'Freshly ground black pepper', 'grams', 300, 50, 0.05, 'Spice World'),
('Romaine Lettuce', 'Fresh romaine lettuce heads', 'pieces', 18, 8, 2.50, 'Green Valley Farms'),
('Croutons', 'Homemade style croutons', 'grams', 1200, 300, 0.008, 'Bakery Supplies'),
('Caesar Dressing', 'Premium caesar dressing', 'liters', 2.1, 1, 6.80, 'Gourmet Sauces');

-- Sample Recipe Data for Testing
INSERT INTO recipes (name, description, category, prep_time, cook_time, servings, difficulty) VALUES 
('Classic Margherita Pizza', 'Traditional Italian pizza with fresh tomatoes, mozzarella, and basil', 'food', 20, 15, 4, 'medium'),
('Fresh Lemonade', 'Refreshing homemade lemonade with fresh lemons', 'drink', 10, 0, 2, 'easy'),
('Chicken Carbonara', 'Creamy pasta dish with chicken, bacon, and parmesan', 'food', 15, 25, 4, 'medium');

-- Sample ingredients for Classic Margherita Pizza (recipe_id = 1) - now using product_id
INSERT INTO recipe_ingredients (recipe_id, product_id, quantity, unit, notes, order_index) VALUES 
(1, 1, 1, 'ball', 'Store-bought or homemade', 1),
(1, 2, 0.5, 'cup', 'San Marzano preferred', 2),
(1, 3, 8, 'oz', 'Buffalo mozzarella if available', 3),
(1, 4, 10, 'leaves', 'Picked fresh', 4),
(1, 5, 2, 'tbsp', 'High quality', 5),
(1, 6, 1, 'pinch', 'Sea salt', 6);

-- Sample ingredients for Fresh Lemonade (recipe_id = 2) - now using product_id
INSERT INTO recipe_ingredients (recipe_id, product_id, quantity, unit, notes, order_index) VALUES 
(2, 7, 4, 'whole', 'Room temperature for better juicing', 1),
(2, 8, 0.5, 'cup', 'Granulated white sugar', 2);

-- Sample ingredients for Chicken Carbonara (recipe_id = 3) - now using product_id
INSERT INTO recipe_ingredients (recipe_id, product_id, quantity, unit, notes, order_index) VALUES 
(3, 9, 1, 'lb', 'Good quality pasta', 1),
(3, 10, 2, 'pieces', 'Boneless, skinless', 2),
(3, 11, 6, 'strips', 'Thick cut preferred', 3),
(3, 12, 3, 'whole', 'Room temperature', 4),
(3, 13, 1, 'cup', 'Freshly grated', 5),
(3, 14, 0.5, 'cup', 'Full fat', 6),
(3, 15, 3, 'cloves', 'Minced', 7),
(3, 16, 1, 'tsp', 'Freshly ground', 8);

-- Sample steps for Classic Margherita Pizza (recipe_id = 1)
INSERT INTO recipe_steps (recipe_id, step_number, instruction, timing) VALUES 
(1, 1, 'Preheat oven to 475°F (245°C). If using a pizza stone, place it in the oven while preheating.', 15),
(1, 2, 'Roll out pizza dough on a floured surface to desired thickness.', 5),
(1, 3, 'Spread tomato sauce evenly over the dough, leaving a 1-inch border for the crust.', 2),
(1, 4, 'Tear mozzarella into small pieces and distribute evenly over the sauce.', 2),
(1, 5, 'Drizzle with olive oil and season with a pinch of salt.', 1),
(1, 6, 'Bake for 12-15 minutes until crust is golden and cheese is bubbly.', 15),
(1, 7, 'Remove from oven and immediately top with fresh basil leaves. Let cool for 2-3 minutes before slicing.', 3);

-- Sample steps for Fresh Lemonade (recipe_id = 2)
INSERT INTO recipe_steps (recipe_id, step_number, instruction, timing) VALUES 
(2, 1, 'Roll lemons on counter while pressing down to soften them for easier juicing.', 2),
(2, 2, 'Cut lemons in half and juice them, removing any seeds. You should have about 1/2 cup of juice.', 5),
(2, 3, 'In a pitcher, dissolve sugar in 1 cup of warm water, stirring until completely dissolved.', 3),
(2, 4, 'Add lemon juice and remaining 3 cups of cold water. Stir well.', 1),
(2, 5, 'Taste and adjust sweetness if needed. Chill in refrigerator for at least 30 minutes.', 30),
(2, 6, 'Serve over ice cubes and garnish with lemon slices if desired.', 1);

-- Sample steps for Chicken Carbonara (recipe_id = 3)
INSERT INTO recipe_steps (recipe_id, step_number, instruction, timing) VALUES 
(3, 1, 'Bring a large pot of salted water to boil for pasta.', 10),
(3, 2, 'Season chicken breasts with salt and pepper, then cook in a large skillet over medium-high heat until golden and cooked through, about 6-7 minutes per side.', 15),
(3, 3, 'Remove chicken and let rest, then slice into strips. Set aside.', 3),
(3, 4, 'In the same skillet, cook bacon until crispy. Remove and chop, reserving 2 tbsp of fat in pan.', 8),
(3, 5, 'Add pasta to boiling water and cook according to package directions until al dente.', 10),
(3, 6, 'While pasta cooks, whisk together eggs, cream, parmesan, and black pepper in a bowl.', 3),
(3, 7, 'Add minced garlic to the skillet with bacon fat and cook for 30 seconds until fragrant.', 1),
(3, 8, 'Drain pasta, reserving 1 cup pasta water. Add hot pasta to the skillet.', 2),
(3, 9, 'Remove from heat and quickly stir in egg mixture, adding pasta water as needed to create a creamy sauce.', 2),
(3, 10, 'Add chicken and bacon back to the pan, toss to combine, and serve immediately.', 2);

-- Menu items now based on recipes
INSERT INTO menu_items (recipe_id, name, description, price, category, cost_per_serving, profit_margin) VALUES 
(1, 'Classic Margherita Pizza', 'Traditional Italian pizza with fresh tomatoes, mozzarella, and basil', 16.99, 'Pizza', 6.50, 0.35),
(2, 'Fresh Lemonade', 'Refreshing homemade lemonade with fresh lemons', 4.99, 'Beverages', 1.20, 0.40),
(3, 'Chicken Carbonara', 'Creamy pasta dish with chicken, bacon, and parmesan', 18.99, 'Pasta', 8.75, 0.32);

-- Legacy menu items (without recipes) - will be migrated
INSERT INTO menu_items (name, description, price, category, cost_per_serving, profit_margin) VALUES 
('Caesar Salad', 'Romaine lettuce, parmesan, croutons', 8.99, 'Salads', 3.20, 0.35),
('Grilled Chicken', 'Herb-seasoned chicken breast', 15.99, 'Main Course', 7.50, 0.30),
('Chocolate Cake', 'Rich chocolate layer cake', 6.99, 'Desserts', 2.80, 0.40),
('Coffee', 'Freshly brewed coffee', 2.99, 'Beverages', 0.85, 0.45);

-- Sample inventory transactions for audit trail
INSERT INTO inventory_transactions (product_id, transaction_type, quantity_change, reference_type, reference_id, notes) VALUES 
(1, 'restock', 30.0, 'manual', NULL, 'Initial stock - pizza dough delivery'),
(2, 'restock', 10.0, 'manual', NULL, 'Initial stock - tomato sauce delivery'),
(3, 'restock', 15.0, 'manual', NULL, 'Initial stock - mozzarella delivery'),
(4, 'restock', 600.0, 'manual', NULL, 'Initial stock - fresh basil delivery'),
(5, 'restock', 5.0, 'manual', NULL, 'Initial stock - olive oil delivery'),
(1, 'sale', -5.0, 'order', 1, 'Pizza orders - evening service'),
(2, 'sale', -1.5, 'order', 1, 'Pizza sauce usage - evening service'),
(3, 'sale', -3.0, 'order', 1, 'Mozzarella usage - evening service');