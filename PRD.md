# Product Requirements Document (PRD)

## HNT — Automated Teacher Hiring & Onboarding Platform

**Version:** 1.0  
**Last Updated:** April 2026  
**Status:** Live  

---

## 1. Product Overview

HNT is an end-to-end hiring platform purpose-built for an EdTech company (BrightChamps-style) that recruits online teachers across multiple subject verticals. The platform automates the full candidate lifecycle — from application intake and AI-assisted screening through multi-stage assessments, quality review, and finally training onboarding — while giving administrators granular pipeline visibility and control.

### 1.1 Problem Statement

Hiring at scale for online teaching positions involves:

- High application volumes across multiple subjects (Coding, Math, English, Science, Robotics, Financial Literacy)
- Manual, error-prone screening of CVs and availability
- Coordination between hiring managers, quality reviewers, and candidates across multiple stages
- Inconsistent evaluation criteria across reviewers
- Lack of visibility into pipeline bottlenecks and candidate status

### 1.2 Solution

A unified platform that:

- Automates initial application screening with rules-based evaluation
- Delivers timed MCQ + audio assessments with anti-cheat tracking
- Provides a structured quality review rubric with configurable auto-pass/fail thresholds
- Sends automated email communications at every pipeline transition
- Offers a candidate-facing portal for self-service status tracking
- Gives administrators a single-pane dashboard to manage the entire pipeline

---

## 2. User Roles & Access

| Role | Auth Method | Capabilities |
|------|-------------|--------------|
| **Master Admin** | Email + password (env-configured) | Full platform access: candidate pipeline, team management, question bank, dashboard config, quality cutoff config |
| **Hiring Manager** | Email + password (bcrypt) | View/manage candidates assigned to them (filtered by subject), update statuses, schedule mock interviews, submit quality review links |
| **Quality Team** | Email + 4-digit PIN | Review assigned candidates, score rubrics (1–10), submit reviews; see Pending vs Completed split; no access to select/reject — system auto-decides |
| **Candidate** | Email + 4-digit PIN (generated at application) | View application status, take assessments, access candidate dashboard with timeline, mock interview prep, and training modules |

---

## 3. Candidate Pipeline & Status Flow

```
APPLIED
  │
  ├── REJECTED_FORM  (auto: failed availability/score check)
  │
  └── TESTING  (passed screening → assessment link emailed)
        │
        ├── REJECTED_FINAL  (MCQ score < 60%)
        │
        ├── AUDIO_PROCESSING  (MCQ ≥ 60%, audio submitted → background worker)
        │     │
        │     ├── AUDIO_FAILED  (worker error after retries)
        │     │
        │     └── MANUAL_REVIEW  (audio processed, combined score computed)
        │
        └── MANUAL_REVIEW  (direct path if no audio processing required)
              │
              ├── REJECTED_FINAL  (admin manual rejection)
              │
              └── SELECTED  (mock interview prep email sent)
                    │
                    ├── REJECTED_FINAL  (rejected at mock interview stage)
                    │
                    └── QUALITY_REVIEW_PENDING  (review link submitted, QT auto-assigned)
                          │
                          ├── REJECTED_FINAL  (scores below cutoff — auto)
                          │
                          └── SELECTED_FOR_TRAINING  (scores meet/exceed cutoffs — auto)
```

### 3.1 Rejection Stage Tracking

When a candidate reaches `REJECTED_FINAL`, the system tracks *where* in the pipeline the rejection occurred:

- **Manual Review** — rejected by hiring manager during assessment review
- **Mock Interview** — rejected during mock interview stage
- **Quality Review** — auto-rejected because rubric scores fell below configured cutoffs

---

## 4. Feature Breakdown

### 4.1 Public-Facing Pages

#### 4.1.1 Landing Page (`/`)

Marketing page presenting the teaching opportunity. Displays company stats (20+ countries, 4000+ teachers, ages 6–16), benefits (teach online, work from home, global students, flexible hours, competitive pay), and a prominent "Apply Now" CTA.

#### 4.1.2 Application Form (`/apply`)

Multi-step form collecting:

