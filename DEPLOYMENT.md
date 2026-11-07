# Production Deployment Guide: AI Resume & Job Matcher

This guide details the complete, step-by-step production deployment process for the **AI Resume & Job Matcher** application.

---

## Architecture Overview

| Tier | Recommended Platform | Alternative Platforms |
| :--- | :--- | :--- |
| **Frontend** | [Vercel](https://vercel.com) (Static React SPA) | Netlify, Cloudflare Pages, Render Static Sites |
| **Backend API** | [Render](https://render.com) (Node.js Web Service) | Railway, Fly.io, Heroku, AWS App Runner |
| **Database** | [TiDB Cloud](https://tidbcloud.com) or [Aiven](https://aiven.io) (Managed MySQL) | Railway MySQL, AWS RDS MySQL, DigitalOcean |
| **Persistent Files** | Render Persistent Disk (`/var/data/uploads`) | Railway Volume, AWS S3 / EBS |

---

## 1. Deploy the MySQL Database

The project requires a MySQL 8.0+ compatible database with support for `utf8mb4` character set, JSON columns, and generated timestamps.

### Recommended Free & Low-Cost Providers

1. **TiDB Cloud Serverless (Recommended — Generous Free Tier)**
   - **Cost:** Free tier includes 5 GiB storage and 50M Request Units per month (no credit card required).
   - **Compatibility:** 100% MySQL 8.0 wire-protocol compatible with native SSL encryption.
   - **Setup:**
     1. Sign up at [https://tidbcloud.com](https://tidbcloud.com).
     2. Click **Create Cluster** and select **Serverless (Free)**.
     3. Choose a region closest to your backend (e.g., `us-east-1` or `eu-central-1`).
     4. Note down your cluster connection parameters:
        - Host (e.g. `gateway01.us-east-1.prod.aws.tidbcloud.com`)
        - Port: `4000`
        - User (e.g. `xxxxx.root`)
        - Password
        - Database name (e.g. `test` or create `resume_job_matcher`)
     5. Under security settings, ensure public endpoint access is enabled with SSL required.

2. **Aiven for MySQL (Free Trial / Developer Tier)**
   - **Cost:** Free trial available; fully managed MySQL with automatic backups and automated SSL certificate generation.
   - **Setup:**
     1. Sign up at [https://aiven.io](https://aiven.io).
     2. Create a **MySQL** service on the cloud provider of choice (AWS / GCP).
     3. Download the `ca.pem` certificate from the overview page if strict CA verification is enabled.
     4. Copy the connection URI or the discrete host, port, user, and password.

3. **Railway MySQL (Pay-As-You-Go / Free Monthly Credit)**
   - **Cost:** $5 free monthly usage credit on Trial/Hobby plan.
   - **Setup:**
     1. Log in to [https://railway.app](https://railway.app).
     2. Click **New Project** → **Provision MySQL**.
     3. Under the database **Variables** tab, copy `MYSQL_URL` or the individual `MYSQLHOST`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`, and `MYSQLPORT`.

### Running Schema Migration

Once your hosted MySQL instance is running:

#### Option A: Automatic Initialization via Node CLI (Recommended)
Set your production credentials in your shell or terminal and run:
```bash
# In the backend directory:
cd backend

# Either using full connection URI:
DATABASE_URL="mysql://username:password@your-host:3306/resume_job_matcher" DB_SSL=true npm run migrate

# Or using discrete environment variables:
DB_HOST="your-host" DB_PORT=3306 DB_USER="username" DB_PASSWORD="password" DB_NAME="resume_job_matcher" DB_SSL=true npm run migrate
```
The script will safely execute `CREATE TABLE IF NOT EXISTS` for `users` and `resume_analyses`, add foreign key constraints and validation checks, and verify connectivity without altering any existing data.

#### Option B: Manual SQL Execution
Connect to your remote database via your provider's web SQL console, MySQL Workbench, or DBeaver, and run the SQL migration script located at:
`backend/migrations/production_setup.sql`

---

## 2. Deploy the Express Backend (Render)

### Step 1: Create a Web Service on Render
1. Log in to [https://render.com](https://render.com) and click **New +** → **Web Service**.
2. Connect your Git repository containing the project.
3. Configure the service settings:
   - **Name:** `ai-resume-job-matcher-backend`
   - **Region:** Select the same region as your MySQL database.
   - **Branch:** `main`
   - **Root Directory:** `backend`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Instance Type:** `Free` or `Starter`

### Step 2: Configure Persistent Disk for Resume Storage
*Why this matters:* Cloud containers run on ephemeral filesystems. When your backend restarts or redeploys, temporary files are destroyed. Resumes must remain accessible for re-analysis, ATS recalculation, and skill evaluation.

1. In your Render Web Service dashboard, go to the **Disks** tab.
2. Click **Add Disk**:
   - **Name:** `resume-uploads-disk`
   - **Mount Path:** `/var/data/uploads`
   - **Size:** `1 GB` (or larger as required)
3. Under Environment Variables (see Step 3), set:
   ```env
   UPLOADS_DIR=/var/data/uploads
   ```

### Step 3: Add Backend Environment Variables
In the Render service **Environment** tab, add the following variables:

| Variable Name | Value Description | Example Value |
| :--- | :--- | :--- |
| `NODE_ENV` | Runtime environment | `production` |
| `PORT` | Listening port (Render injects this, default 10000) | `10000` |
| `CLIENT_URL` | Deployed frontend domain(s) for CORS | `https://your-app.vercel.app,http://localhost:3000` |
| `DATABASE_URL` | Hosted MySQL connection URI (if using single URI) | `mysql://user:pass@host:3306/db?ssl={"rejectUnauthorized":true}` |
| `DB_HOST` | Database host (if using individual vars) | `gateway01.us-east-1.prod.aws.tidbcloud.com` |
| `DB_PORT` | Database port | `4000` or `3306` |
| `DB_USER` | Database username | `your_user` |
| `DB_PASSWORD` | Database password | `your_secure_password` |
| `DB_NAME` | Database schema name | `resume_job_matcher` |
| `DB_SSL` | Enable SSL encryption for cloud database | `true` |
| `DB_SSL_REJECT_UNAUTHORIZED` | Strict certificate verification | `true` |
| `JWT_SECRET` | Cryptographically random secret for JWT signing | *(32+ char random string, e.g. from openssl)* |
| `JWT_EXPIRES_IN` | Token validity duration | `7d` |
| `GEMINI_API_KEY` | Google Gemini API key for embeddings & tips | `AIzaSy...` |
| `UPLOADS_DIR` | Persistent disk directory path for resume files | `/var/data/uploads` |

### Step 4: Health Check Verification
Render provides automatic health monitoring:
- **Health Check Path:** `/api/health` (or `/health`)
Once deployed, verify by opening in your browser:
`https://your-render-service.onrender.com/api/health`
Response:
```json
{
  "status": "OK",
  "message": "AI Resume & Job Matcher Backend is running smoothly",
  "database": {
    "connected": true,
    "status": "Connected"
  }
}
```

---

## 3. Deploy the React Frontend (Vercel)

### Step 1: Create a Project on Vercel
1. Log in to [https://vercel.com](https://vercel.com) and click **Add New...** → **Project**.
2. Import your Git repository.
3. Configure the project settings:
   - **Framework Preset:** `Vite`
   - **Root Directory:** `./` (workspace root)
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

### Step 2: Configure Environment Variables
In the Vercel **Environment Variables** section, add:

| Variable Name | Value Description | Example Value |
| :--- | :--- | :--- |
| `VITE_API_URL` | Full URL to your deployed Render backend | `https://ai-resume-job-matcher-backend.onrender.com/api` |

### Step 3: SPA Routing Fallback
Vercel is pre-configured via the root `vercel.json` file:
```json
{
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```
This guarantees that navigating directly or refreshing URLs like `/login`, `/dashboard`, or `/results` routes cleanly to the React SPA without 404 errors. Additionally, `public/_redirects` is provided for Netlify and Render Static Sites.

---

## 4. Post-Deployment Verification Checklist

Once both services are deployed, perform the following verification steps:

1. **Check Backend Health:**
   - Request `GET https://your-backend.onrender.com/api/health`
   - Confirm status is `OK` and database shows `Connected`.
2. **Test User Registration & Authentication:**
   - Visit `https://your-frontend.vercel.app/signup`
   - Register a new user account.
   - Confirm immediate login with issued JWT stored securely in `localStorage`.
3. **Upload Resume:**
   - Upload a sample PDF or DOCX resume.
   - Confirm that the file is accepted, scanned, and saved to the persistent uploads path.
4. **Run Semantic Match & ATS Analysis:**
   - Paste a real job description.
   - Verify semantic score, skill gap badges (matched, missing, additional), and ATS breakdown.
5. **Download PDF Report:**
   - Click **Download PDF Report**.
   - Verify the browser downloads a valid, formatted PDF report with all analysis sections and disclaimers.
6. **Cross-User Security:**
   - Log out and log in with a different user account.
   - Verify that private analyses and uploaded resumes cannot be viewed by other accounts.
