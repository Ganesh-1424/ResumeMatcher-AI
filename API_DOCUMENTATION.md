# REST API Documentation: AI Resume & Job Matcher

This document details the complete RESTful API specification for the **AI Resume & Job Matcher** backend server.

---

## Global Conventions & Standards

- **Base URL:** `/api`
- **Content Types:**
  - Standard Requests/Responses: `application/json`
  - Resume Uploads: `multipart/form-data`
  - PDF Report Generation: `application/pdf`
- **Authentication:**
  - Protected endpoints require an `Authorization` header formatted as:
    ```http
    Authorization: Bearer <your_jwt_token>
    ```
- **Error Response Format:**
  Every non-2xx response returns a standard JSON envelope:
  ```json
  {
    "error": "Error Type or Short Title",
    "message": "Human-readable description of what went wrong."
  }
  ```

---

## 1. System & Health Endpoints

### `GET /health` or `GET /api/health`
Health probe used by container orchestrators, load balancers, and monitoring agents.

- **Authentication:** None (Public)
- **Sample Request:**
  ```bash
  curl -X GET http://localhost:5000/api/health
  ```
- **Sample Response (200 OK):**
  ```json
  {
    "status": "OK",
    "message": "AI Resume & Job Matcher Backend is running smoothly",
    "timestamp": "2026-10-15T21:00:00.000Z",
    "uptime": "142.5s",
    "environment": "development",
    "database": {
      "connected": true,
      "host": "localhost",
      "name": "resume_job_matcher",
      "status": "Connected"
    }
  }
  ```

---

## 2. Authentication API (`/api/auth`)

### `POST /api/auth/signup`
Registers a new user account with an encrypted password hash.

- **Authentication:** None (Public, Rate-limited: max 20 requests / 15 min)
- **Request Body:**
  ```json
  {
    "name": "Jane Developer",
    "email": "jane.dev@example.com",
    "password": "SecurePassword123!"
  }
  ```
- **Sample Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "User registered successfully",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "name": "Jane Developer",
      "email": "jane.dev@example.com",
      "created_at": "2026-10-15T21:05:00.000Z"
    }
  }
  ```
- **Errors:**
  - `400 Bad Request`: Missing field, invalid email format, password < 8 characters.
  - `409 Conflict`: Account already registered with this email.

---

### `POST /api/auth/login`
Authenticates user credentials and issues a JWT session token.

- **Authentication:** None (Public, Rate-limited: max 20 requests / 15 min)
- **Request Body:**
  ```json
  {
    "email": "jane.dev@example.com",
    "password": "SecurePassword123!"
  }
  ```
- **Sample Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Login successful",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "name": "Jane Developer",
      "email": "jane.dev@example.com",
      "created_at": "2026-10-15T21:05:00.000Z"
    }
  }
  ```
- **Errors:**
  - `400 Bad Request`: Missing email or password.
  - `401 Unauthorized`: Invalid email or password (generic message prevents account enumeration).

---

### `POST /api/auth/google`
Authenticates a user via OpenID Connect Google ID Token from Google Identity Services. Verifies token cryptographically, provisions user in MySQL (or connects existing Google user), and returns the application JWT.

- **Authentication:** None (Public, Rate-limited: max 20 requests / 15 min)
- **Request Body:**
  ```json
  {
    "credential": "<Google_ID_Token_JWT>"
  }
  ```
- **Sample Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Google login successful",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 2,
      "name": "Jane Doe",
      "email": "jane.doe@gmail.com",
      "created_at": "2026-10-15T21:10:00.000Z"
    }
  }
  ```
- **Errors:**
  - `400 Bad Request`: Missing `credential` in request body.
  - `401 Unauthorized`: Malformed token, signature mismatch, audience mismatch, or expired token.
  - `403 Forbidden`: Google email address is unverified by Google.
  - `409 Conflict`: `EMAIL_COLLISION_PASSWORD_EXISTS` — an account with this email address already exists with password authentication. Requires password verification to link.

---

### `POST /api/auth/google/link`
Securely links a Google account to an existing password-based account after validating the user's password. Prevents unauthorized account takeover while enabling unified Google sign-in.

- **Authentication:** None (Public, Rate-limited: max 20 requests / 15 min)
- **Request Body:**
  ```json
  {
    "email": "jane.dev@example.com",
    "password": "ExistingAccountPassword123!",
    "credential": "<Google_ID_Token_JWT>"
  }
  ```
- **Sample Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Google account linked successfully",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "name": "Jane Developer",
      "email": "jane.dev@example.com",
      "created_at": "2026-10-15T21:05:00.000Z"
    }
  }
  ```
