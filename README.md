# JobHunt - Automated Job Matching

Automated job search, AI-powered matching, and email notifications.

## Quick Start

### 1. Backend
```bash
cd backend
npm install
npm run dev
```
Server runs on http://localhost:3001

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```
App runs on http://localhost:5173

## Features
- 📄 Upload PDF resume
- 🔍 Search jobs via JSearch API
- 🤖 AI-powered matching with Mistral
- 📧 Email notifications via Gmail
- ⏰ Hourly auto-run option
- 💾 PostgreSQL database (Neon)

## Configuration
All API keys are pre-configured in `backend/.env`:
- Mistral AI
- JSearch API
- Gmail OAuth
- Neon PostgreSQL

## Gmail Setup
To enable email sending, you need a Gmail App Password:
1. Go to Google Account → Security
2. Enable 2-Step Verification
3. Create App Password for "Mail"
4. Add to `backend/.env`:
   ```
   GMAIL_USER=your@gmail.com
   GMAIL_APP_PASSWORD=your-app-password
   ```
