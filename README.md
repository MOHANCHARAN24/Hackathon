# CampusAI - Student Support & Communication System

CampusAI is a RAG-powered college assistant that provides accurate, document-grounded responses for student support topics such as admission, academics, finance, campus services, and wellbeing. The app combines FastAPI, LangChain, ChromaDB, Gemini, and React to deliver trustworthy, multilingual support with source transparency.

## Tech Stack

- Backend: Python 3.11, FastAPI, LangChain, langchain-community, ChromaDB, sentence-transformers, google-generativeai, aiosqlite, langdetect, PyPDF, docx2txt
- Frontend: React 18, Vite, TailwindCSS v3, Zustand, Axios, Recharts, react-markdown, Web Speech API
- Database and Storage: SQLite (feedback/query logs), local persisted Chroma vectorstore

## Setup Instructions

1. Install backend dependencies:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```
2. Add environment variables in `backend/.env`:
   ```env
   GEMINI_API_KEY=your_key_here
   COLLEGE_NAME=Your College Name
   ADMIN_PASSWORD=choose_a_strong_password
   CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
   APP_ENV=development
   STRICT_STARTUP_VALIDATION=false
   ```
3. Put your college documents in `backend/docs/` (PDF, TXT, DOCX).
4. Build embeddings and vectorstore:
   ```bash
   python ingest.py
   ```
5. Start backend server:
   ```bash
   uvicorn main:app --reload
   ```
6. Start frontend:
   ```bash
   cd ../frontend
   npm install
   # Windows PowerShell
   $env:VITE_API_URL="http://127.0.0.1:8000"
   npm run dev
   ```

## Deployment Notes

- Never hardcode admin secrets in source code. Set `ADMIN_PASSWORD` in runtime environment.
- Set `CORS_ORIGINS` to your deployed frontend domain(s), comma-separated.
- Set frontend `VITE_API_URL` to your deployed backend URL during build/runtime.
- Ensure `backend/vectorstore/` and `backend/feedback.db` are persisted volumes in production.
- In production, set `APP_ENV=production` (or `STRICT_STARTUP_VALIDATION=true`) to fail fast on missing required env variables.

## Docker Deploy

Run both services with Docker Compose:

```bash
docker compose up --build
```

Services:

- Frontend: `http://localhost:8080`
- Backend API: `http://localhost:8000`

## CI

GitHub Actions workflow is included at `.github/workflows/ci.yml` and runs:

- Backend import smoke test on Python 3.11
- Frontend production build on Node 20

## Deployment Dry Run

From the project root, run:

```powershell
powershell -ExecutionPolicy Bypass -File .\deploy-dry-run.ps1
```

This script validates:

- Required backend env values in `backend/.env`
- Backend strict startup preflight/import smoke test
- Frontend production build
- Docker compose file validity (if Docker is installed)

Optional flags:

```powershell
powershell -ExecutionPolicy Bypass -File .\deploy-dry-run.ps1 -SkipDocker
powershell -ExecutionPolicy Bypass -File .\deploy-dry-run.ps1 -ApiUrl "https://api.example.com"
```

## One-Command Dev Startup

From the project root, run:

```powershell
powershell -ExecutionPolicy Bypass -File .\start-dev.ps1
```

Optional: choose a preferred backend port.

```powershell
powershell -ExecutionPolicy Bypass -File .\start-dev.ps1 -BackendPort 8010
```

This command launches backend and frontend in separate PowerShell windows and automatically sets `VITE_API_URL` for the frontend process.

## First Run Checklist

- Confirm `backend/.env` contains a valid Gemini API key.
- Confirm college documents are present in `backend/docs/`.
- Run `python ingest.py` and verify the vectorstore is created.
- Start backend and check `GET /health` returns `{"status":"ok"}`.
- Start frontend and send a sample chat message.

## Add New Documents

1. Drop new PDF/TXT/DOCX files into `backend/docs/`.
2. Re-run ingestion from backend:
   ```bash
   python ingest.py
   ```
3. Restart the FastAPI server.

## API Endpoints

| Method | Endpoint       | Description                                                              |
| ------ | -------------- | ------------------------------------------------------------------------ |
| POST   | `/chat`        | Processes student query via RAG and returns grounded answer with sources |
| POST   | `/feedback`    | Saves message feedback (`rating`: 1 or -1)                               |
| GET    | `/admin/stats` | Returns dashboard analytics from SQLite logs                             |
| GET    | `/modules`     | Returns 5 support modules with starter questions                         |
| GET    | `/health`      | Returns service health and vectorstore status                            |