- **Errors:**
  - `400 Bad Request`: Missing email, password, or Google credential.
  - `401 Unauthorized`: Invalid password or unverifiable Google token.
  - `404 Not Found`: User not found.

---

### `POST /api/auth/logout`
Acknowledges client session termination.

- **Authentication:** None (Public)
- **Sample Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Logged out successfully."
  }
  ```

---

### `GET /api/auth/profile`
Returns the authenticated user's profile details.

- **Authentication:** Bearer JWT required
- **Sample Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Protected profile retrieved successfully",
    "user": {
      "id": 1,
      "name": "Jane Developer",
      "email": "jane.dev@example.com",
      "created_at": "2026-10-15T21:05:00.000Z"
    }
  }
  ```

---

## 3. Resume Upload & Processing API (`/api/resumes`)

### `POST /api/resumes/upload`
Uploads a resume file (PDF or DOCX). Enforces 5 MB limit, binary magic-byte inspection, and randomized server-controlled filenames.

- **Authentication:** Bearer JWT required (Rate-limited: max 30 uploads / 15 min)
- **Headers:** `Content-Type: multipart/form-data`
- **Form Data Field:** `resume` (File)
- **Sample Request:**
  ```bash
  curl -X POST http://localhost:5000/api/resumes/upload \
    -H "Authorization: Bearer <TOKEN>" \
    -F "resume=@/path/to/my_resume.pdf"
  ```
- **Sample Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Resume uploaded successfully",
    "file": {
      "originalName": "my_resume.pdf",
      "savedFilename": "resume_1741234567890_a8f9c1b2e3d4.pdf",
      "size": 45120,
      "mimetype": "application/pdf",
      "uploadedAt": "2026-10-15T21:10:00.000Z"
    },
    "analysisId": 101,
    "userId": 1
  }
  ```
- **Errors:**
  - `400 Bad Request`: File size exceeds 5 MB (`LIMIT_FILE_SIZE`).
  - `400 Bad Request`: Disallowed extension or spoofed binary format (`SIGNATURE_MISMATCH`).

---

### `POST /api/resumes/:id/extract-text`
Extracts readable plain text, word count, character count, and document metadata from a previously uploaded resume.

- **Authentication:** Bearer JWT required
- **URL Parameter:** `:id` (Integer analysis ID or resume filename)
- **Sample Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Resume text extracted successfully",
    "analysisId": 101,
    "filename": "resume_1741234567890_a8f9c1b2e3d4.pdf",
    "originalFilename": "my_resume.pdf",
    "documentType": "pdf",
    "text": "Jane Developer\nFull Stack Engineer\nEmail: jane@example.com...",
    "wordCount": 420,
    "charCount": 2680,
    "isTruncated": false
  }
  ```
- **Errors:**
  - `403 Forbidden`: Attempting to access another user's uploaded resume file.
  - `404 Not Found`: Resume record or disk file does not exist.

---

## 4. Job Analysis & AI Intelligence API (`/api/analyses`)

### `POST /api/analyses`
Creates a new job analysis record binding an uploaded resume to a targeted job title and description.

- **Authentication:** Bearer JWT required
- **Request Body:**
  ```json
  {
    "resumeId": 101,
    "jobTitle": "Senior Full Stack Cloud Engineer",
    "jobDescription": "We are seeking an experienced Full Stack Cloud Engineer proficient in Node.js, React, Express, MySQL, Docker, and AWS. The candidate will design scalable RESTful microservices..."
  }
  ```
