# Restaurant Management System

A complete restaurant management system built with Express.js, PostgreSQL, and vanilla frontend technologies.

## Features

- **Table Management**: Track table status (available, occupied, reserved, cleaning)
- **Menu Management**: Add, edit, and manage menu items by category
- **Order Management**: Create orders, track status, and manage order flow
- **Real-time Updates**: Dynamic status updates for tables and orders

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **Frontend**: Vanilla JavaScript, HTML5, CSS3, Bootstrap 5
- **Environment**: dotenv for configuration

## Setup Instructions

### Option 1: Docker Setup (Recommended)

#### Development with Docker
```bash
# Start PostgreSQL only (for local development)
npm run docker:dev

# Install dependencies locally
npm install

# Run the app locally
npm run dev
```

#### Full Docker Setup
```bash
# Build and start both database and application
npm run docker:prod

# View logs
npm run docker:logs

# Stop services
npm run docker:stop
```

### Option 2: Manual Setup

#### 1. Install Dependencies
```bash
npm install
```

#### 2. Database Setup
1. Install PostgreSQL and create a database named `restaurant_db`
2. Update the `.env` file with your database credentials
3. Run the schema to create tables and sample data:
```bash
psql -d restaurant_db -f database/schema.sql
```

#### 3. Environment Configuration
Update `.env` file with your settings:
```
PORT=3000
DB_USER=your_username
DB_HOST=localhost
DB_NAME=restaurant_db
DB_PASSWORD=your_password
DB_PORT=5432
```

#### 4. Run the Application
```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

Visit `http://localhost:3000` to access the application.

## API Endpoints

### Tables
- `GET /api/tables` - Get all tables
- `PUT /api/tables/:id/status` - Update table status

### Menu
- `GET /api/menu` - Get all menu items
- `POST /api/menu` - Add new menu item
- `PUT /api/menu/:id` - Update menu item
- `DELETE /api/menu/:id` - Delete menu item

### Orders
- `GET /api/orders` - Get all orders with items
- `POST /api/orders` - Create new order
- `PUT /api/orders/:id/status` - Update order status

### Health Check
- `GET /api/health` - Check server and database status

## Project Structure

```
restaurant-soft/
├── server.js              # Main server file
├── routes/                 # API routes
│   ├── menu.js
│   ├── orders.js
│   └── tables.js
├── database/
│   └── schema.sql         # Database schema and sample data
├── public/                # Frontend files
│   ├── index.html
│   ├── app.js
│   └── styles.css
├── .env                   # Environment variables
└── package.json
```

## Usage

1. **Tables**: Click on table cards to cycle through statuses
2. **Menu**: Add new items using the "Add Item" button
3. **Orders**: Create orders and update their status as they progress

## Development

### Local Development

#### Development Scripts
- `npm run dev` - Basic development with nodemon (watches backend files)
- `npm run dev:watch` - Enhanced development with frontend file watching
- `npm run dev:verbose` - Verbose nodemon output for debugging
- `npm run dev:debug` - Start with Node.js debugger
- `npm run dev:full` - Start database + server concurrently
- `npm run watch` - Watch specific directories only

#### File Watching
The development setup includes comprehensive file watching:
- **Backend files**: `server.js`, `routes/`, `database/`, `.env`
- **Frontend files**: `public/` (with browser notifications)
- **Extensions**: `.js`, `.json`, `.sql`, `.env`
- **Auto-reload**: Server restarts automatically on backend changes
- **Live reload**: Frontend changes trigger browser notifications

### Docker Commands
- `npm run docker:dev` - Start PostgreSQL container only
- `npm run docker:prod` - Start full application stack
- `npm run docker:stop` - Stop all containers
- `npm run docker:logs` - View container logs

### Database Access
When using Docker, PostgreSQL is available at:
- Host: `localhost`
- Port: `5432`
- Database: `restaurant_db`
- Username: `postgres`
- Password: `password`

Connect with: `psql -h localhost -U postgres -d restaurant_db`