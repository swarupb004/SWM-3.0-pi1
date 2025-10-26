# BPO Tracker Frontend

React-based frontend application for the BPO Tracker - a comprehensive workforce and case management system.

## Features

- **Authentication**: Secure login system
- **Dashboard**: Overview of attendance and cases
- **Attendance Management**: Check-in/check-out with break tracking
- **Case Management**: Create, view, and manage customer support cases
- **Team Dashboard**: View team attendance (manager/admin)
- **Bulk Import/Export**: CSV import/export for cases
- **Reports**: Analytics and statistics

## Technology Stack

- React 18
- TypeScript
- Vite
- React Router
- Axios
- date-fns

## Prerequisites

- Node.js 18+
- Backend API running (see backend README)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create environment file (optional):
```bash
# Create .env file if you need to override API URL
echo "VITE_API_URL=http://localhost:3000/api" > .env
```

3. Start the development server:
```bash
npm run dev
```

The application will start on `http://localhost:5173`

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run linter

## Project Structure

```
frontend/
├── src/
│   ├── components/      # React components
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Navigation.tsx
│   │   ├── AttendancePanel.tsx
│   │   ├── AttendanceHistory.tsx
│   │   ├── Cases.tsx
│   │   ├── TeamDashboard.tsx
│   │   ├── BulkImport.tsx
│   │   └── Reports.tsx
│   ├── hooks/           # Custom React hooks
│   │   └── useTimer.ts
│   ├── services/        # API client
│   │   └── api.ts
│   ├── styles/          # CSS styles
│   │   └── App.css
│   ├── types/           # TypeScript types
│   │   └── index.ts
│   ├── App.tsx          # Main App component
│   └── main.tsx         # Entry point
├── index.html
├── vite.config.mts
├── tsconfig.json
└── package.json
```

## Default Login

After setting up the backend and creating a user, you can log in with:
- Username: Your registered username
- Password: Your registered password

## Features Overview

### Attendance Panel
- Check in/out functionality
- Break time tracking
- Live timer showing elapsed time
- Today's status display

### Case Management
- Create new cases
- Search and filter cases
- Update case status
- View case details
- Assign cases to team members

### Team Dashboard (Manager/Admin)
- View team attendance
- Date range filtering
- See team member work hours
- Track breaks

### Bulk Import/Export
- Import cases from CSV
- Export cases to CSV
- Download template
- View import results with error details

### Reports
- Case statistics
- Status distribution
- Priority distribution
- Visual analytics

## API Integration

The frontend communicates with the backend API. Make sure the backend is running before using the frontend.

API base URL can be configured via `VITE_API_URL` environment variable.

## Development

The application uses:
- **Vite** for fast development and HMR
- **TypeScript** for type safety
- **React Router** for routing
- **Axios** for API calls with interceptors
- **Custom hooks** like `useTimer` for reusable logic

## Building for Production

```bash
npm run build
```

The production build will be in the `dist/` directory.

To preview the production build:
```bash
npm run preview
```
