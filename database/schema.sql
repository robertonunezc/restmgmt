-- Restaurant Management System Database Schema

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

-- Menu Items
CREATE TABLE IF NOT EXISTS menu_items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    category VARCHAR(50) NOT NULL,
    available BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

-- Recipe ingredients
CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id SERIAL PRIMARY KEY,
    recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
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

-- Indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_recipes_category ON recipes(category);
CREATE INDEX IF NOT EXISTS idx_recipes_name ON recipes(name);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_steps_recipe_id ON recipe_steps(recipe_id);

-- Sample Data
INSERT INTO tables (table_number, capacity) VALUES 
(1, 2), (2, 4), (3, 4), (4, 6), (5, 2), (6, 8);

INSERT INTO menu_items (name, description, price, category) VALUES 
('Margherita Pizza', 'Fresh tomatoes, mozzarella, basil', 12.99, 'Pizza'),
('Caesar Salad', 'Romaine lettuce, parmesan, croutons', 8.99, 'Salads'),
('Grilled Chicken', 'Herb-seasoned chicken breast', 15.99, 'Main Course'),
('Pasta Carbonara', 'Creamy pasta with bacon and eggs', 13.99, 'Pasta'),
('Chocolate Cake', 'Rich chocolate layer cake', 6.99, 'Desserts'),
('Coffee', 'Freshly brewed coffee', 2.99, 'Beverages'),
('Orange Juice', 'Fresh squeezed orange juice', 3.99, 'Beverages');

-- Sample Recipe Data for Testing
INSERT INTO recipes (name, description, category, prep_time, cook_time, servings, difficulty) VALUES 
('Classic Margherita Pizza', 'Traditional Italian pizza with fresh tomatoes, mozzarella, and basil', 'food', 20, 15, 4, 'medium'),
('Fresh Lemonade', 'Refreshing homemade lemonade with fresh lemons', 'drink', 10, 0, 2, 'easy'),
('Chicken Carbonara', 'Creamy pasta dish with chicken, bacon, and parmesan', 'food', 15, 25, 4, 'medium');

-- Sample ingredients for Classic Margherita Pizza (recipe_id = 1)
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, notes, order_index) VALUES 
(1, 'Pizza dough', 1, 'ball', 'Store-bought or homemade', 1),
(1, 'Tomato sauce', 0.5, 'cup', 'San Marzano preferred', 2),
(1, 'Fresh mozzarella', 8, 'oz', 'Buffalo mozzarella if available', 3),
(1, 'Fresh basil leaves', 10, 'leaves', 'Picked fresh', 4),
(1, 'Extra virgin olive oil', 2, 'tbsp', 'High quality', 5),
(1, 'Salt', 1, 'pinch', 'Sea salt', 6);

-- Sample ingredients for Fresh Lemonade (recipe_id = 2)
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, notes, order_index) VALUES 
(2, 'Fresh lemons', 4, 'whole', 'Room temperature for better juicing', 1),
(2, 'Sugar', 0.5, 'cup', 'Granulated white sugar', 2),
(2, 'Water', 4, 'cups', 'Cold filtered water', 3),
(2, 'Ice cubes', 1, 'cup', 'For serving', 4);

-- Sample ingredients for Chicken Carbonara (recipe_id = 3)
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, notes, order_index) VALUES 
(3, 'Spaghetti', 1, 'lb', 'Good quality pasta', 1),
(3, 'Chicken breast', 2, 'pieces', 'Boneless, skinless', 2),
(3, 'Bacon', 6, 'strips', 'Thick cut preferred', 3),
(3, 'Eggs', 3, 'whole', 'Room temperature', 4),
(3, 'Parmesan cheese', 1, 'cup', 'Freshly grated', 5),
(3, 'Heavy cream', 0.5, 'cup', 'Full fat', 6),
(3, 'Garlic', 3, 'cloves', 'Minced', 7),
(3, 'Black pepper', 1, 'tsp', 'Freshly ground', 8);

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