| Section | Fields |
|---------|--------|
| **Personal** | Full name, email, phone, city |
| **Education** | Highest education, subject vertical selection |
| **Experience** | Prior experience (Y/N), years, company name |
| **Employment** | Currently working (Y/N), full-time/part-time |
| **Availability** | Available 120 hrs/month, open to weekends, comfortable with night shifts |
| **Motivation** | Free-text "Why do you want to teach with us?" |
| **CV** | PDF upload (max 5 MB) |

**Validation:** Zod schema with conditional rules (experience details required if prior experience = yes).

**On Submit:** Multipart POST to backend → immediate rule-based screening.

#### 4.1.3 Assessment Page (`/assessment/:token`)

Token-based (no JWT required) timed assessment with:

- **MCQ Section:** 20 randomized questions from the subject's question bank, timed
- **Audio Section:** Subject-specific audio prompts; candidate records responses via browser mic
- **Anti-cheat:** Tab-switch and visibility-change tracking stored as JSON

**Submission Flow:** MCQ auto-scored → audio uploaded to S3 (or local) → background processing queued.

### 4.2 Candidate Portal

#### 4.2.1 Candidate Login (`/candidate-login`)

Email + 4-digit PIN authentication → JWT issued → redirect to dashboard.

#### 4.2.2 Candidate Dashboard (`/candidate-dashboard`)

A visual timeline showing the candidate's progress through:

1. **Application Submitted** — always completed post-apply
2. **MCQ Assessment** — link to start/resume assessment if status is TESTING
3. **Audio Assessment** — recording submission status
4. **Mock Interview** — preparation resource link (subject-specific Google Doc), scheduled date/time, meeting link
5. **Training** — dynamic training modules (configured per subject by admin)

Each step shows COMPLETED / IN_PROGRESS / PENDING with contextual CTAs. Training modules render as expandable cards with self-learning and live session types.

### 4.3 Admin Portal (`/admin`)

#### 4.3.1 Authentication

Staff login form supporting Master Admin, Hiring Manager, and Quality Team roles. Rate-limited (1000 req/15 min). JWT-based session.

#### 4.3.2 Home Dashboard

Module-selection grid (Master Admin sees all; HM/QT see subset):

- **Candidate Pipeline** — main candidate management
- **Question Bank** — MCQ and audio question management (Master Admin; password-protected)
- **Dashboard Config** — per-subject configuration (Master Admin)
- **Quality Cutoff Scores** — rubric pass thresholds (Master Admin; password-protected)
- **Team Management** — hiring managers and quality team CRUD (Master Admin)

#### 4.3.3 Candidate Pipeline

**Sidebar Navigation:**

- *Non-QT roles:* Subject filters with nested status breakdown and candidate counts
- *Quality Team:* "Pending Review" and "Completed" sections (completed candidates show "Review Completed" — no pass/reject badge visible to QT)

**Candidate Table:**

| Column | Details |
|--------|---------|
| Candidate | Name + email |
| Position | Subject vertical |
| Experience | Years |
| Status | Color-coded badge; REJECTED_FINAL shows rejection stage |
| Assigned To | Hiring manager name (Master Admin only) |
| Reminder | Reminder count + last sent date (for TESTING candidates) |
| Applied | Date |

**Candidate Detail Slide-over (non-QT roles):**

Tabbed view with:

- **Assessment Tab:** CV link, AI/application scores, MCQ score breakdown, audio recordings with subject-specific prompts, anti-cheat metrics, status update controls (Select/Reject with comment)
- **Mock Interview Tab:** Schedule meeting (date/time + link), quality review link submission, mock interview rejection with predefined reasons (Not able to connect / Not Interested / Other) and optional comment
- **Emails Tab:** Full email history for the candidate
- **Timeline Tab:** Chronological event log

**Candidate Detail (Quality Team):**

- Mock interview recording player (or "no recording" indicator)
- **Quality Assessment Rubric** — 4 parameters scored 1–10:
  - Subject Knowledge
  - Student Engagement
  - Energy & Confidence
  - Communication
- Review comment field
- Single **"Done"** CTA — backend auto-decides pass/reject based on cutoff scores
- Completed reviews are read-only

#### 4.3.4 Question Bank (Master Admin, password-protected)

**MCQ Bank:**

- CSV import (bulk)
- Per-category and per-subject querying
- "Clear All" with confirmation

**Audio Bank:**

- Per-subject audio prompt management
- Create/delete individual prompts
- Subject filter dropdown

#### 4.3.5 Dashboard Config (Master Admin)

