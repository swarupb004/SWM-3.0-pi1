# BPO Tracker - Quick Start Guide

This guide will help you set up and run the BPO Tracker application locally.

## Prerequisites

Before you begin, ensure you have:
- Node.js 18 or higher installed
- PostgreSQL 12 or higher installed and running
- npm (comes with Node.js)

## Step 1: Database Setup

1. Start PostgreSQL server (if not already running)

2. Create a new database:
```bash
createdb bpo_tracker
```

Or using psql:
```sql
CREATE DATABASE bpo_tracker;
```

## Step 2: Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Edit the `.env` file with your database credentials:
```env
PORT=3000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=bpo_tracker
DB_USER=postgres
DB_PASSWORD=your_password_here
JWT_SECRET=your_secret_key_here
JWT_EXPIRES_IN=24h
CORS_ORIGIN=http://localhost:5173
```

5. Start the backend server:
```bash
npm run dev
```

The backend will start on `http://localhost:3000` and automatically create all necessary database tables.

## Step 3: Frontend Setup

1. Open a new terminal and navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. (Optional) Create environment file if you need custom API URL:
```bash
echo "VITE_API_URL=http://localhost:3000/api" > .env
```

4. Start the frontend development server:
```bash
npm run dev
```

The frontend will start on `http://localhost:5173`

## Step 4: Create Your First User

You can create a user via the API using curl:

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@example.com",
    "password": "admin123",
    "role": "admin",
    "team": "Management"
  }'
```

Or create an agent user:
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "agent1",
    "email": "agent1@example.com",
    "password": "password123",
    "role": "agent",
    "team": "Support Team"
  }'
```

## Step 5: Login to the Application

1. Open your browser and go to `http://localhost:5173`
2. Login with the credentials you created:
   - Username: `admin` (or `agent1`)
   - Password: `admin123` (or `password123`)

## Using the Application

### For Agents:
- **Dashboard**: View your attendance status and assigned cases
- **Attendance**: Check-in/out and manage breaks
- **Cases**: Create and manage customer support cases
- **Reports**: View case statistics

### For Managers/Admins:
All agent features plus:
- **Team Dashboard**: View team attendance and performance
- **Import/Export**: Bulk import cases from CSV or export data
- **Delete Cases**: Remove cases from the system

## Troubleshooting

### Backend won't start
- Check PostgreSQL is running: `pg_isready`
- Verify database credentials in `.env`
- Check if port 3000 is available

### Frontend won't start
- Ensure backend is running first
- Check if port 5173 is available
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`

### Database connection error
- Verify PostgreSQL is running
- Check database exists: `psql -l`
- Verify credentials in `.env`

### Can't login
- Check user was created successfully
- Verify JWT_SECRET is set in backend `.env`
- Check browser console for errors

## Production Deployment

### Backend
```bash
cd backend
npm run build
npm start
```

### Frontend
```bash
cd frontend
npm run build
# Serve the dist/ folder with a web server
```

## API Documentation

The backend API is RESTful and returns JSON. Key endpoints:

- **Auth**: `/api/auth/*` - Registration, login, profile
- **Attendance**: `/api/attendance/*` - Check-in/out, breaks, history
- **Cases**: `/api/cases/*` - CRUD operations for cases
- **Import/Export**: `/api/import/*` - CSV operations

For detailed API documentation, see `backend/README.md`

## Next Steps

- Configure email notifications (requires additional setup)
- Set up automated backups for PostgreSQL
- Configure reverse proxy (nginx) for production
- Set up SSL certificates
- Configure monitoring and logging

## Support

For issues or questions, please refer to:
- Main README.md
- Backend README.md
- Frontend README.md
