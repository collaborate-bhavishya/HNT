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

## 3b. Final Rejection Email (REJECTED_FINAL)

| Field | Value |
|---|---|
| **Trigger** | Admin changes candidate status to `REJECTED_FINAL` |
| **Where** | `applications.service.ts` → `updateCandidateStatus()` |
| **Recipient** | Candidate email |
| **Subject** | `Update on your Teaching Application` |
| **Body** | "Thank you for taking the time and effort to apply. We truly appreciate your interest. Unfortunately, we will not be moving forward with your application at this time. We wish you the very best in your future endeavors." |

---

## Flow Summary

```
Candidate Applies
    │
    ├─ Form PASSES  ──→  📧 Email #1: Assessment Link
    │                         │
    │                         ├─ MCQ ≥ 60%  ──→  Audio Processing → Manual Review
    │                         │                        │
    │                         │                        ├─ Admin selects  ──→  📧 Email #3 (SELECTED)
    │                         │                        └─ Admin rejects  ──→  📧 Email #3 (REJECTED_FINAL)
    │                         │
    │                         └─ MCQ < 60%  ──→  📧 Email #2: Rejection
    │
    └─ Form FAILS   ──→  📧 Email #2: Rejection
```

---

## What Needs Improvement

- **Email #2** is used for both form rejection AND MCQ failure — consider different messaging for each case
- ~~**Email #3** subject line shows raw status like `SELECTED` / `REJECTED_FINAL`~~ — FIXED: separate emails with proper messaging
- All emails are plain/minimal — no branding, logo, or professional template
- No email sent when candidate enters `MANUAL_REVIEW` or `AUDIO_PROCESSING` (no status update to candidate)
- Consider adding a "We're reviewing your application" email after assessment submission
