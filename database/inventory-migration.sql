-- Inventory System Database Migration
-- This script adds the inventory management tables to the existing restaurant database

-- Products table for inventory management
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

-- Recipe ingredient to product links table
CREATE TABLE IF NOT EXISTS recipe_ingredient_products (
    id SERIAL PRIMARY KEY,
    recipe_ingredient_id INTEGER REFERENCES recipe_ingredients(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    quantity_per_serving DECIMAL(10,3) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(recipe_ingredient_id, product_id)
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
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_low_stock ON products(current_quantity, low_stock_threshold);
CREATE INDEX IF NOT EXISTS idx_products_unit_measure ON products(unit_of_measure);

CREATE INDEX IF NOT EXISTS idx_recipe_ingredient_products_recipe_ingredient ON recipe_ingredient_products(recipe_ingredient_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredient_products_product ON recipe_ingredient_products(product_id);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_product ON inventory_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_type ON inventory_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_reference ON inventory_transactions(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_created_at ON inventory_transactions(created_at);

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

-- Sample recipe ingredient to product links
-- Links for Classic Margherita Pizza (recipe_id = 1)
INSERT INTO recipe_ingredient_products (recipe_ingredient_id, product_id, quantity_per_serving) VALUES 
(1, 1, 0.25), -- Pizza dough: 1 ball serves 4, so 0.25 per serving
(2, 2, 0.125), -- Tomato sauce: 0.5 cup = ~0.125 liters per 4 servings
(3, 3, 0.05), -- Fresh mozzarella: 8 oz = ~0.2 kg per 4 servings
(4, 4, 2.5), -- Fresh basil: 10 leaves = ~2.5 grams per 4 servings  
(5, 5, 0.008), -- Olive oil: 2 tbsp = ~0.03 liters per 4 servings
(6, 6, 0.001); -- Salt: 1 pinch = ~0.001 kg per 4 servings

-- Links for Fresh Lemonade (recipe_id = 2)
INSERT INTO recipe_ingredient_products (recipe_ingredient_id, product_id, quantity_per_serving) VALUES 
(7, 7, 2.0), -- Fresh lemons: 4 lemons for 2 servings = 2 per serving
(8, 8, 0.125); -- Sugar: 0.5 cup = ~0.125 kg for 2 servings

-- Links for Chicken Carbonara (recipe_id = 3)
INSERT INTO recipe_ingredient_products (recipe_ingredient_id, product_id, quantity_per_serving) VALUES 
(9, 9, 0.125), -- Spaghetti: 1 lb = ~0.5 kg for 4 servings
(10, 10, 0.125), -- Chicken breast: 2 pieces = ~0.5 kg for 4 servings  
(11, 11, 0.045), -- Bacon: 6 strips = ~0.18 kg for 4 servings
(12, 12, 0.75), -- Eggs: 3 eggs for 4 servings
(13, 13, 0.06), -- Parmesan: 1 cup = ~0.24 kg for 4 servings
(14, 14, 0.03), -- Heavy cream: 0.5 cup = ~0.12 liters for 4 servings
(15, 15, 1.5), -- Garlic: 3 cloves = ~6 grams for 4 servings
(16, 16, 0.6); -- Black pepper: 1 tsp = ~2.4 grams for 4 servings

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

COMMIT;