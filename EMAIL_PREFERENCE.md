# Email catalog (system configuration)

This document lists **every transactional email** implemented in the backend. For hiring-flow context and diagrams, see [EMAIL_REFERENCE.md](./EMAIL_REFERENCE.md).

| Item | Value |
|------|--------|
| **Transport** | SendGrid (`@sendgrid/mail`) |
| **Implementation** | `backend/src/notifications/notifications.service.ts` |
| **Send gate** | `SENDGRID_API_KEY` must be set; otherwise sends are skipped (logged as warning) |
| **From** | `getFrom()` parses `SMTP_FROM`. If format is `"Display Name" <email@domain>`, both are used; else email from env with display name `{COMPANY_NAME} Hiring Team`. Default raw from: `hiring@brightchamps.store`. |
| **Company name** | `COMPANY_NAME` env, default `BrightChamps` (used in subjects, bodies, header) |
| **Branded wrapper** | Most HTML bodies are passed through `wrapInTemplate()` (indigo header, white content, gray footer). |
| **Logging** | Successful sends create an `EmailLog` row when `candidateId` is non-empty. The **hiring-manager copy** of the mock interview invite uses an empty `candidateId`, so it is **not** stored in `EmailLog`. |

---

## Quick index

| # | Method | Primary recipient | Subject line (pattern) |
|---|--------|-------------------|-------------------------|
| 1 | `sendFormRejectionEmail` | Candidate | `Application Update — {Company} Teaching Position` |
| 2 | `sendAssessmentLinkEmail` | Candidate | `You're Shortlisted! Complete Your Assessment — {Company}` |
| 3 | `sendAssessmentReminderEmail` | Candidate | `Reminder: Complete Your Assessment — {Company}` |
| 4 | `sendMockInterviewPrepEmail` | Candidate | `Next Steps: Prepare for your Mock Interview — {Company}` |
| 5 | `sendFinalDecisionEmail` | Candidate | See §5 (varies by status) |
| 6 | `sendMockInterviewInvite` | Candidate + manager | See §6 (two separate sends) |

`{Company}` = `COMPANY_NAME` or default `BrightChamps`.

---

## 1. Form / pipeline rejection — `sendFormRejectionEmail`

| Field | Detail |
|-------|--------|
| **Recipients** | Candidate |
| **Subject** | `Application Update — {Company} Teaching Position` |
| **Triggers** | (a) `applications.service.ts` → `submitApplication()` when status is `REJECTED_FORM`. (b) `assessment.service.ts` → `evaluateAssessment()` when MCQ score &lt; 60% (candidate set to `REJECTED_FINAL` and this email sent). |
| **Plain text** | Short rejection: thanks, unable to move forward, apply again, best wishes — `{Company} Hiring Team`. |
| **HTML** | “Dear Applicant,” multi-paragraph rejection; signed `{Company} Hiring Team`. Wrapped in template. |

---

## 2. Assessment link (shortlist) — `sendAssessmentLinkEmail`

| Field | Detail |
|-------|--------|
| **Recipients** | Candidate |
| **Subject** | `You're Shortlisted! Complete Your Assessment — {Company}` |
| **Trigger** | `applications.service.ts` → `submitApplication()` when candidate moves to `TESTING` (passes form screening). |
| **Dynamic** | Assessment URL built from `FRONTEND_URL` + `/assessment/{token}`. Optional **PIN block** if `pin` is passed: login link is hardcoded to `https://www.brightchamps.store/candidate-login`, plus email and PIN. |
| **Plain text** | Shortlisted + link + 72h expiry + optional dashboard/PIN line + “Good luck”. |
| **HTML** | “Technical Assessment” explainer (MCQ, audio, ~20 min), CTA button “Start Assessment”, expiry note. Wrapped in template. |

---

## 3. Assessment reminder — `sendAssessmentReminderEmail`

| Field | Detail |
|-------|--------|
| **Recipients** | Candidate |
| **Subject** | `Reminder: Complete Your Assessment — {Company}` |
| **Triggers** | (a) `applications.service.ts` → `sendAssessmentReminder()` (manual from admin). (b) `reminder.worker.ts` → auto job on `assessment-reminder-queue` (only if still `TESTING`, assessment not completed). |
| **Plain text** | Reminder + assessment link. |
| **HTML** | Friendly reminder, amber “expiring soon” callout, “Complete Assessment” CTA. Wrapped in template. |

---

## 4. Mock interview prep — `sendMockInterviewPrepEmail`

