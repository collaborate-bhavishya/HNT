/**
 * One-off / dev: send a sample "Mock Interview Prep (Coding)" email via SendGrid.
 * Usage: node scripts/send-test-mock-prep-email.cjs [recipient@email.com]
 * Requires backend/.env with SENDGRID_API_KEY (and optional SMTP_FROM, COMPANY_NAME).
 */
const fs = require('fs');
const path = require('path');
const sgMail = require('@sendgrid/mail');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  for (const line of content.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (process.env[k] === undefined) process.env[k] = v;
  }
}

loadEnvFile(path.join(__dirname, '..', '.env'));

const companyName = process.env.COMPANY_NAME || 'BrightChamps';
const rawFrom = process.env.SMTP_FROM || 'hiring@brightchamps.store';

function getFrom() {
  const match = rawFrom.match(/"?([^"<]*)"?\s*<([^>]+)>/);
  if (match) {
    return { name: match[1].trim(), email: match[2].trim() };
  }
  return { email: rawFrom.trim(), name: `${companyName} Hiring Team` };
}

function wrapInTemplate(body) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;padding:40px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
        <tr><td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px 40px;text-align:center">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px">${companyName}</h1>
          <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:13px">Teacher Hiring Team</p>
        </td></tr>
        <tr><td style="padding:36px 40px 40px">${body}</td></tr>
        <tr><td style="background-color:#f9fafb;padding:24px 40px;border-top:1px solid #e5e7eb;text-align:center">
          <p style="margin:0;color:#9ca3af;font-size:12px">This is an automated message from ${companyName} Hiring Team.<br>Please do not reply directly to this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function main() {
  const to = process.argv[2] || 'collaborate.bhavishya@gmail.com';
  if (!process.env.SENDGRID_API_KEY) {
    console.error('Missing SENDGRID_API_KEY in backend/.env — cannot send.');
    process.exit(1);
  }

  const prepText =
    '[TEST — Coding] Sample prep text as configured per subject in Dashboard Settings.\n\nReview variables, loops, and how you would explain one concept to a 10-year-old.';
  const prepLink = 'https://example.com/coding-mock-interview-prep';

  const bodyContent = `<p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6">${prepText.replace(/\n/g, '<br>')}</p>`;
  const linkContent = `<div style="text-align:center;margin:28px 0"><a href="${prepLink}" target="_blank" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#ffffff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;letter-spacing:0.3px">Mock Interview Preparation Materials</a></div>`;

  const body = `
          <p style="margin:0 0 12px;color:#b45309;font-size:13px;font-weight:600">⚠️ Manual test email — not tied to a candidate record.</p>
          <p style="margin:0 0 16px;color:#111827;font-size:15px;line-height:1.6">Dear Applicant,</p>
          <div style="margin:0 0 24px;padding:24px;background-color:#ecfdf5;border-radius:8px;border-left:4px solid #10b981;text-align:center">
            <p style="margin:0;color:#065f46;font-size:20px;font-weight:700">Congratulations! 🎉</p>
          </div>
          <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.7">Your excellent performance on the technical assessment has moved you forward to the next stage: the <strong>Mock Interview</strong>.</p>
          <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.7">Our hiring team will reach out to you shortly to schedule your mock interview. In the meantime, please take some time to prepare.</p>
          ${bodyContent}
          ${linkContent}
          <p style="margin:24px 0 0;color:#111827;font-size:15px;line-height:1.6">We look forward to speaking with you!<br><strong>${companyName} Hiring Team</strong></p>`;

  const html = wrapInTemplate(body);
  const from = getFrom();

  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  await sgMail.send({
    from,
    to,
    subject: `[TEST — Coding] Mock Interview Prep — ${companyName}`,
    text: `TEST EMAIL (Coding mock prep sample). Congratulations! You have been selected for the Mock Interview phase. ${prepText.replace(/\n/g, ' ')} ${prepLink}`,
    html,
  });

  console.log(`Sent test mock-prep (Coding) email to ${to}`);
}

main().catch((err) => {
  console.error(err?.response?.body || err?.message || err);
  process.exit(1);
});
