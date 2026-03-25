import { Controller, Post, Body, UseInterceptors, UploadedFile, Get, Param, Query, BadRequestException, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './create-application.dto';

@Controller('api/applications')
export class ApplicationsController {
    constructor(private readonly applicationsService: ApplicationsService) { }

    @Post()
    @UseInterceptors(FileInterceptor('cv'))
    async submitApplication(
        @Body() createApplicationDto: CreateApplicationDto,
        @UploadedFile() file: Express.Multer.File,
    ) {
        if (!createApplicationDto.email || !createApplicationDto.phone) {
            throw new BadRequestException('Email and phone are required');
        }
        return this.applicationsService.submitApplication(createApplicationDto, file);
    }

    @Post(':id/status')
    @UseGuards(AuthGuard('jwt'))
    async updateCandidateStatus(
        @Param('id') id: string,
        @Body('status') status: string,
        @Body('comment') comment?: string,
    ) {
        return this.applicationsService.updateCandidateStatus(id, status, comment);
    }

    @Get()
    @UseGuards(AuthGuard('jwt'))
    async getAllApplications(@Query('managerId') managerId?: string, @Query('qualityId') qualityId?: string) {
        if (qualityId) {
            return this.applicationsService.getAllCandidatesByQualityMember(qualityId);
        }
        return this.applicationsService.getAllCandidates(managerId);
    }

    @Get(':id')
    @UseGuards(AuthGuard('jwt'))
    async getCandidateById(@Param('id') id: string) {
        return this.applicationsService.getCandidateById(id);
    }

    @Post(':id/send-reminder')
    @UseGuards(AuthGuard('jwt'))
    async sendReminder(@Param('id') id: string) {
        return this.applicationsService.sendAssessmentReminder(id);
    }

    @Post(':id/assign')
    @UseGuards(AuthGuard('jwt'))
    async assignHiringManager(
        @Param('id') id: string,
        @Body('hiringManagerId') hiringManagerId: string | null,
    ) {
        return this.applicationsService.assignHiringManager(id, hiringManagerId);
    }

    @Post(':id/assign-quality')
    @UseGuards(AuthGuard('jwt'))
    async assignQualityTeam(
        @Param('id') id: string,
        @Body('qualityId') qualityId: string | null,
    ) {
        return this.applicationsService.assignQualityTeam(id, qualityId);
    }

    @Post(':id/position')
    @UseGuards(AuthGuard('jwt'))
    async updatePosition(
        @Param('id') id: string,
        @Body('position') position: string,
    ) {
        return this.applicationsService.updateCandidatePosition(id, position);
    }

    @Post(':id/quality-review-submit')
    @UseGuards(AuthGuard('jwt'))
    async submitQualityReviewLink(
        @Param('id') id: string,
        @Body('link') link: string,
    ) {
        return this.applicationsService.submitQualityReviewLink(id, link);
    }

    @Post(':id/quality-review-finalize')
    @UseGuards(AuthGuard('jwt'))
    async finalizeQualityReview(
        @Param('id') id: string,
        @Body('qualityId') qualityId: string,
        @Body('scores') scores: any,
        @Body('decision') decision: string,
    ) {
        return this.applicationsService.finalizeQualityReview(id, qualityId, scores, decision);
    }

    @Get(':id/emails')
    @UseGuards(AuthGuard('jwt'))
    async getEmails(@Param('id') id: string) {
        return this.applicationsService.getEmails(id);
    }

    @Get(':id/timeline')
    @UseGuards(AuthGuard('jwt'))
    async getTimeline(@Param('id') id: string) {
        return this.applicationsService.getTimeline(id);
    }

    @Get(':id/mock-interview')
    @UseGuards(AuthGuard('jwt'))
    async getMockInterview(@Param('id') id: string) {
        return this.applicationsService.getMockInterview(id);
    }

    @Post(':id/mock-interview')
    @UseGuards(AuthGuard('jwt'))
    async scheduleMockInterview(
        @Param('id') id: string,
        @Body('scheduledAt') scheduledAt: string,
        @Body('meetingLink') meetingLink: string,
    ) {
        return this.applicationsService.scheduleMockInterview(id, scheduledAt, meetingLink);
    }
}
