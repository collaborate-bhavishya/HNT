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
        if (status === 'SELECTED') {
            await this.sendMail({
                from: this.getFrom(),
                to: email,
                subject: 'Congratulations! You have been selected',
                text: 'Congratulations! We are thrilled to inform you that you have been selected to join our teaching team. Please wait for the next steps — our team will connect with you shortly.',
                html: [
                    '<p>Congratulations!</p>',
                    '<p>We are thrilled to inform you that you have been <strong>selected</strong> to join our teaching team.</p>',
                    '<p>Please wait for the next steps — our team will connect with you shortly to discuss onboarding and scheduling.</p>',
                    '<br/>',
                    '<p>We look forward to working with you!</p>',
                    '<p>Warm regards,<br/>The Hiring Team</p>',
                ].join('')
            });
        } else {
            await this.sendMail({
                from: this.getFrom(),
                to: email,
                subject: 'Update on your Teaching Application',
                text: 'Thank you for your time and effort throughout the application process. Unfortunately, after careful review, we will not be moving forward with your application at this time. We wish you the very best in your future endeavours.',
                html: [
                    '<p>Thank you for your time and effort throughout the application process.</p>',
                    '<p>Unfortunately, after careful review, we will not be moving forward with your application at this time.</p>',
                    '<p>We truly appreciate your interest and wish you the very best in your future endeavours.</p>',
                    '<br/>',
                    '<p>Kind regards,<br/>The Hiring Team</p>',
                ].join('')
            });
        }
    }
}
