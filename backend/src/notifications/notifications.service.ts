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
        const raw = process.env.SMTP_FROM || 'support@pollyolly.com';
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

    async sendAssessmentLinkEmail(email: string, link: string) {
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
            text: `Congratulations! Your application has been shortlisted. Please complete your technical assessment using this link: ${link}. The link expires in 72 hours. Good luck! — ${this.companyName} Hiring Team`,
            html: this.wrapInTemplate(body),
        });
    }

    async sendFinalDecisionEmail(email: string, status: string) {
        if (status === 'SELECTED') {
            const body = `
              <p style="margin:0 0 16px;color:#111827;font-size:15px;line-height:1.6">Dear Applicant,</p>
              <div style="margin:0 0 20px;padding:20px;background-color:#ecfdf5;border-radius:8px;border-left:4px solid #10b981;text-align:center">
                <p style="margin:0;color:#065f46;font-size:18px;font-weight:700">🎉 Congratulations — You've been selected!</p>
              </div>
              <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6">We are delighted to inform you that after a thorough evaluation of your application and assessment, you have been <strong>selected to join our teaching team</strong> at ${this.companyName}.</p>
              <div style="margin:24px 0;padding:20px;background-color:#f9fafb;border-radius:8px;border:1px solid #e5e7eb">
                <p style="margin:0 0 8px;color:#374151;font-size:14px;font-weight:600">What happens next:</p>
                <ul style="margin:0;padding:0 0 0 18px;color:#374151;font-size:14px;line-height:1.8">
                  <li>A member of our team will reach out to you within 2–3 business days</li>
                  <li>You'll receive details about onboarding, training schedule, and next steps</li>
                  <li>Please keep an eye on your email and phone for our communication</li>
                </ul>
              </div>
              <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6">We were truly impressed by your profile and look forward to having you on board. Welcome to the team!</p>
              <p style="margin:24px 0 0;color:#111827;font-size:15px;line-height:1.6">Warm regards,<br><strong>${this.companyName} Hiring Team</strong></p>`;

            await this.sendMail({
                from: this.getFrom(),
                to: email,
                subject: `Congratulations! Welcome to ${this.companyName}`,
                text: `Congratulations! You have been selected to join the ${this.companyName} teaching team. A member of our team will reach out within 2–3 business days with onboarding details. Welcome aboard! — ${this.companyName} Hiring Team`,
                html: this.wrapInTemplate(body),
            });
        } else {
            const body = `
              <p style="margin:0 0 16px;color:#111827;font-size:15px;line-height:1.6">Dear Applicant,</p>
              <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6">Thank you for your time and effort throughout the application and assessment process at <strong>${this.companyName}</strong>. We sincerely appreciate the dedication you showed.</p>
              <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6">After a thorough review, we regret to inform you that we will not be moving forward with your application at this time. Please know that this was a competitive process and this decision does not diminish the value of your skills and experience.</p>
              <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6">We would love to stay connected and encourage you to apply again as new roles open up in the future.</p>
              <p style="margin:0;color:#374151;font-size:15px;line-height:1.6">We wish you continued success in all your professional endeavours.</p>
              <p style="margin:24px 0 0;color:#111827;font-size:15px;line-height:1.6">Kind regards,<br><strong>${this.companyName} Hiring Team</strong></p>`;

            await this.sendMail({
                from: this.getFrom(),
                to: email,
                subject: `Application Update — ${this.companyName} Teaching Position`,
                text: `Dear Applicant, Thank you for your effort throughout the application process at ${this.companyName}. After thorough review, we will not be moving forward at this time. We encourage you to apply again in the future. Kind regards, ${this.companyName} Hiring Team`,
                html: this.wrapInTemplate(body),
            });
        }
    }
}
