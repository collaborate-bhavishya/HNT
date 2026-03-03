import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class NotificationsService {
    private readonly logger = new Logger(NotificationsService.name);

    async sendFormRejectionEmail(email: string) {
        this.logger.log(`Mock Email Sent: Form Rejection -> ${email}`);
    }

    async sendAssessmentLinkEmail(email: string, link: string) {
        this.logger.log(`Mock Email Sent: Assessment Link -> ${email} [${link}]`);
    }

    async sendFinalDecisionEmail(email: string, status: string) {
        this.logger.log(`Mock Email Sent: Final Decision (${status}) -> ${email}`);
    }
}
