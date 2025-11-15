# BPO Tracker - Workforce & Case Management System

A complete Business Process Outsourcing (BPO) tracking application for managing workforce attendance and customer support cases.

**Available as Web App and Windows Desktop Application**

## Overview

BPO Tracker is a full-stack application that helps manage:
- **Employee Attendance**: Track check-in/check-out times, breaks, and work hours
- **Case Management**: Create, assign, and track customer support cases
- **Team Management**: Monitor team performance and attendance
- **Bulk Operations**: Import/export cases via CSV
- **Analytics**: Generate reports and statistics

## Deployment Options

### Web Application
Browser-based application accessible from any device with modern web browser.

### Desktop Application (Windows)
Native Windows executable with:
- **Local-first storage**: SQLite database saved to OneDrive/local drive
- **Offline capability**: Work without internet, auto-sync when connected
- **Keyboard shortcuts**: Ctrl+Shift+C to start case, E to close
- **Floating drawer**: Movable, resizable case entry window
- **System tray**: Background operation with tray icon
- See `desktop/README.md` for desktop-specific documentation

## Technology Stack

### Backend
- TypeScript
- Express.js
- PostgreSQL
- JWT Authentication
- CSV parsing with csv-parse
- Bcrypt for password hashing

### Frontend (Web)
- React 18 with TypeScript
- Vite for build tooling
- React Router for navigation
- Axios for API communication
- Custom hooks (useTimer)
- Responsive CSS

### Desktop
- Electron framework
- SQLite (better-sqlite3) for local storage
- Automatic sync with PostgreSQL server
- electron-store for settings
- electron-builder for Windows installer

## Features

### Authentication & Authorization
- JWT-based authentication
- Role-based access control (agent, manager, admin)
- Secure password hashing

### Attendance Management
- Real-time check-in/check-out
- Break time tracking
- Live timer display
- Attendance history
- Team attendance monitoring

### Case Control
- Create and assign cases
- Update case status and priority
- Case history tracking
- Search and filter functionality
- Case statistics

### Bulk Import/Export
- CSV import with validation
- Error reporting for failed imports
- CSV export with filters
- Template download

### Reports & Analytics
- Case statistics dashboard
- Status distribution
- Priority distribution
- Team performance metrics

## Project Structure

```
SWM-3.0-pi1/
├── backend/                 # Backend API
│   ├── src/
│   │   ├── config/         # Database configuration
│   │   ├── controllers/    # Request handlers
│   │   ├── middleware/     # Auth middleware
│   │   ├── models/         # Data models
│   │   ├── routes/         # API routes
│   │   ├── utils/          # Utilities
│   │   └── server.ts       # Entry point
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
│
├── frontend/               # Frontend web application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── hooks/          # Custom hooks
│   │   ├── services/       # API client
│   │   ├── styles/         # CSS styles
│   │   ├── types/          # TypeScript types
│   │   ├── App.tsx         # Main app
│   │   └── main.tsx        # Entry point
│   ├── index.html
│   ├── vite.config.mts
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
│
└── desktop/                # Desktop application (Windows)
    ├── src/
    │   ├── main/           # Electron main process
    │   │   ├── main.ts     # Application entry
    │   │   ├── database.ts # SQLite manager
    │   │   └── sync.ts     # Server sync logic
    │   ├── preload/        # IPC bridge
    │   │   └── preload.ts  # Secure API exposure
    │   └── renderer/       # React UI
    │       └── components/ # Desktop-specific components
    ├── assets/             # Icons and resources
    ├── package.json
    ├── tsconfig.main.json
    └── README.md
```

## Prerequisites

- Node.js 18 or higher
- PostgreSQL 12 or higher
- npm or yarn

## Quick Start

### 1. Database Setup

Create a PostgreSQL database:
```bash
createdb bpo_tracker
```

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your database credentials
npm run dev
```

The backend will start on `http://localhost:3000` and automatically create the database schema.

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will start on `http://localhost:5173`

### 4. Create First User

You can register a user via the API:

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@example.com",
    "password": "admin123",
    "role": "admin"
  }'
```

Then login at `http://localhost:5173/login`

### 5. Desktop App Setup (Optional)

For Windows desktop application:

```bash
cd desktop
npm install
npm run dev
```

Or build Windows installer:

```bash
npm run package:win
```

The installer will be in `desktop/release/`. See `desktop/README.md` for full desktop documentation.

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/profile` - Get profile

### Attendance
- `POST /api/attendance/check-in` - Check in
- `POST /api/attendance/check-out` - Check out
- `POST /api/attendance/break-start` - Start break
- `POST /api/attendance/break-end` - End break
- `GET /api/attendance/my-attendance` - Get attendance history
- `GET /api/attendance/today` - Get today's status
- `GET /api/attendance/team` - Get team attendance

### Cases
- `POST /api/cases` - Create case
- `GET /api/cases` - Get all cases
- `GET /api/cases/:id` - Get case details
- `PUT /api/cases/:id` - Update case
- `DELETE /api/cases/:id` - Delete case
- `GET /api/cases/:id/history` - Get case history
- `GET /api/cases/my-cases` - Get my cases
- `GET /api/cases/stats` - Get statistics

### Import/Export
- `POST /api/import/import` - Import CSV
- `GET /api/import/export` - Export CSV
- `GET /api/import/template` - Download template

## User Roles

- **Agent**: Can manage own attendance and assigned cases
- **Manager**: Agent permissions + view team attendance and import cases
- **Admin**: All permissions

## Development

### Backend Development
```bash
cd backend
npm run dev      # Start with hot reload
npm run build    # Build for production
npm start        # Start production server
```

### Frontend Development
```bash
cd frontend
npm run dev      # Start dev server
npm run build    # Build for production
npm run preview  # Preview production build
```

## CSV Import Format

Cases can be imported via CSV with the following columns:
- case_number (required)
- customer_name (required)
- customer_email
- customer_phone
- case_type (required)
- priority (high/medium/low)
- description
- status (open/in_progress/resolved/closed)

Download the template from the Import page in the application.

## Environment Variables

### Backend (.env)
```
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=bpo_tracker
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=24h
CORS_ORIGIN=http://localhost:5173
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:3000/api
```

## Database Schema

- **users**: User accounts and roles
- **attendance**: Attendance records with check-in/out and breaks
- **cases**: Customer support cases
- **case_history**: Audit trail for case changes

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- Role-based access control
- SQL injection prevention
- CORS protection
- Input validation

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.