- **Sample Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Job analysis created successfully",
    "analysis": {
      "id": 102,
      "userId": 1,
      "jobTitle": "Senior Full Stack Cloud Engineer",
      "jobDescription": "We are seeking an experienced Full Stack Cloud Engineer...",
      "resumeFilename": "resume_1741234567890_a8f9c1b2e3d4.pdf",
      "originalFilename": "my_resume.pdf",
      "matchScore": null,
      "atsScore": null,
      "createdAt": "2026-10-15T21:12:00.000Z"
    },
    "resumeDetails": {
      "documentType": "pdf",
      "wordCount": 420,
      "charCount": 2680,
      "isTruncated": false
    }
  }
  ```

---

### `POST /api/analyses/:id/match`
Calculates high-dimensional vector embeddings and computes the calibrated 0–100% semantic match score between the resume and job description.

- **Authentication:** Bearer JWT required (Rate-limited: max 60 AI calls / 15 min)
- **URL Parameter:** `:id` (Analysis ID)
- **Sample Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Semantic match scoring completed successfully.",
    "analysisId": 102,
    "matchScore": 82,
    "rawSimilarity": 0.7874,
    "matchQuality": "Excellent Match",
    "explanation": "High semantic alignment: Resume strongly matches core responsibilities, technical domain, and seniority requirements.",
    "model": "gemini-embedding-2-preview",
    "updatedAt": "2026-10-15T21:12:05.000Z"
  }
  ```

---

### `POST /api/analyses/:id/skills`
Analyzes technical proficiencies and categorizes skills into matched, missing, and additional competencies.

- **Authentication:** Bearer JWT required (Rate-limited: max 60 AI calls / 15 min)
- **Sample Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Skill gap analysis completed successfully.",
    "analysisId": 102,
    "skills": {
      "matched": ["JavaScript", "Node.js", "React", "Express", "MySQL", "Docker", "AWS"],
      "missing": ["Kubernetes", "Redis", "CI/CD"],
      "additional": ["Tailwind CSS", "Git", "REST APIs"]
    },
    "skillNames": {
      "matched": ["JavaScript", "Node.js", "React", "Express", "MySQL", "Docker", "AWS"],
      "missing": ["Kubernetes", "Redis", "CI/CD"],
      "additional": ["Tailwind CSS", "Git", "REST APIs"]
    },
    "summary": "Candidate matches 7 out of 10 required skills (70% coverage)."
  }
  ```

---

### `POST /api/analyses/:id/ats-score`
Evaluates the resume against 5 standard ATS criteria (0–100 total score).

- **Authentication:** Bearer JWT required (Rate-limited: max 60 AI calls / 15 min)
- **Sample Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "ATS readiness scoring completed successfully.",
    "analysisId": 102,
    "atsScore": 88,
    "categoryBreakdown": [
      {
        "category": "Contact Information",
        "score": 20,
        "maxScore": 20,
        "status": "Pass",
        "feedback": "Valid email address and phone number detected."
      },
      {
        "category": "Standard Section Headings",
        "score": 25,
        "maxScore": 25,
        "status": "Pass",
        "feedback": "All standard headings (Experience, Education, Skills, Summary) present."
      },
      {
        "category": "Technical Skills Section",
        "score": 25,
        "maxScore": 25,
        "status": "Pass",
        "feedback": "Dedicated technical competencies section detected."
      },
      {
        "category": "Document Length & Density",
        "score": 10,
        "maxScore": 15,
        "status": "Needs Improvement",
        "feedback": "Resume is 420 words; recommended optimal range is 450-800 words."
      },
      {
        "category": "Formatting & Readability",
        "score": 15,
        "maxScore": 15,
        "status": "Pass",
        "feedback": "Clean bullet-point structure with no parsing artifacts."
      }
    ]
  }
  ```

---

### `POST /api/analyses/:id/suggestions`
Generates personalized, actionable improvement suggestions using Google Gemini AI across 6 core evaluation categories.

