import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class NotificationsService {
    private readonly logger = new Logger(NotificationsService.name);
    private transporter: nodemailer.Transporter | null = null;

    constructor() {
        this.initTransporter();
    }

    private async initTransporter() {
        if (process.env.SMTP_HOST) {
            this.transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT || '587', 10),
                secure: process.env.SMTP_SECURE === 'true',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                },
            });
            this.logger.log('SMTP transporter initialized');
        } else {
            this.logger.warn('No SMTP_HOST found in .env, falling back to ethereal test account for emails');
            try {
                const testAccount = await nodemailer.createTestAccount();
                this.transporter = nodemailer.createTransport({
                    host: testAccount.smtp.host,
                    port: testAccount.smtp.port,
                    secure: testAccount.smtp.secure,
                    auth: {
                        user: testAccount.user,
                        pass: testAccount.pass,
                    },
                });
                this.logger.log(`Ethereal test account created: ${testAccount.user} / ${testAccount.pass}`);
            } catch (error) {
                this.logger.error('Failed to create ethereal test account', error);
            }
        }
    }

    private async sendMail(options: nodemailer.SendMailOptions) {
        if (!this.transporter) {
            this.logger.warn(`Transporter not initialized yet. Cannot send email to ${options.to}`);
            return;
        }

        try {
            const info = await this.transporter.sendMail(options);
            this.logger.log(`Email Sent: ${options.subject} -> ${options.to}`);

            if (!process.env.SMTP_HOST) {
                this.logger.log(`Preview Email URL: ${nodemailer.getTestMessageUrl(info)}`);
            }
        } catch (error) {
            this.logger.error(`Failed to send email to ${options.to}`, error);
        }
    }

    async sendFormRejectionEmail(email: string) {
        await this.sendMail({
            from: process.env.SMTP_FROM || '"Teacher Hiring" <no-reply@hnt.example.com>',
            to: email,
            subject: 'Update on your Teaching Application',
            text: 'Thank you for applying. Unfortunately, we are not moving forward with your application at this time.',
            html: '<p>Thank you for applying.</p><p>Unfortunately, we are not moving forward with your application at this time.</p>'
        });
    }

    async sendAssessmentLinkEmail(email: string, link: string) {
        await this.sendMail({
            from: process.env.SMTP_FROM || '"Teacher Hiring" <no-reply@hnt.example.com>',
            to: email,
            subject: 'You have been selected! Next step: Assessment',
            text: `Congratulations! Please complete your assessment using this link: ${link}`,
            html: `<p>Congratulations! Please complete your assessment using the link below:</p><br/><p><a href="${link}">${link}</a></p>`
        });
    }

    async sendFinalDecisionEmail(email: string, status: string) {
        await this.sendMail({
            from: process.env.SMTP_FROM || '"Teacher Hiring" <no-reply@hnt.example.com>',
            to: email,
            subject: `Final Decision on your Application: ${status}`,
            text: `The final decision on your application is: ${status}.`,
            html: `<p>The final decision on your application is: <strong>${status}</strong>.</p>`
        });
    }
}