| Field | Detail |
|-------|--------|
| **Recipients** | Candidate |
| **Subject** | `Next Steps: Prepare for your Mock Interview — {Company}` |
| **Trigger** | `applications.service.ts` → `updateCandidateStatus()` when new status is `SELECTED`. Optional `prepText` / `prepLink` come from `SubjectDashboardConfig` for the candidate’s `position` (`mockInterviewPrepText`, `mockInterviewPrepLink`). |
| **Plain text** | Congratulations, mock interview phase; appends raw `prepText` and `prepLink` if present. |
| **HTML** | “Dear Applicant,” green congratulations banner, mock interview next steps, optional prep paragraphs (newlines → `<br>`), optional prep CTA button, sign-off. Wrapped in template. |

---

## 5. Final decision — `sendFinalDecisionEmail`

Single method; **subject and body depend on `status`**.

### 5a. `SELECTED` (implemented, not used by current API)

| Field | Detail |
|-------|--------|
| **Subject** | `Congratulations! Welcome to {Company}` |
| **Plain text** | Congratulations, selected for next round, team will connect — `{Company} Hiring Team`. |
| **HTML** | Green “Congratulations! 🎉” banner; selected for next round; wait for next steps; warm regards. Wrapped in template. |

**Call sites today:** `applications.service.ts` never passes `SELECTED` into `sendFinalDecisionEmail`. When an admin sets status to `SELECTED`, the app sends **#4 Mock interview prep** instead. The `SELECTED` branch remains in code for parity / future use.

### 5b. `SELECTED_FOR_TRAINING`

| Field | Detail |
|-------|--------|
| **Subject** | `Congratulations! Next step: Training — {Company}` |
| **Triggers** | `finalizeQualityReview()` when decision is training pass; or `updateCandidateStatus(..., 'SELECTED_FOR_TRAINING')`. |
| **Plain text** | Training phase selected; team will connect — `{Company} Hiring Team`. |
| **HTML** | Same as 5a plus extra paragraph: moving forward into **training**, onboarding/next steps shortly. Wrapped in template. |

### 5c. Rejection branch (`REJECTED_FINAL` or any non-positive status)

| Field | Detail |
|-------|--------|
| **Subject** | `Application Update — {Company} Teaching Position` |
| **Triggers** | `finalizeQualityReview()` reject; `updateCandidateStatus(..., 'REJECTED_FINAL')`. |
| **Plain text** | Thanks; not moving forward; best wishes — `{Company} Hiring Team`. |
| **HTML** | Three short paragraphs (thanks, not moving forward, best wishes); “Kind regards,” `{Company} Hiring Team`. Wrapped in template. |

---

## 6. Mock interview scheduled — `sendMockInterviewInvite`

Two separate emails per scheduling action (same ICS attachment on both).

### 6a. Candidate

| Field | Detail |
|-------|--------|
| **Recipients** | Candidate email |
| **Subject** | `Invitation: Mock Interview with {Company}` |
| **Trigger** | `applications.service.ts` → `scheduleMockInterview()` when `meetingLink` is set and a manager email exists (`hiringManager` or `qualityTeam` on the candidate). |
| **Attachment** | `invite.ics` (1-hour event, summary “Mock Interview - {candidateName}”, location = meeting link). |
| **Plain text** | Scheduled time (locale string) + join link. |
| **HTML** | “Dear {candidateName},” details box: date/time, interviewer name, meeting link. Wrapped in template. |
| **EmailLog** | Yes (`candidateId` passed). |

### 6b. Interviewer (hiring manager or quality team)

| Field | Detail |
|-------|--------|
| **Recipients** | `managerEmail` |
| **Subject** | `Scheduled Mock Interview: {candidateName}` |
| **Plain text** | Same time + link + candidate context. |
| **HTML** | “Dear {managerName},” amber details box: date/time, candidate email, link. Sign-off **“System Notification”** (not `{Company} Hiring Team`). Wrapped in template. |
| **EmailLog** | No (`sendMail` called with empty `candidateId`). |

---

## Environment variables (email-related)

| Variable | Role |
|----------|------|
| `SENDGRID_API_KEY` | Required to actually send |
| `SMTP_FROM` | From address / optional `"Name" <email>` |
| `COMPANY_NAME` | Brand string in template header and copy |
| `FRONTEND_URL` | Assessment and reminder links (default `http://localhost:5173`) |

---

## Summary count

- **Distinct email “types”** (by copy + subject): **9** (1, 2, 3, 4, 5a, 5b, 5c, 6a, 6b).
- **Public service methods** on `NotificationsService`: **6** (items 1–6 above; #5 covers 5a–5c).
