import { Injectable, Logger } from '@nestjs/common';
const sgMail = require('@sendgrid/mail');

@Injectable()
export class NotificationsService {
    private readonly logger = new Logger(NotificationsService.name);

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
        // Parse "Display Name" <email@example.com> format
        const match = raw.match(/"?([^"<]*)"?\s*<([^>]+)>/);
        if (match) {
            return { name: match[1].trim(), email: match[2].trim() };
        }
        return { email: raw.trim(), name: 'Hiring Team' };
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
        await this.sendMail({
            from: this.getFrom(),
            to: email,
            subject: 'Update on your Teaching Application',
            text: 'Thank you for applying. Unfortunately, we are not moving forward with your application at this time.',
            html: '<p>Thank you for applying.</p><p>Unfortunately, we are not moving forward with your application at this time.</p>'
        });
    }

    async sendAssessmentLinkEmail(email: string, link: string) {
        await this.sendMail({
            from: this.getFrom(),
            to: email,
            subject: 'You have been selected! Next step: Assessment',
            text: `Congratulations! Please complete your assessment using this link: ${link}`,
            html: `<p>Congratulations! Please complete your assessment using the link below:</p><br/><p><a href="${link}">${link}</a></p>`
        });
    }

    async sendFinalDecisionEmail(email: string, status: string) {
        await this.sendMail({
            from: this.getFrom(),
            to: email,
            subject: `Final Decision on your Application: ${status}`,
            text: `The final decision on your application is: ${status}.`,
            html: `<p>The final decision on your application is: <strong>${status}</strong>.</p>`
        });
    }
}
