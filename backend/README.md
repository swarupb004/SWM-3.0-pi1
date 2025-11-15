# BPO Tracker Backend

Backend service for the BPO Tracker application - a comprehensive workforce and case management system.

## Features

- **Authentication**: JWT-based authentication with role-based access control
- **Attendance Management**: Track employee check-in/check-out and breaks
- **Case Management**: Create, update, and track customer support cases
- **Bulk Import**: Import cases from CSV files
- **Reports**: Generate analytics and export data

## Technology Stack

- TypeScript
- Express.js
- PostgreSQL
- JWT for authentication
- CSV parsing for bulk imports

## Prerequisites

- Node.js 18+ 
- PostgreSQL 12+

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your database credentials and JWT secret
```

3. Create the database:
```bash
createdb bpo_tracker
```

4. Start the development server:
```bash
npm run dev
```

The server will start on `http://localhost:3000` and automatically initialize the database schema.

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/profile` - Get user profile

### Attendance
- `POST /api/attendance/check-in` - Check in
- `POST /api/attendance/check-out` - Check out
- `POST /api/attendance/break-start` - Start break
- `POST /api/attendance/break-end` - End break
- `GET /api/attendance/my-attendance` - Get my attendance records
- `GET /api/attendance/today` - Get today's status
- `GET /api/attendance/team` - Get team attendance (manager/admin only)

### Cases
- `POST /api/cases` - Create case
- `GET /api/cases` - Get all cases (with filters)
- `GET /api/cases/my-cases` - Get my assigned cases
- `GET /api/cases/stats` - Get case statistics
- `GET /api/cases/:id` - Get case details
- `PUT /api/cases/:id` - Update case
- `DELETE /api/cases/:id` - Delete case (manager/admin only)
- `GET /api/cases/:id/history` - Get case history

### Import/Export
- `POST /api/import/import` - Import cases from CSV (manager/admin only)
- `GET /api/import/export` - Export cases to CSV
- `GET /api/import/template` - Download CSV template

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run linter
- `npm test` - Run tests

## Database Schema

The application uses PostgreSQL with the following tables:
- `users` - User accounts and authentication
- `attendance` - Attendance records
- `cases` - Customer support cases
- `case_history` - Case update history

## Security

- Passwords are hashed using bcrypt
- JWT tokens for authentication
- Role-based access control (agent, manager, admin)
- Input validation and SQL injection prevention
