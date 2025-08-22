const express = require("express");
const router = express.Router();
const { pool } = require("../utils/db-connection");
const fs = require("fs");
const path = require("path");

// Reset database - WARNING: This will delete all data!
router.post("/reset", async (req, res) => {
  try {
    console.log("🔄 Starting database reset...");

    // Read the reset script
    const resetScript = fs.readFileSync(
      path.join(__dirname, "../database/reset-database.sql"),
      "utf8"
    );

    // Execute the reset script
    await pool.query(resetScript);

    console.log("✅ Database reset completed successfully");

    res.json({
      success: true,
      message: "Database reset completed successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Database reset failed:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Check database status
router.get("/status", async (req, res) => {
  try {
    const checks = [];

    // Check tables exist
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    const tablesResult = await pool.query(tablesQuery);
    checks.push({
      check: "Tables exist",
      status: "success",
      details: tablesResult.rows.map((r) => r.table_name),
    });

    // Check data counts
    const counts = {};
    const tableNames = [
      "tables",
      "recipes",
      "menu_items",
      "orders",
      "order_items",
    ];

    for (const tableName of tableNames) {
      try {
        const countResult = await pool.query(
          `SELECT COUNT(*) as count FROM ${tableName}`
        );
        counts[tableName] = parseInt(countResult.rows[0].count);
      } catch (err) {
        counts[tableName] = "Error: " + err.message;
      }
    }

    checks.push({
      check: "Data counts",
      status: "success",
      details: counts,
    });

    // Check foreign key relationships
    const fkQuery = `
      SELECT 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
      ORDER BY tc.table_name, kcu.column_name
    `;

    const fkResult = await pool.query(fkQuery);
    checks.push({
      check: "Foreign key constraints",
      status: "success",
      details: fkResult.rows,
    });

    res.json({
      success: true,
      database_status: "healthy",
      checks: checks,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Database status check failed:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Backup current data (export as JSON)
router.get("/backup", async (req, res) => {
  try {
    console.log("📦 Creating database backup...");

    const backup = {
      timestamp: new Date().toISOString(),
      tables: {},
      recipes: {},
      menu_items: {},
      orders: {},
      order_items: {},
    };

    // Backup tables
    const tablesResult = await pool.query("SELECT * FROM tables ORDER BY id");
    backup.tables = tablesResult.rows;

    // Backup recipes with ingredients and steps
    const recipesResult = await pool.query("SELECT * FROM recipes ORDER BY id");
    for (const recipe of recipesResult.rows) {
      const ingredientsResult = await pool.query(
        "SELECT * FROM recipe_ingredients WHERE recipe_id = $1 ORDER BY order_index",
        [recipe.id]
      );
      const stepsResult = await pool.query(
        "SELECT * FROM recipe_steps WHERE recipe_id = $1 ORDER BY step_number",
        [recipe.id]
      );

      backup.recipes[recipe.id] = {
        ...recipe,
        ingredients: ingredientsResult.rows,
        steps: stepsResult.rows,
      };
    }

    // Backup menu items
    const menuResult = await pool.query("SELECT * FROM menu_items ORDER BY id");
    backup.menu_items = menuResult.rows;

    // Backup orders
    const ordersResult = await pool.query("SELECT * FROM orders ORDER BY id");
    backup.orders = ordersResult.rows;

    // Backup order items
    const orderItemsResult = await pool.query(
      "SELECT * FROM order_items ORDER BY id"
    );
    backup.order_items = orderItemsResult.rows;

    console.log("✅ Database backup created successfully");

    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="restaurant_backup_${Date.now()}.json"`
    );
    res.json(backup);
  } catch (error) {
    console.error("❌ Database backup failed:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Initialize database with sample data only (doesn't drop tables)
router.post("/seed", async (req, res) => {
  try {
    console.log("🌱 Seeding database with sample data...");

    // Clear existing data
    await pool.query(
      "TRUNCATE order_items, orders, menu_items, recipe_steps, recipe_ingredients, recipes, tables RESTART IDENTITY CASCADE"
    );

    // Read the reset script
    const resetScript = fs.readFileSync(
      path.join(__dirname, "../database/reset-database.sql"),
      "utf8"
    );

    // Split script into individual statements and filter for INSERT statements
    const statements = resetScript
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.startsWith("INSERT INTO") && stmt.length > 0);

    console.log(`Found ${statements.length} INSERT statements to execute`);

    // Execute each INSERT statement
    for (const statement of statements) {
      if (statement.trim()) {
        await pool.query(statement);
      }
    }

    // Get data counts for confirmation
    const counts = {};
    const tableNames = [
      "tables",
      "recipes",
      "menu_items",
      "orders",
      "order_items",
    ];

    for (const tableName of tableNames) {
      try {
        const countResult = await pool.query(
          `SELECT COUNT(*) as count FROM ${tableName}`
        );
        counts[tableName] = parseInt(countResult.rows[0].count);
      } catch (err) {
        counts[tableName] = 0;
      }
    }

    console.log("✅ Database seeded successfully");
    console.log("📊 Data counts:", counts);

    res.json({
      success: true,
      message: "Database seeded with sample data successfully",
      data_counts: counts,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Database seeding failed:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;
