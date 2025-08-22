#!/usr/bin/env node

const { spawn } = require('child_process');
const chokidar = require('chokidar');
const path = require('path');

console.log('🚀 Starting development environment...\n');

// Start the server with nodemon
const server = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  shell: true
});

// Watch frontend files for changes
const frontendWatcher = chokidar.watch(['public/**/*'], {
  ignored: /node_modules/,
  persistent: true
});

frontendWatcher.on('change', (filePath) => {
  const relativePath = path.relative(process.cwd(), filePath);
  console.log(`\n🔄 Frontend file changed: ${relativePath}`);
  console.log('💡 Refresh your browser to see changes\n');
});

// Watch database schema changes
const dbWatcher = chokidar.watch(['database/**/*.sql'], {
  ignored: /node_modules/,
  persistent: true
});

dbWatcher.on('change', (filePath) => {
  const relativePath = path.relative(process.cwd(), filePath);
  console.log(`\n📊 Database schema changed: ${relativePath}`);
  console.log('💡 You may need to restart the database container\n');
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down development environment...');
  server.kill();
  frontendWatcher.close();
  dbWatcher.close();
  process.exit(0);
});

console.log('👀 Watching for changes...');
console.log('📁 Backend: server.js, routes/, database/');
console.log('🎨 Frontend: public/');
console.log('🔧 Press Ctrl+C to stop\n');