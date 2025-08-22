#!/usr/bin/env node

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Database connection
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'restaurant_db',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

async function resetDatabase() {
  try {
    console.log('🔄 Starting database reset...');
    
    // Read the reset script
    const resetScript = fs.readFileSync(
      path.join(__dirname, '../database/reset-database.sql'), 
      'utf8'
    );
    
    // Execute the reset script
    await pool.query(resetScript);
    
    console.log('✅ Database reset completed successfully');
    console.log('📊 Sample data has been inserted');
    
    // Show summary
    const counts = {};
    const tableNames = ['tables', 'recipes', 'menu_items', 'orders'];
    
    for (const tableName of tableNames) {
      const result = await pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
      counts[tableName] = result.rows[0].count;
    }
    
    console.log('\n📈 Data Summary:');
    Object.entries(counts).forEach(([table, count]) => {
      console.log(`   ${table}: ${count} records`);
    });
    
  } catch (error) {
    console.error('❌ Database reset failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  resetDatabase();
}

module.exports = { resetDatabase };