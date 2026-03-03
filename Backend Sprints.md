# Finalized Backend Sprint Plan (Production-Ready)
Project: Teacher Hiring & AI Evaluation System Architecture: Node.js + TypeScript + PostgreSQL Redis + Azure + OpenAI

🔵 Sprint 1 – Foundation & Application Engine
🎯 Goal Core backend setup + application submission + rule-based evaluation (Layer 1).
🛠 Scope

1️⃣ Infrastructure Setup
Initialize NestJS (preferred over Express for scale)
Setup Prisma ORM
Setup PostgreSQL schema: Candidate, Assessment
Setup Redis (even if not used yet)
Setup environment config management
Add global error handling & Enable CORS

2️⃣ Storage Integration
Integrate Google Drive API via Service Account
Create dedicated hiring folder
Restrict file types (PDF only) & Max file size validation

3️⃣ API Endpoints
POST /api/applications
Accept JSON + CV (multipart)
Validate fields & Check duplicate email + phone
Upload CV to Drive & Create Candidate record

4️⃣ Evaluation Engine – Layer 1 (Rule-Based)
Implement ApplicationEvaluatorService:
Hard rejection rules: No graduation, Missing CV, Experience below threshold, Shift mismatch (if required)

5️⃣ Status Management
Initial statuses: PENDING, REJECTED_FORM, APPROVED_LAYER1
Response Contract for Application:
Success: { message: "Application submitted", status: "APPLIED" }
Rejected: { status: "REJECTED_FORM", reason: "Shift mismatch" }

✅ Definition of Done:
Application submission works end-to-end. CV stored in Drive. Candidates auto rejected or approved (Layer 1)


🔵 Sprint 2 – Assessment Security & MCQ Engine
🎯 Goal Secure token-based assessment + MCQ evaluation.
�� Scope

1️⃣ Token-Based Security
For approved candidates: Generate UUID assessmentToken, Expiry = 72 hours, Single-use, Store in DB

2️⃣ API Endpoints
GET /api/assessment/:token
Validate token exists, check expiry, check not already used
Return: { duration: 1800, totalQuestions: 15, questions: [{ id, questionText, options }] }

POST /api/assessment/:token/submit
Accept: { mcqAnswers: [{ questionId, selectedOption }], timeTakenSeconds: number, tabSwitchWarnings: number, audioBlob: multipart file }
Return: { status: "ASSESSMENT_COMPLETED", message: "Assessment submitted successfully" }

3️⃣ Assessment Schema
Create Assessment table: candidateId (FK), mcqScore, timeTakenSeconds, tabSwitchWarnings, startedAt, completedAt

4️⃣ MCQ Engine
Fetch correct answers, Calculate score, Store score
Update candidate status → ASSESSMENT_SUBMITTED

✅ Definition of Done:
Token-secured assessment flow. MCQ scoring accurate. Anti-cheat signals stored. Status updated correctly.


🔵 Sprint 4 – Final Decision Engine & Automation
🎯 Goal Fully automated hiring decisions + email automation.
🛠 Scope

1️⃣ Final Evaluation Engine
Trigger after: MCQ stored + Audio score processed
Formula: finalScore = (applicationScore * 0.3) + (mcqScore * 0.4) + (audioScore * 0.3)

2️⃣ Status Mapping
≥ 75 → SELECTED
60–74 → MANUAL_REVIEW
< 60 → REJECTED_FINAL

3️⃣ NotificationService
Triggers: Form rejection, Assessment link email, Final decision email

4️⃣ Candidate APIs (Backend support for Dashboard)
GET /api/admin/candidates
GET /api/admin/candidates/:id


🔵 Sprint 5 – Admin Dashboard & Production Hardening
🎯 Goal Internal management + security polishing + production deployment.
🛠 Scope

1️⃣ Admin Authentication
POST /api/admin/login
JWT authentication, Role-based access

2️⃣ Candidate Management APIs
GET /api/admin/candidates
Filtering by: status, subject, score range, experience

3️⃣ Analytics Endpoint
GET /api/admin/analytics

4️⃣ Security Hardening
Helmet, express-rate-limit, Input validation middleware, Audit logs.
