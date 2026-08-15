# Break Time Tracker App

A full-stack QR Code-based break time management system for teams. Operators request breaks via QR scan, and Supervisors/Team Leaders/Coordinators approve them with custom durations. Built with React, Node.js, Express, and MongoDB.

## Features

- **QR Code Scanning** — Operators scan QR codes to request breaks
- **Approval Workflow** — Supervisors, Team Leaders, and Coordinators review and approve break requests with custom durations
- **5-Minute Reminder** — Operators get notified 5 minutes before their approved break ends
- **Real-Time Dashboard** — Live break status, pending requests, and staffing coverage
- **Role-Based Access** — Single login page for all users (Admin, Supervisor, Team Leader, Coordinator, Operator)
- **Shift Management** — Morning, Afternoon, Night, and Rotating shifts
- **Reports & Analytics** — Daily break statistics, late returns, and staff summaries
- **Password Management** — All users can change their own password

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, HTML5-QRCode |
| Backend | Node.js, Express |
| Database | MongoDB (Mongoose) |
| Auth | JWT (JSON Web Tokens) |
| Deployment | Render |

## Quick Start

### Local Development

```bash
# 1. Install all dependencies
npm run install-deps

# 2. Create server .env file
cp server/.env.example server/.env
# Edit server/.env and add your MongoDB URI

# 3. Start both frontend and backend
npm run dev

# Frontend: http://localhost:3000
# Backend:  http://localhost:5000
```

### Default Login

| Username | Password | Role |
|----------|----------|------|
| `admin` | `Admin123` | Admin |

The admin account is auto-created on first server startup.

## Deployment (Render)

### 1. MongoDB Atlas
- Create a free cluster at [mongodb.com/atlas](https://mongodb.com/atlas)
- Whitelist IP `0.0.0.0/0`
- Copy your connection string

### 2. Render Web Service
- Connect your GitHub repo
- **Build Command:** `cd server && npm install`
- **Start Command:** `cd server && node server.js`
- **Environment Variables:**
  - `MONGODB_URI` = your MongoDB connection string
  - `JWT_SECRET` = any random long string
  - `NODE_ENV` = `production`

## Project Structure

```
break-time-tracker-app/
├── server/              # Backend API
│   ├── config/          # Database config
│   ├── middleware/      # Auth & role middleware
│   ├── models/          # Mongoose models
│   ├── routes/          # API routes
│   └── server.js        # Entry point
├── client/              # React frontend
│   ├── src/
│   │   ├── api/         # API client functions
│   │   ├── components/  # Reusable components
│   │   ├── context/     # Auth context
│   │   ├── pages/       # Page components
│   │   └── main.jsx     # Entry point
│   └── index.html
└── package.json         # Root package.json
```

## API Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/auth/login` | Login | Public |
| POST | `/api/auth/change-password` | Change password | Any user |
| GET | `/api/auth/me` | Get current user | Any user |
| GET | `/api/users` | List all users | Any user |
| POST | `/api/users` | Create user | Any user |
| DELETE | `/api/users/:id` | Delete user | Any user |
| GET | `/api/breaks/today` | Today's breaks | Any user |
| GET | `/api/breaks/my` | My breaks | Any user |
| GET | `/api/breaks/pending` | Pending requests | Any user |
| POST | `/api/breaks/request` | Request break | Operator |
| POST | `/api/breaks/approve/:id` | Approve break | Supervisor+ |
| POST | `/api/breaks/reject/:id` | Reject break | Supervisor+ |
| POST | `/api/breaks/end/:id` | End break | Owner |
| GET | `/api/breaks/reports` | Daily reports | Any user |
| GET | `/api/settings` | Get settings | Any user |
| PUT | `/api/settings` | Update settings | Any user |

## License

MIT
