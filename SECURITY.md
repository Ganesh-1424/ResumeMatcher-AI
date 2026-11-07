# AI Resume & Job Matcher - Security Hardening & Threat Model (Task 33)

This document provides a comprehensive security review, architecture guide, and threat mitigation audit for the **AI Resume & Job Matcher** application.

---

## 1. Secrets Management & Environment Isolation

### Controls Implemented
1. **Repository Hygiene (.gitignore):**
   - Root `.gitignore` and `backend/.gitignore` strictly exclude `.env*`, `.env.local`, and all private upload directories (`uploads/*`).
   - Only safe, placeholder-only template files (`.env.example` and `backend/.env.example`) are committed.
2. **Centralized Secret Resolution (`backend/config/jwt.js`):**
   - In production (`NODE_ENV=production`), `JWT_SECRET` is strictly required. If missing or shorter than 32 characters, the backend raises an explicit security error and refuses to fallback to insecure strings.
   - In development/testing, an isolated default is permitted with prominent console warnings.
3. **Zero Secrets in Frontend:**
   - Frontend only accesses public `VITE_API_URL` and `VITE_API_BASE_URL`.
   - Google Gemini AI keys, database credentials, and JWT signing keys reside exclusively in backend environment variables (`GEMINI_API_KEY`, `DB_PASSWORD`, `DATABASE_URL`, `JWT_SECRET`).
   - All AI calls and database transactions are proxied through server-side controller endpoints.

---

## 2. Authentication & Session Security

### Controls Implemented
1. **Password Hashing:**
   - Handled via `bcryptjs` with 10 salt rounds. Passwords are never stored or logged in plaintext.
   - Max password length capped at 128 characters to protect against algorithmic bcrypt Denial-of-Service (DoS) attacks.
2. **Response Field Sanitization:**
   - Signup, login, and profile endpoints return user objects containing only `{ id, name, email, created_at }`. Password hashes and salts are never returned.
3. **Session Invalidation & Token Storage Analysis:**
   - **Current Storage (localStorage):**
     - *Advantages:* Easy cross-origin SPA communication with decoupled static frontends (Vercel) and backend APIs (Render), immune to Cross-Site Request Forgery (CSRF).
     - *Risks:* Vulnerable if an XSS flaw exists on the frontend domain.
     - *Mitigations:* All user inputs and resume texts rendered in the React UI are sanitized, React JSX escapes markup by default, and `helmet` headers enforce `X-Content-Type-Options: nosniff`.
     - *Future Recommendation:* For enterprise banking-grade security, migrate to `HttpOnly`, `SameSite=Lax`, and `Secure` cookies with anti-CSRF synchronizer tokens if both frontend and backend share the same parent domain.
   - Added `POST /api/auth/logout` endpoint and Axios 401 automatic session cleanup interceptor.

---

## 3. Resume Upload & File Processing Security

### Controls Implemented
1. **File Type & MIME Validation:**
   - Strictly restricted to `.pdf` and `.docx` extensions and permitted MIME types (`application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`).
2. **Deep Binary Magic Bytes Inspection (`validateFileHeader`):**
   - Evaluates the initial 8 bytes on disk before processing:
     - PDF must start with `%PDF` (`0x25 0x50 0x44 0x46`).
     - DOCX must start with the zip archive signature `PK\x03\x04` (`0x50 0x4B 0x03 0x04`).
   - If spoofed content or corrupted bytes are detected, the uploaded file is **immediately deleted from disk (`fs.unlinkSync`)** to eliminate lingering payloads.
3. **Server-Controlled Random Filenames:**
   - Replaced user-supplied original filenames with cryptographically randomized filenames generated via `crypto.randomBytes(16).toString('hex')` (e.g. `resume_1741..._a8f9c...pdf`).
   - Completely immunizes against path traversal (`../`), null byte injections (`%00`), and filename collisions.
4. **Enforced File Confinement:**
   - Disk operations resolve using `path.basename()` and explicitly verify `resolvedFilePath.startsWith(uploadDir)`.
   - Upload directory is kept outside of public webroots and is never mounted to static file serving.

---

## 4. API Hardening, Rate Limiting & Database Protection

### Controls Implemented
1. **HTTP Security Headers (Helmet):**
   - Integrates `helmet` middleware:
     - `X-Content-Type-Options: nosniff` (prevents MIME type sniffing)
     - `X-Frame-Options: SAMEORIGIN` (guards against clickjacking)
     - `Strict-Transport-Security` (enforces HTTPS)
     - `X-Download-Options: noopen`
     - `X-DNS-Prefetch-Control: off`
2. **Multi-Tier Rate Limiting (`express-rate-limit`):**
   - **Auth Limiter:** Max 20 requests per 15 minutes per IP on `/api/auth/login` and `/api/auth/signup` (mitigates brute-force attacks).
   - **Upload Limiter:** Max 30 file uploads per 15 minutes per IP on `/api/resumes/upload`.
   - **AI Analysis Limiter:** Max 60 requests per 15 minutes per IP on `/match`, `/skills`, `/ats-score`, and `/suggestions` (protects Gemini quota and backend CPU).
   - **Global API Limiter:** Max 500 requests per 15 minutes per IP.
3. **Request Body Size Limits:**
   - Express JSON and URL-encoded parsers restricted to `1mb` maximum. Payloads exceeding this limit return `413 Payload Too Large`.
4. **Production CORS Policy:**
   - Rejects untrusted origins with `403 Forbidden` when running in `NODE_ENV=production`.
5. **SQL Injection Resistance:**
   - 100% of MySQL database interactions use parameterized queries (`pool.execute(sql, [params])`).

---

## 5. Dependency Audit Findings

During `npm audit`:
- **Vulnerabilities reviewed:**
  - `nodemon` devDependency (transitive `chokidar -> braces` DoS advisory):
    - *Risk Assessment:* **Zero production risk**. `nodemon` is strictly listed under `devDependencies` and is never run or bundled in production containers (`start: "node server.js"`).
  - `mammoth` (transitive `argparse -> sprintf-js` DoS advisory):
    - *Risk Assessment:* **Negligible**. `argparse` is only utilized by mammoth's command-line interface binary, which is not called by the application backend (backend uses `mammoth.extractRawText({ path })` programmatically). Running `npm audit fix --force` would downgrade mammoth to an ancient version (0.3.x) breaking DOCX text extraction.