- **Authentication:** Bearer JWT required (Rate-limited: max 60 AI calls / 15 min)
- **Sample Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "AI resume improvement suggestions generated successfully.",
    "analysisId": 102,
    "summary": "Prioritize highlighting experience with Kubernetes and CI/CD, and quantify achievements in work experience bullets.",
    "suggestions": [
      {
        "category": "Resume summary",
        "issue": "Summary does not emphasize cloud backend architecture experience.",
        "recommendation": "Tailor summary to: 'Results-driven Full Stack Engineer with 4+ years architecting scalable Node.js microservices and cloud infrastructure.'",
        "priority": "High",
        "explanation": "Immediately signals seniority to hiring managers and automated recruiters."
      },
      {
        "category": "Skills",
        "issue": "Missing Kubernetes and Redis keywords required by the job posting.",
        "recommendation": "Feature container orchestration projects demonstrating hands-on Docker and Kubernetes cluster management.",
        "priority": "High",
        "explanation": "Directly improves ATS keyword match rate."
      },
      {
        "category": "Experience",
        "issue": "Impact metrics are missing from senior developer work history.",
        "recommendation": "Rephrase bullet: 'Architected Node.js API gateway [e.g. reduced p99 endpoint latency by ~35%].'",
        "priority": "High",
        "explanation": "Quantifiable results demonstrate tangible engineering value."
      }
    ]
  }
  ```

---

### `GET /api/analyses/dashboard/stats`
Retrieves aggregated statistics for the authenticated user's dashboard.

- **Authentication:** Bearer JWT required
- **Sample Response (200 OK):**
  ```json
  {
    "success": true,
    "totalAnalyses": 5,
    "averageMatchScore": 79,
    "averageAtsScore": 85,
    "analysesLast30Days": 4,
    "recentAnalysis": {
      "id": 102,
      "jobTitle": "Senior Full Stack Cloud Engineer",
      "resumeFilename": "resume_1741234567890_a8f9c1b2e3d4.pdf",
      "matchScore": 82,
      "atsScore": 88,
      "createdAt": "2026-10-15T21:12:00.000Z"
    }
  }
  ```

---

### `GET /api/analyses`
Lists all historical analysis records for the authenticated user with search and pagination.

- **Authentication:** Bearer JWT required
- **Query Parameters:**
  - `page` (Optional integer, default: `1`)
  - `limit` (Optional integer, default: `10`)
  - `search` (Optional string: filters by `job_title` or `resume_filename`)
  - `sortBy` (Optional string: `desc` or `asc`)
- **Sample Response (200 OK):**
  ```json
  {
    "success": true,
    "analyses": [
      {
        "id": 102,
        "jobTitle": "Senior Full Stack Cloud Engineer",
        "resumeFilename": "resume_1741234567890_a8f9c1b2e3d4.pdf",
        "matchScore": 82,
        "atsScore": 88,
        "createdAt": "2026-10-15T21:12:00.000Z"
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 10,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
  ```

---

### `GET /api/analyses/:id`
Retrieves the complete saved state of an analysis for page refresh hydration.

- **Authentication:** Bearer JWT required
- **URL Parameter:** `:id` (Analysis ID)
- **Sample Response (200 OK):**
  ```json
  {
    "success": true,
    "analysis": {
      "id": 102,
      "userId": 1,
      "jobTitle": "Senior Full Stack Cloud Engineer",
      "jobDescription": "We are seeking...",
      "resumeFilename": "resume_1741234567890_a8f9c1b2e3d4.pdf",
      "matchScore": 82,
      "atsScore": 88,
      "matchedSkills": ["JavaScript", "Node.js", "React", "Express", "MySQL", "Docker", "AWS"],
      "missingSkills": ["Kubernetes", "Redis", "CI/CD"],
      "additionalSkills": ["Tailwind CSS", "Git"],
      "atsBreakdown": [...],
      "improvementSuggestions": [...],
      "createdAt": "2026-10-15T21:12:00.000Z",
      "updatedAt": "2026-10-15T21:15:00.000Z"
    }
  }
  ```
- **Security Check:** If the analysis belongs to another user, returns `404 Not Found` to prevent account/ID enumeration.

---

### `GET /api/analyses/:id/report`
Generates and streams a publication-grade multi-page PDF summary report using PDFKit.

- **Authentication:** Bearer JWT required
- **URL Parameter:** `:id` (Analysis ID)
- **Response Headers:**
  - `Content-Type: application/pdf`
  - `Content-Disposition: attachment; filename="analysis-report-102.pdf"`
- **Response Body:** Binary PDF document stream.
