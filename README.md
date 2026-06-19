# Task Calendar App

Gamified Task Calendar App with PostgreSQL (Neon) backend and Vercel deployment.

## Project Structure

```
├── api/                    # Vercel Serverless API functions
│   ├── db/                # Database schema
│   │   └── schema.sql     # PostgreSQL schema for Neon
│   ├── db.js              # Database connection module
│   ├── auth.js            # POST /api/auth - login & register
│   ├── tasks.js           # CRUD /api/tasks
│   ├── profile.js         # GET/PUT /api/profile
│   ├── streak.js          # GET/POST /api/streak
│   ├── achievements.js    # GET/POST /api/achievements
│   └── package.json
├── src/                   # React frontend (Vite)
│   ├── config/
│   │   └── api.config.ts  # API configuration
│   ├── services/
│   │   └── api.service.ts  # API service layer
│   └── ...
├── vercel.json            # Vercel deployment config
├── .env.example           # Environment variables template
└── package.json
```

## Local Development

1. Install frontend dependencies:
   ```
   npm install
   ```

2. Start the development server:
   ```
   npm run dev
   ```

## Database Setup (Neon)

1. Create a free account at https://console.neon.tech
2. Create a new project (PostgreSQL)
3. Copy your connection string (looks like: `postgresql://user:password@ep-xxxx.us-east-2.aws.neon.tech/neondb?sslmode=require`)
4. Open the Neon SQL Editor and run the schema from `api/db/schema.sql` to create all tables

## Deployment to Vercel

### 1. Push to GitHub

Create a GitHub repository and push your code:
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### 2. Deploy to Vercel

1. Go to https://vercel.com and sign in with GitHub
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Configure environment variables:
   - **Key:** `DATABASE_URL`
   - **Value:** Your Neon PostgreSQL connection string
5. Click "Deploy"

### 3. Verify Deployment

- Your frontend will be at: `https://your-project.vercel.app`
- API endpoints available at: `https://your-project.vercel.app/api/auth`
- The API automatically handles CORS and routes requests

## API Endpoints

| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/api/auth` | POST | Login (`action: "login"`) or Register (`action: "register"`) |
| `/api/tasks` | GET, POST, PUT, DELETE | CRUD operations for tasks |
| `/api/profile` | GET, PUT | Get/update user profile |
| `/api/streak` | GET, POST | Get daily streak / check daily completion |
| `/api/achievements` | GET, POST | Get achievements / unlock or check all |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon PostgreSQL connection string (set in Vercel dashboard) |
| `VITE_API_URL` | No | Custom API URL for local dev (leave empty for Vercel) |

## Tech Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, MUI
- **Backend:** Node.js Serverless Functions (Vercel)
- **Database:** PostgreSQL (Neon)
- **Deployment:** Vercel