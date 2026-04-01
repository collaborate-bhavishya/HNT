# Email Notifications Reference

All emails are sent via **SendGrid** from `notifications.service.ts`.
Sender: `SMTP_FROM` env var → `"BrightChamps Hiring Team" <hiring@brightchamps.store>`

---

## 1. Assessment Link Email

| Field | Value |
|---|---|
| **Trigger** | Candidate passes the initial form evaluation (Layer 1 score check) |
| **Where** | `applications.service.ts` → `submitApplication()` — when status = `TESTING` |
| **Recipient** | Candidate email |
| **Subject** | `You have been selected! Next step: Assessment` |
| **Body** | `Congratulations! Please complete your assessment using the link below: [link]` |

**Current HTML:**
```html
<p>Congratulations! Please complete your assessment using the link below:</p>
<br/>
<p><a href="{link}">{link}</a></p>
```

---

## 2. Form Rejection Email

| Field | Value |
|---|---|
| **Trigger 1** | Candidate fails the initial form evaluation (Layer 1 — availability, experience checks) |
| **Where** | `applications.service.ts` → `submitApplication()` — when status = `REJECTED_FORM` |
| **Trigger 2** | Candidate fails MCQ assessment (score < 60%) |
| **Where** | `assessment.service.ts` → `evaluateAssessment()` — when MCQ score < 60% |
| **Recipient** | Candidate email |
| **Subject** | `Update on your Teaching Application` |
| **Body** | `Thank you for applying. Unfortunately, we are not moving forward with your application at this time.` |

**Current HTML:**
```html
<p>Thank you for applying.</p>
<p>Unfortunately, we are not moving forward with your application at this time.</p>
```

---

## 3a. Selection Email (SELECTED)

| Field | Value |
|---|---|
| **Trigger** | Admin changes candidate status to `SELECTED` |
| **Where** | `applications.service.ts` → `updateCandidateStatus()` |
| **Recipient** | Candidate email |
| **Subject** | `Congratulations! Welcome to {Company}` |
| **Body** | "Congratulations! 🎉 Your profile has been selected for the next round. Please wait for the next steps — our team will connect with you shortly with further details." |

## 3b. Training Selection Email (SELECTED_FOR_TRAINING)

| Field | Value |
|---|---|
| **Trigger 1** | Quality Team **passes** the candidate after mock interview / quality review |
| **Where** | `applications.service.ts` → `finalizeQualityReview()` — when decision = `SELECTED_FOR_TRAINING` |
| **Trigger 2** | Admin sets candidate status to `SELECTED_FOR_TRAINING` |
| **Where** | `applications.service.ts` → `updateCandidateStatus()` |
| **Recipient** | Candidate email |
| **Subject** | `Congratulations! Next step: Training — {Company}` |
| **Body (HTML)** | Same congratulatory template as §3a, plus a paragraph that the candidate is moving forward into the **training** phase and that onboarding/next steps will follow. |
| **Body (text)** | "Congratulations! Your profile has been selected for our training phase. Our team will connect with you shortly with further details." |

**Implementation:** `notifications.service.ts` → `sendFinalDecisionEmail()` (positive branch when `status === 'SELECTED_FOR_TRAINING'`).

## 3c. Final Rejection Email (REJECTED_FINAL)

| Field | Value |
|---|---|
| **Trigger 1** | Quality Team **rejects** the candidate after quality review |
| **Where** | `applications.service.ts` → `finalizeQualityReview()` — when decision = `REJECTED_FINAL` |
| **Trigger 2** | Admin changes candidate status to `REJECTED_FINAL` |
| **Where** | `applications.service.ts` → `updateCandidateStatus()` |
| **Recipient** | Candidate email |
| **Subject** | `Application Update — {Company} Teaching Position` |
| **Body** | "Thank you for taking the time and effort to apply. We truly appreciate your interest. Unfortunately, we will not be moving forward with your application at this time. We wish you the very best in your future endeavors." |

**Implementation:** `notifications.service.ts` → `sendFinalDecisionEmail()` (rejection branch).

---

## Flow Summary

```
Candidate Applies
    │
    ├─ Form PASSES  ──→  📧 Email #1: Assessment Link
    │                         │
    │                         ├─ MCQ ≥ 60%  ──→  Audio Processing → Manual Review → … → Mock interview / Quality review
    │                         │                                                    │
    │                         │                        ├─ Admin SELECTED      ──→  📧 §3a (SELECTED)
    │                         │                        ├─ QT pass (training)  ──→  📧 §3b (SELECTED_FOR_TRAINING)
    │                         │                        └─ QT or admin reject   ──→  📧 §3c (REJECTED_FINAL)
    │                         │
    │                         └─ MCQ < 60%  ──→  📧 Email #2: Rejection
    │
    └─ Form FAILS   ──→  📧 Email #2: Rejection
```

(Middle pipeline stages between manual review and quality review are abbreviated; the important part is which statuses trigger §3a / §3b / §3c via `sendFinalDecisionEmail`.)

---

## What Needs Improvement

- **Email #2** is used for both form rejection AND MCQ failure — consider different messaging for each case
- ~~**Final decision emails** showed wrong template for `SELECTED_FOR_TRAINING` (rejection copy)~~ — FIXED: §3b training congratulations + §3c rejection, via `sendFinalDecisionEmail()`
- All emails are plain/minimal — no branding, logo, or professional template
- No email sent when candidate enters `MANUAL_REVIEW` or `AUDIO_PROCESSING` (no status update to candidate)
- Consider adding a "We're reviewing your application" email after assessment submission