Per-subject configuration:

| Setting | Purpose |
|---------|---------|
| Mock Interview Prep Link | Google Doc URL sent to candidates upon selection |
| Training Modules | Dynamic timeline blocks with heading, subheading, type (self-learning / live session), CTA link, and optional schedule date |

Training modules are fully CRUD-capable with drag-to-reorder-style editing (add, edit, remove nodes).

#### 4.3.6 Quality Cutoff Scores (Master Admin, password-protected)

Separate section with its own access password (`cutoff@2026`). Per-subject configuration of minimum pass scores (1–10) for each rubric parameter:

- Subject Knowledge
- Student Engagement
- Energy & Confidence
- Communication

Default cutoff: **5/10** per parameter when not configured. Candidate must meet or exceed **all four** cutoffs to be auto-selected.

#### 4.3.7 Team Management (Master Admin)

**Hiring Managers:**

- CRUD with fields: name, email, password, phone, subject, auto-assign toggle
- Auto-assign: round-robin based on `lastAssignedAt` timestamp

**Quality Team:**

- CRUD with fields: name, email, 4-digit PIN, subject, active status, auto-assign toggle
- Auto-assign: round-robin based on `lastAssignedAt` for the candidate's subject

---

## 5. Email System

### 5.1 Infrastructure

- **Provider:** SendGrid (`@sendgrid/mail`)
- **Branding:** All emails wrapped in a consistent HTML template via `wrapInTemplate()` with company logo, header gradient, and footer
- **Logging:** Every sent email persisted to `EmailLog` table with candidateId, subject, body, timestamp
- **Configuration:** `SMTP_FROM` (sender), `COMPANY_NAME` (branding), `SENDGRID_API_KEY`

### 5.2 Email Catalog

| Email | Trigger | Subject Line |
|-------|---------|--------------|
| **Form Rejection** | Application fails screening rules | Application Update — {Company} Teaching Position |
| **Assessment Link** | Application passes screening | {Company} — Complete Your Teaching Assessment |
| **Assessment Reminder** | 24 hours after assessment created (if still TESTING) | Reminder: Complete Your {Company} Teaching Assessment |
| **Mock Interview Prep** | Candidate status → SELECTED | {Company} — Mock Interview Preparation |
| **Selection (Training)** | Quality review passes cutoff | Congratulations — {Company} Teaching Position |
| **Rejection (Final)** | Quality review fails / manual reject / mock interview reject | Application Update — {Company} Teaching Position |
| **Mock Interview Invite** | Mock interview scheduled | Two emails: candidate invite + manager copy with candidate details |

---

## 6. Automated Decision Engine

### 6.1 Application Screening (Layer 1)

Rules-based evaluation at submission time:

| Rule | Outcome |
|------|---------|
| Not available 120 hrs/month | Instant reject (score 0) |
| Not open to weekends | Instant reject (score 0) |
| Score < 50/100 | Reject |
| Score ≥ 50 | Pass → create assessment |

**Scoring Model (0–100):**

- Base: 40 points
- Experience: +30 (5+ yrs), +20 (3-4 yrs), +10 (1-2 yrs)
- Night shift willingness: +10
- Motivation length: +10 (>150 chars), +5 (>50 chars)

### 6.2 Assessment Scoring (Layer 2)

- MCQ: percentage-based (correct / total × 100)
- Pass threshold: MCQ ≥ 60%
- Below 60%: auto-rejected with email
- At or above 60%: moves to audio processing / manual review

### 6.3 Quality Review Scoring (Layer 3)

- 4 rubric parameters, each scored 1–10 by Quality Team
- Auto-compared against per-subject cutoff scores (configured by Master Admin)
- **All 4** must meet or exceed cutoff → `SELECTED_FOR_TRAINING`
- **Any 1** below cutoff → `REJECTED_FINAL`

---

## 7. Background Processing

Built on **BullMQ** with **Redis**:

| Queue | Purpose | Trigger |
|-------|---------|---------|
| `application-ai-queue` | AI motivation scoring via Google Gemini | Post-application (when status is AI_SCORING) |
| `audio-processing-queue` | Audio assessment finalization, combined score computation | After assessment audio submission |
| `assessment-reminder-queue` | 24-hour reminder email to candidates who haven't started | Assessment creation (delayed job) |

Worker runs as a separate Nest process (`worker.ts`).

