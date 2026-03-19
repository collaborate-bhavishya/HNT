import { Injectable, Logger } from '@nestjs/common';
const sgMail = require('@sendgrid/mail');

@Injectable()
export class NotificationsService {
    private readonly logger = new Logger(NotificationsService.name);
    private readonly companyName = process.env.COMPANY_NAME || 'BrightChamps';

    constructor() {
        if (process.env.SENDGRID_API_KEY) {
            sgMail.setApiKey(process.env.SENDGRID_API_KEY);
            this.logger.log('SendGrid API Key successfully initialized');
        } else {
            this.logger.warn('No SENDGRID_API_KEY found in ENV, emails will not be sent');
        }
    }

    private getFrom(): { email: string; name: string } {
        const raw = process.env.SMTP_FROM || 'hiring@brightchamps.store';
        const match = raw.match(/"?([^"<]*)"?\s*<([^>]+)>/);
        if (match) {
            return { name: match[1].trim(), email: match[2].trim() };
        }
        return { email: raw.trim(), name: `${this.companyName} Hiring Team` };
    }

    private wrapInTemplate(body: string): string {
        return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;padding:40px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
        <tr><td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px 40px;text-align:center">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px">${this.companyName}</h1>
          <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:13px">Teacher Hiring Team</p>
        </td></tr>
        <tr><td style="padding:36px 40px 40px">${body}</td></tr>
        <tr><td style="background-color:#f9fafb;padding:24px 40px;border-top:1px solid #e5e7eb;text-align:center">
          <p style="margin:0;color:#9ca3af;font-size:12px">This is an automated message from ${this.companyName} Hiring Team.<br>Please do not reply directly to this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
    }

    private async sendMail(options: any) {
        if (!process.env.SENDGRID_API_KEY) {
            this.logger.warn(`Transporter not initialized with SendGrid Key. Cannot send email to ${options.to}`);
            return;
        }

        try {
            this.logger.log(`Attempting to send email: ${options.subject} -> ${options.to} from ${JSON.stringify(options.from)}`);
            await sgMail.send(options);
            this.logger.log(`Email Sent via SendGrid: ${options.subject} -> ${options.to}`);
        } catch (error: any) {
            this.logger.error(`Failed to send email to ${options.to}`, error?.message || error);
            if (error.response) {
                this.logger.error(`SendGrid response body: ${JSON.stringify(error.response.body)}`);
            }
        }
    }

    async sendFormRejectionEmail(email: string) {
        const body = `
          <p style="margin:0 0 16px;color:#111827;font-size:15px;line-height:1.6">Dear Applicant,</p>
          <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6">Thank you for taking the time to apply for a teaching position with <strong>${this.companyName}</strong>. We appreciate your interest in joining our team.</p>
          <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6">After carefully reviewing your application, we regret to inform you that we are unable to move forward with your candidacy at this time. This decision does not reflect on your abilities — our selection criteria are specific to our current requirements.</p>
          <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6">We encourage you to apply again in the future as new opportunities become available.</p>
          <p style="margin:0;color:#374151;font-size:15px;line-height:1.6">We wish you all the best in your career ahead.</p>
          <p style="margin:24px 0 0;color:#111827;font-size:15px;line-height:1.6">Warm regards,<br><strong>${this.companyName} Hiring Team</strong></p>`;

        await this.sendMail({
            from: this.getFrom(),
            to: email,
            subject: `Application Update — ${this.companyName} Teaching Position`,
            text: `Dear Applicant, Thank you for applying to ${this.companyName}. After careful review, we are unable to move forward with your application at this time. We encourage you to apply again in the future. Best wishes, ${this.companyName} Hiring Team`,
            html: this.wrapInTemplate(body),
        });
    }

    async sendAssessmentLinkEmail(email: string, link: string, pin?: string) {
        const body = `
          <p style="margin:0 0 16px;color:#111827;font-size:15px;line-height:1.6">Dear Applicant,</p>
          <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6">Great news! Your application has been shortlisted, and we'd like to invite you to the next stage of our hiring process — a <strong>Technical Assessment</strong>.</p>
          <div style="margin:24px 0;padding:20px;background-color:#f0f4ff;border-radius:8px;border-left:4px solid #4f46e5">
            <p style="margin:0 0 8px;color:#374151;font-size:14px;font-weight:600">What to expect:</p>
            <ul style="margin:0;padding:0 0 0 18px;color:#374151;font-size:14px;line-height:1.8">
              <li>Multiple-choice questions on your chosen subject</li>
              <li>A short audio recording to evaluate your communication skills</li>
              <li>Total duration: approximately 20 minutes</li>
            </ul>
          </div>
          ${pin ? `
          <div style="margin:24px 0;padding:20px;background-color:#fef3c7;border-radius:8px;border-left:4px solid #f59e0b">
            <p style="margin:0 0 8px;color:#92400e;font-size:14px;font-weight:600">Candidate Dashboard Access:</p>
            <p style="margin:0;color:#92400e;font-size:14px;line-height:1.6">You can check your progress at any time using our Candidate Dashboard.</p>
             <ul style="margin:8px 0 0;padding:0 0 0 18px;color:#92400e;font-size:14px;line-height:1.8">
               <li><strong>Login Link:</strong> <a href="https://www.brightchamps.store/candidate-login" style="color:#92400e;text-decoration:underline">https://www.brightchamps.store/candidate-login</a></li>
               <li><strong>Email:</strong> ${email}</li>
               <li><strong>Login PIN:</strong> ${pin}</li>
             </ul>
          </div>` : ''}
          <div style="text-align:center;margin:28px 0">
            <a href="${link}" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#ffffff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;letter-spacing:0.3px">Start Assessment</a>
          </div>
          <p style="margin:0 0 16px;color:#6b7280;font-size:13px;line-height:1.6;text-align:center">This link will expire in 72 hours. Please complete the assessment in one sitting.</p>
          <p style="margin:0;color:#374151;font-size:15px;line-height:1.6">If you have any questions, feel free to reach out to us.</p>
          <p style="margin:24px 0 0;color:#111827;font-size:15px;line-height:1.6">Good luck!<br><strong>${this.companyName} Hiring Team</strong></p>`;

        await this.sendMail({
            from: this.getFrom(),
            to: email,
            subject: `You're Shortlisted! Complete Your Assessment — ${this.companyName}`,
            text: `Congratulations! Your application has been shortlisted. Please complete your technical assessment using this link: ${link}. The link expires in 72 hours. ${pin ? `Your Dashboard Login: https://www.brightchamps.store/candidate-login | Email: ${email} | PIN: ${pin}. ` : ''}Good luck! — ${this.companyName} Hiring Team`,
            html: this.wrapInTemplate(body),
        });
    }

    async sendAssessmentReminderEmail(email: string, link: string) {
        const body = `
          <p style="margin:0 0 16px;color:#111827;font-size:15px;line-height:1.6">Dear Applicant,</p>
          <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6">This is a friendly reminder that your <strong>Technical Assessment</strong> for ${this.companyName} is still pending.</p>
          <div style="margin:24px 0;padding:20px;background-color:#fef3c7;border-radius:8px;border-left:4px solid #f59e0b">
            <p style="margin:0;color:#92400e;font-size:14px;font-weight:600">⏰ Your assessment link will expire soon. Please complete it at your earliest convenience.</p>
          </div>
          <div style="text-align:center;margin:28px 0">
            <a href="${link}" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#ffffff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;letter-spacing:0.3px">Complete Assessment</a>
          </div>
          <p style="margin:0;color:#374151;font-size:15px;line-height:1.6">If you have any questions or face any issues, feel free to reach out to us.</p>
          <p style="margin:24px 0 0;color:#111827;font-size:15px;line-height:1.6">Best regards,<br><strong>${this.companyName} Hiring Team</strong></p>`;

        await this.sendMail({
            from: this.getFrom(),
            to: email,
            subject: `Reminder: Complete Your Assessment — ${this.companyName}`,
            text: `Reminder: Your technical assessment for ${this.companyName} is still pending. Please complete it using this link: ${link}. — ${this.companyName} Hiring Team`,
            html: this.wrapInTemplate(body),
        });
    }

    async sendFinalDecisionEmail(email: string, status: string) {
        if (status === 'SELECTED') {
            const body = `
              <div style="margin:0 0 24px;padding:24px;background-color:#ecfdf5;border-radius:8px;border-left:4px solid #10b981;text-align:center">
                <p style="margin:0;color:#065f46;font-size:20px;font-weight:700">Congratulations! 🎉</p>
              </div>
              <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.7">Your profile has been selected for the next round.</p>
              <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.7">Please wait for the next steps — our team will connect with you shortly with further details.</p>
              <p style="margin:24px 0 0;color:#111827;font-size:15px;line-height:1.6">Warm regards,<br><strong>${this.companyName} Hiring Team</strong></p>`;

            await this.sendMail({
                from: this.getFrom(),
                to: email,
                subject: `Congratulations! Welcome to ${this.companyName}`,
                text: `Congratulations! 🎉 Your profile has been selected for the next round. Please wait for the next steps — our team will connect with you shortly with further details. — ${this.companyName} Hiring Team`,
                html: this.wrapInTemplate(body),
            });
        } else {
            const body = `
              <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.7">Thank you for taking the time and effort to apply. We truly appreciate your interest.</p>
              <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.7">Unfortunately, we will not be moving forward with your application at this time.</p>
              <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.7">We wish you the very best in your future endeavors.</p>
              <p style="margin:24px 0 0;color:#111827;font-size:15px;line-height:1.6">Kind regards,<br><strong>${this.companyName} Hiring Team</strong></p>`;

            await this.sendMail({
                from: this.getFrom(),
                to: email,
                subject: `Application Update — ${this.companyName} Teaching Position`,
                text: `Thank you for taking the time and effort to apply. We truly appreciate your interest. Unfortunately, we will not be moving forward with your application at this time. We wish you the very best in your future endeavors. — ${this.companyName} Hiring Team`,
                html: this.wrapInTemplate(body),
            });
        }
    }
}
