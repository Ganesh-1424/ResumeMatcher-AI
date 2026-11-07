# AI-Powered Resume & Job Matcher

> **A full-stack intelligent career platform that matches resumes to job postings using Google Gemini text embeddings, mathematical cosine similarity, ATS compliance evaluation, and AI-driven improvement recommendations.**

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![React 19](https://img.shields.io/badge/Frontend-React%2019%20%2B%20Vite-61DAFB?logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind%20CSS%204-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Backend-Node.js%2018%2B%20%7C%20Express-339933?logo=node.js)](https://nodejs.org/)
[![MySQL](https://img.shields.io/badge/Database-MySQL%208.0-4479A1?logo=mysql)](https://www.mysql.com/)
[![Google Gemini](https://img.shields.io/badge/AI-Google%20Gemini%20API-4285F4?logo=google)](https://ai.google.dev/)

---

## Table of Contents
- [Project Overview](#project-overview)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Environment Variables](#environment-variables)
- [Database Setup & Migrations](#database-setup--migrations)
- [Running the Application](#running-the-application)
- [Testing & Quality Assurance](#testing--quality-assurance)
- [API Overview](#api-overview)
- [Troubleshooting & FAQ](#troubleshooting--faq)
- [Documentation Index](#documentation-index)

---

## Project Overview

The **AI-Powered Resume & Job Matcher** addresses a fundamental challenge in modern job hunting: applicant tracking systems (ATS) and recruiters reject up to 75% of qualified resumes due to formatting inconsistencies, missing keywords, and poor alignment with job requirements.

Unlike conventional keyword-counter tools or superficial rating prompts, this platform executes an **end-to-end multi-stage pipeline**:
1. **Document Parsing & Verification:** Safely extracts raw text from PDF and Word (.docx) documents with binary magic-byte validation and path traversal defenses.
2. **Semantic Matching via High-Dimensional Embeddings:** Computes 3,072-dimensional vector embeddings using Google Gemini (`gemini-embedding-2-preview` / `text-embedding-004`) and calculates mathematical **Cosine Similarity** to quantify genuine conceptual alignment.
3. **Skill-Gap Analysis:** Extracts and categorizes technical competencies into **Matched Skills**, **Missing Skills**, and **Additional Skills** to highlight exact candidate strengths and gaps.
4. **ATS Readiness Scoring:** Scores document structure, contact sections, heading standards, length, and typography across 5 major evaluation dimensions (0–100 scale).
5. **Personalized AI Suggestions:** Delivers actionable, truthful advice across 6 core categories (Summary, Skills, Projects, Experience, ATS, Job-specific) using `gemini-2.5-flash` / `gemini-3.8-flash` with deterministic schema enforcement and resilient offline failovers.
6. **Downloadable PDF Reports:** Generates publication-ready multi-page analytical reports using PDFKit for offline review and interview preparation.

---

## Key Features

- **JWT & Google Authentication (OpenID Connect):** Dual authentication supporting email/password and official "Continue with Google" sign-in via Google Identity Services, backed by cryptographic token verification with `google-auth-library`, anti-hijack collision protection, and unified application JWTs.
- **Dual Format Ingestion (PDF & DOCX):** Deep inspection of file signatures (`%PDF` and `PK\x03\x04`) preventing extension-spoofing attacks.
- **Mathematical Semantic Calibration:** Converts raw cosine similarity into an intuitive 0–100% score calibrated against natural language baselines.
- **Dynamic Skill Taxonomy:** Categorizes languages, frameworks, cloud platforms, and methodologies with keyword frequency extraction.
- **Comprehensive ATS Breakdown:** Evaluates contact visibility, chronological headings, word count bounds, and parseability.
- **AI Improvement Engine:** Provides concrete phrasing templates (with bracketed metrics like `[e.g. reduced query latency by ~30%]`) without hallucinating false credentials.
- **Analytics Dashboard:** Aggregates total analyses, average scores, 30-day trends, and past analysis cards.
- **Searchable History & Pagination:** Filter and sort historical analyses by job role, resume filename, and creation date.
- **Instant Page Refresh Hydration:** Reloading any result or dashboard route immediately rehydrates state from MySQL without data loss.
- **Production Hardened:** Protected by Helmet HTTP headers, IP rate limiting, Express payload caps, and parameterized SQL queries.
- **Dark Mode & Responsive UI:** Seamless switching between dark and light themes with mobile drawer navigation.

---

## Technology Stack

### Frontend
- **Framework:** React 19 (Functional components, custom hooks)
- **Tooling:** Vite 8 (Ultra-fast HMR and Rollup production bundling)
- **Styling:** Tailwind CSS 4 (`@tailwindcss/vite`)
- **Routing:** React Router DOM 7
- **HTTP Client:** Axios (Configured with automated JWT request interceptor and 401 session clearing)
- **Icons:** Lucide React
- **Animations:** Motion (Framer Motion v12)

### Backend
- **Runtime:** Node.js 18+ (CommonJS modular architecture)
- **Server Framework:** Express.js 4.21
- **File Ingestion:** Multer 2.4 (5 MB limit, server-controlled random filenames, ephemeral unlinking)
- **Document Extractors:** `pdf-parse` (PDF text streams), `mammoth` (DOCX OpenXML XML extraction)
- **Report Engine:** PDFKit 0.16 (Dynamic multi-page vector PDF generation)
- **Security:** `helmet` 8.3, `express-rate-limit` 8.7, `bcryptjs` 3.0 (10 salt rounds), `jsonwebtoken` 9.0

### Database
- **Engine:** MySQL 8.0+
- **Driver:** `mysql2/promise` (Connection pooling, keep-alive, SSL certificate verification)
- **Character Set:** `utf8mb4` with `utf8mb4_unicode_ci` collation
- **Resilience:** Dual-mode database operations with an in-memory fallback store ensuring non-blocking development when MySQL is offline.

### AI & Embeddings
- **SDK:** `@google/genai` (Official modern Google Gen AI SDK)
- **Embedding Models:** `gemini-embedding-2-preview` (Primary), `text-embedding-004` (Secondary)
- **Generation Model:** `gemini-2.5-flash` (Primary), `gemini-3.8-flash` (Secondary)
- **Fallback Engine:** Deterministic high-dimensional n-gram semantic vector engine and rule-based suggestions engine.

---

## System Architecture

```mermaid
flowchart TD
    User([User / Browser])
    
    subgraph Frontend [React 19 + Vite SPA - Port 3000]
        Router[React Router]
        AuthCtx[Auth Context & JWT]
        ThemeCtx[Theme Context]
        Pages[Dashboard / Analyze / Results]
        AxiosClient[Axios API Client]
    end

    subgraph Backend [Node.js + Express API - Port 5000]
        Helmet[Helmet Security & CORS]
        RateLimit[Rate Limiters]
        AuthMW[JWT Auth Middleware]
        UploadMW[Upload Validation & Magic Bytes]
        
        subgraph Controllers
            AuthCtrl[authController]
            ResumeCtrl[resumeController]
            AnalysisCtrl[analysisController]
        end

        subgraph Services
            Parser[resumeParser\npdf-parse + mammoth]
            Matcher[matchingService\nCosine Similarity]
            Skills[skillGapService\nTaxonomy Engine]
            ATS[atsScoreService\nRule Evaluator]
            Suggestions[suggestionService\nGemini AI]
            Report[reportService\nPDFKit Generator]
        end
    end

    subgraph Storage [Persistent Data Layer]
        MySQL[(MySQL 8.0 DB\nusers + analyses)]
        DiskStorage[(Uploads Storage\n/var/data/uploads)]
    end

    subgraph ExternalAI [Google Cloud AI]
        GeminiEmbeddings[Gemini Embeddings API]
        GeminiFlash[Gemini 2.5/3.8 Flash]
    end

    User <--> Router
    Router --> Pages
    Pages --> AxiosClient
    AxiosClient <==>|HTTP / REST + JWT| Helmet
    Helmet --> RateLimit --> AuthMW
    AuthMW --> AuthCtrl & ResumeCtrl & AnalysisCtrl
    
    ResumeCtrl --> UploadMW --> DiskStorage
    ResumeCtrl --> Parser
    
    AnalysisCtrl --> Matcher <--> GeminiEmbeddings
    AnalysisCtrl --> Skills
    AnalysisCtrl --> ATS
    AnalysisCtrl --> Suggestions <--> GeminiFlash
    AnalysisCtrl --> Report
    
    AuthCtrl & AnalysisCtrl <==>|Parameterized SQL| MySQL
```

---

## Prerequisites

Before setting up the project locally, ensure you have:
- **Node.js:** v18.0.0 or higher ([Download Node.js](https://nodejs.org/))
- **npm:** v9.0.0 or higher
- **MySQL Server:** v8.0 or higher (or a cloud MySQL instance such as TiDB Cloud, Aiven, or Railway)
- **Google Gemini API Key:** Required for live AI embeddings and suggestions ([Get a Gemini API Key](https://aistudio.google.com/app/apikey))

---

## Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/ai-resume-job-matcher.git
cd ai-resume-job-matcher
```

### 2. Install Dependencies
Install dependencies for both the frontend and backend:

```bash
# Install frontend dependencies (at project root)
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

---

## Environment Variables

### Frontend Configuration (`.env` at project root)
Create a `.env` file at the root of the project:
```env
# URL of your Express API backend.
# In local development: http://localhost:5000/api
# In production on Vercel: https://your-backend-service.onrender.com/api
VITE_API_URL=http://localhost:5000/api
VITE_API_BASE_URL=http://localhost:5000/api

# Google OAuth 2.0 Client ID (Google Identity Services)
# Public client-side identifier created in Google Cloud Console
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here.apps.googleusercontent.com
```

### Backend Configuration (`backend/.env`)
Create a `.env` file inside the `backend/` directory:
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Allowed CORS Origins (Comma-separated for multiple domains)
CLIENT_URL=http://localhost:3000,http://localhost:5173

# MySQL Database Configuration (Option A: Discrete parameters)
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=resume_job_matcher
DB_SSL=false

# MySQL Database Configuration (Option B: Connection URI for Cloud MySQL)
# DATABASE_URL=mysql://user:password@host:3306/resume_job_matcher?ssl={"rejectUnauthorized":true}

# JWT Authentication
# In production, use a strong random secret >= 32 characters (e.g. openssl rand -base64 32)
JWT_SECRET=super_secure_jwt_secret_key_at_least_32_characters_long_2026
JWT_EXPIRES_IN=7d

# Google OAuth 2.0 Credentials (for OpenID Connect Token Verification)
# Must match VITE_GOOGLE_CLIENT_ID configured on the frontend
GOOGLE_CLIENT_ID=your_google_client_id_here.apps.googleusercontent.com

# Google Gemini AI API Key
GEMINI_API_KEY=your_gemini_api_key_here

# Persistent Resume Storage Directory
# In local development: leave empty to use backend/uploads
# In production (Render Persistent Disk): /var/data/uploads
UPLOADS_DIR=
```

---

## Google Authentication Setup (Google Identity Services)

The application uses **Google Identity Services (GIS)** with OpenID Connect for one-click authentication.

### Step-by-Step Google Cloud Console Setup
1. **Navigate to Google Cloud Console:**
   Go to [https://console.cloud.google.com/](https://console.cloud.google.com/) and select or create a Cloud Project.
2. **Configure the OAuth Consent Screen:**
   - Go to **APIs & Services** > **OAuth consent screen**.
   - Choose **External** user type and click **Create**.
   - Provide **App Name** (e.g., `AI Resume & Job Matcher`), **User support email**, and **Developer contact information**.
   - Under **Scopes**, the default OpenID Connect scopes (`openid`, `profile`, `email`) are sufficient.
   - Save and continue.
3. **Create OAuth 2.0 Web Client Credentials:**
   - Go to **APIs & Services** > **Credentials**.
   - Click **+ CREATE CREDENTIALS** > **OAuth client ID**.
   - Select **Application type:** `Web application`.
   - Set **Name:** `AI Resume Matcher Web Client`.
4. **Configure Authorized JavaScript Origins:**
   - In **Authorized JavaScript origins**, add:
     - Local dev: `http://localhost:3000`
     - Local dev: `http://localhost:5173`
     - Local dev: `http://127.0.0.1:3000`
     - Production: `https://your-frontend-domain.vercel.app` (or your production domain)
   - *Note:* Google Identity Services for client-side web buttons does **not** require an authorized redirect URI for the GIS token prompt mode.
5. **Add Client ID to Environment Variables:**
   - Copy the generated **Client ID** (e.g. `123456789-xxxx.apps.googleusercontent.com`).
   - Paste into root `.env` as `VITE_GOOGLE_CLIENT_ID`.
   - Paste into `backend/.env` as `GOOGLE_CLIENT_ID`.
   - *Security Rule:* **Never place the Google Client Secret in frontend code or repository files.** Only the public Client ID is needed on the frontend and backend for token verification.

---

## Database Setup & Migrations

### Fresh Database Setup
Initialize the complete database schema with users, google_id indexes, and resume analyses:
```bash
cd backend
npm run init-db
```

### Migrating Existing Installations for Google Auth
For existing databases created prior to Task 36, apply the non-destructive migration script:
```bash
# Using MySQL CLI
mysql -u root -p resume_job_matcher < backend/migrations/002_add_google_auth.sql
```
This migration safely:
- Modifies `password_hash` to be nullable for Google-only users.
- Adds `google_id` with a unique index `uk_users_google_id`.
- Adds `avatar_url` and `auth_provider` (`'local'`, `'google'`).
- Preserves 100% of existing user accounts and analysis records without downtime.

---

## Running the Application

### Option A: Run Both Services Concurrently (Recommended)
From the project root:
```bash
npm run dev
```
This automatically starts:
- The **Express Backend API** on `http://localhost:5000`
- The **Vite React Dev Server** on `http://localhost:3000` with automated `/api` reverse proxying.

### Option B: Run Services in Separate Terminals

**Terminal 1 (Backend API):**
```bash
cd backend
npm run dev      # or: node server.js
```

**Terminal 2 (Frontend React):**
```bash
npm run dev
```

Open your browser and navigate to `http://localhost:3000`.

---

## Testing & Quality Assurance

The codebase includes comprehensive automated test suites covering every tier:

```bash
# Run all backend test suites (Reliability + Security + Production Verification)
cd backend
npm run test:all

# Run specific individual test suites:
npm run test               # Task 31: End-to-end reliability & pagination tests (22 tests)
npm run test:security      # Task 33: Security hardening & threat defense tests (47 tests)
npm run test:production    # Task 34: Final production verification suite (94 tests)

# Verify frontend production build
cd ..
npm run build
```

---

## API Overview

| Method | Endpoint | Protection | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/health` or `/api/health` | Public | System status, uptime, and database connectivity. |
| `POST` | `/api/auth/signup` | Rate Limited | Register a new user account with hashed password. |
| `POST` | `/api/auth/login` | Rate Limited | Authenticate credentials and receive a JWT token. |
| `POST` | `/api/auth/logout` | Public | Acknowledge logout and invalidate client session. |
| `GET` | `/api/auth/profile` | JWT Required | Retrieve current authenticated user profile. |
| `POST` | `/api/resumes/upload` | JWT + Rate Limited | Upload a PDF or DOCX resume document. |
| `POST` | `/api/resumes/:id/extract-text` | JWT Required | Extract parsed plain text and document stats. |
| `POST` | `/api/analyses` | JWT Required | Create a new job analysis record tied to resume. |
| `POST` | `/api/analyses/:id/match` | JWT + Rate Limited | Calculate semantic vector match score (0–100). |
| `POST` | `/api/analyses/:id/skills` | JWT + Rate Limited | Extract matched, missing, and additional skills. |
| `POST` | `/api/analyses/:id/ats-score` | JWT + Rate Limited | Calculate ATS readiness score and category breakdown. |
| `POST` | `/api/analyses/:id/suggestions` | JWT + Rate Limited | Generate AI resume improvement recommendations. |
| `GET` | `/api/analyses/dashboard/stats` | JWT Required | Fetch dashboard analytics and recent activity card. |
| `GET` | `/api/analyses` | JWT Required | List historical analyses with search and pagination. |
| `GET` | `/api/analyses/:id` | JWT Required | Retrieve complete analysis details on page reload. |
| `GET` | `/api/analyses/:id/report` | JWT Required | Stream generated multi-page PDF report. |

For complete request/response schemas, sample payloads, and curl commands, refer to [`API_DOCUMENTATION.md`](./API_DOCUMENTATION.md).

---

## Troubleshooting & FAQ

### 1. `connect ECONNREFUSED 127.0.0.1:3306`
- **Cause:** MySQL server is not running or the port is blocked.
- **Solution:** Start MySQL via system services (`sudo systemctl start mysql` or `brew services start mysql`). Note that the backend includes an **in-memory fallback store**, meaning the API remains testable and responsive even if MySQL is temporarily offline.

### 2. `CORS policy blocked access from origin`
- **Cause:** The frontend URL does not match `CLIENT_URL` configured in `backend/.env`.
- **Solution:** Add your frontend domain to `CLIENT_URL` in `backend/.env` (e.g. `CLIENT_URL=http://localhost:3000,https://your-app.vercel.app`).

### 3. `File size exceeds the 5 MB limit`
- **Cause:** Uploaded resume document exceeds 5 MB.
- **Solution:** Compress the PDF or export a standard single/multi-page resume without heavy embedded high-resolution bitmaps.

### 4. `GEMINI_API_KEY is missing or invalid`
- **Cause:** External AI key is not set in `backend/.env`.
- **Solution:** Obtain a key from [Google AI Studio](https://aistudio.google.com/app/apikey) and set `GEMINI_API_KEY=your_key`. If omitted, the platform gracefully switches to its built-in deterministic semantic vector engine.

### 5. Port 5000 Already in Use (`EADDRINUSE`)
- **Cause:** Another node process is already running on port 5000.
- **Solution:** Free the port with `lsof -ti:5000 | xargs -r kill -9` or configure a custom port via `PORT=5001` in `backend/.env`.

---

## Documentation Index

- **[`ARCHITECTURE.md`](./ARCHITECTURE.md):** Deep technical dive into the React frontend, Express middleware pipeline, MySQL schema, mathematical matching algorithms, and Mermaid workflows.
- **[`API_DOCUMENTATION.md`](./API_DOCUMENTATION.md):** Comprehensive REST API reference with request/response schemas, error codes, and curl examples.
- **[`DEPLOYMENT.md`](./DEPLOYMENT.md):** Production deployment guide for hosted environments (Render, Vercel, TiDB Cloud, Aiven, Railway).
- **[`SECURITY.md`](./SECURITY.md):** Threat model, security controls, vulnerability audit, and token storage risk analysis.
- **[`PORTFOLIO_AND_RESUME.md`](./PORTFOLIO_AND_RESUME.md):** Resume bullet points, portfolio summaries, interview elevator pitch, and live demo walkthrough.
- **[`INTERVIEW_QA.md`](./INTERVIEW_QA.md):** 15 in-depth interview questions with grounded technical answers for campus placement preparation.
- **[`VERIFICATION_CHECKLIST.md`](./VERIFICATION_CHECKLIST.md):** Final audit checklist verifying script integrity, deployment links, and runtime health.

---

## License

This project is licensed under the [ISC License](./backend/package.json).