---

## 8. Technical Architecture

### 8.1 Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, React Router, React Query, React Hook Form + Zod |
| **Backend** | NestJS, TypeScript, Prisma ORM, Passport JWT |
| **Database** | PostgreSQL (Supabase-hosted, pooled connection) |
| **Cache/Queue** | Redis (Upstash) + BullMQ |
| **Email** | SendGrid |
| **Storage** | AWS S3 (CVs, audio) with local fallback |
| **AI** | Google Gemini (motivation scoring) |
| **Analytics** | Vercel Analytics |
| **Deployment** | Vercel (frontend), backend via PM2/direct Node |

### 8.2 Security

- **Helmet** for HTTP security headers
- **CORS** configured for cross-origin access
- **Rate limiting** (1000 req / 15 min per IP)
- **Global validation pipe** with whitelist and transform
- **JWT authentication** for staff and candidates (separate strategies)
- **Password hashing** via bcrypt (hiring managers)
- **PIN-based auth** for candidates and quality team
- **Role-based access control** enforced at controller level
- **Password-protected sections** for sensitive config (Question Bank, Quality Cutoffs)

### 8.3 Data Model (Key Entities)

| Entity | Purpose |
|--------|---------|
| `Candidate` | Core applicant record with status, scores, assignments, review data |
| `Assessment` | MCQ + audio assessment linked to candidate; tracks scores, anti-cheat, prompts/responses |
| `HiringManager` | Staff user for candidate management |
| `QualityTeam` | Staff user for quality review |
| `Question` | MCQ question with options, correct answer, category, subject, difficulty |
| `AudioQuestion` | Audio prompt text per subject |
| `SubjectDashboardConfig` | Per-subject settings: mock interview links, training modules, quality cutoff scores |
| `MockInterview` | Scheduled interview record with meeting link |
| `EmailLog` | Audit trail of all sent emails |
| `TimelineEvent` | Candidate journey event log |

---

## 9. Routes / URL Structure

| Route | Page | Access |
|-------|------|--------|
| `/` | Landing page | Public |
| `/apply` | Application form | Public |
| `/assessment/:token` | Timed assessment | Token-based (no auth) |
| `/admin` | Admin portal | Staff JWT |
| `/candidate-login` | Candidate login | Public |
| `/candidate-dashboard` | Candidate portal | Candidate JWT |

---

## 10. Configuration & Defaults

### 10.1 Mock Interview Prep Links (Hardcoded Defaults)

When no admin-configured link exists in the database, the system falls back to subject-specific Google Doc URLs:

| Subject | Default Doc |
|---------|-------------|
| Coding | Google Doc (1G4_OPbn...) |
| Math | Google Doc (1Y0JZKFW...) |
| Robotics | Google Doc (1WOEw3AI...) |
| English | Google Doc (1pUgI6pO...) |
| Financial Literacy | Google Doc (18XZUrVM...) |
| Science | Not configured |

Resolution priority: DB value → subject-specific default → global default → null.

### 10.2 Quality Cutoff Defaults

If no cutoff is configured for a subject, all 4 parameters default to **5/10**.

### 10.3 Training Module Defaults

8 pre-configured training nodes covering:
Welcome → Onboarding → Role & Growth → Payout Policy → Soft Skills (self + live) → Content Training → Product & Policy.

---

## 11. Subject Verticals

The platform supports multiple teaching subjects. Each vertical can have independent configuration for:

- Question banks (MCQ + audio)
- Mock interview prep materials
- Quality review cutoff scores
- Training module sequences
- Hiring manager and quality team assignments

**Currently supported:** Coding, Math, Science, English, Robotics, Financial Literacy.

---

## 12. Metrics & Observability

- **Email Logs:** Full audit trail of every email sent per candidate
- **Timeline Events:** Every status change, assignment, and action logged with timestamp
- **Assessment Anti-cheat:** Tab switches and visibility changes tracked per assessment session
- **Vercel Analytics:** Frontend usage tracking

---

## 13. Auto-Assignment Logic

Both Hiring Managers and Quality Team members are auto-assigned to candidates using **round-robin** based on `lastAssignedAt` timestamp, filtered by:

- Subject match (case-insensitive)
- Active status
- Auto-assign enabled

After assignment, the member's `lastAssignedAt` is updated to maintain fair distribution.
