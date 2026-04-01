import { Controller, Post, Body, UseInterceptors, UploadedFile, Get, Param, Query, Req, BadRequestException, ForbiddenException, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './create-application.dto';

@Controller('api/applications')
export class ApplicationsController {
    constructor(private readonly applicationsService: ApplicationsService) { }

    private async assertCandidateAccess(user: any, candidateId: string) {
        if (user.role === 'MASTER_ADMIN' || user.role === 'admin') return;
        const candidate = await this.applicationsService.getCandidateById(candidateId);
        if (!candidate) throw new BadRequestException('Candidate not found');
        if (user.role === 'HIRING_MANAGER' && candidate.hiringManagerId !== user.managerId) {
            throw new ForbiddenException('You do not have access to this candidate');
        }
        if (user.role === 'QUALITY_TEAM' && candidate.qualityTeamId !== user.qualityId) {
            throw new ForbiddenException('You do not have access to this candidate');
        }
    }

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
        @Req() req: any,
        @Param('id') id: string,
        @Body('status') status: string,
        @Body('comment') comment?: string,
    ) {
        await this.assertCandidateAccess(req.user, id);
        return this.applicationsService.updateCandidateStatus(id, status, comment);
    }

    @Get()
    @UseGuards(AuthGuard('jwt'))
    async getAllApplications(@Req() req: any, @Query('managerId') managerId?: string, @Query('qualityId') qualityId?: string) {
        const user = req.user;
        if (user.role === 'HIRING_MANAGER') {
            return this.applicationsService.getAllCandidates(user.managerId);
        }
        if (user.role === 'QUALITY_TEAM') {
            return this.applicationsService.getAllCandidatesByQualityMember(user.qualityId);
        }
        if (qualityId) {
            return this.applicationsService.getAllCandidatesByQualityMember(qualityId);
        }
        return this.applicationsService.getAllCandidates(managerId);
    }

    @Get(':id')
    @UseGuards(AuthGuard('jwt'))
    async getCandidateById(@Req() req: any, @Param('id') id: string) {
        await this.assertCandidateAccess(req.user, id);
        return this.applicationsService.getCandidateById(id);
    }

    @Post(':id/send-reminder')
    @UseGuards(AuthGuard('jwt'))
    async sendReminder(@Req() req: any, @Param('id') id: string) {
        await this.assertCandidateAccess(req.user, id);
        return this.applicationsService.sendAssessmentReminder(id);
    }

    @Post(':id/assign')
    @UseGuards(AuthGuard('jwt'))
    async assignHiringManager(
        @Req() req: any,
        @Param('id') id: string,
        @Body('hiringManagerId') hiringManagerId: string | null,
    ) {
        if (req.user.role !== 'MASTER_ADMIN' && req.user.role !== 'admin') {
            throw new ForbiddenException('Only master admin can assign hiring managers');
        }
        return this.applicationsService.assignHiringManager(id, hiringManagerId);
    }

    @Post(':id/assign-quality')
    @UseGuards(AuthGuard('jwt'))
    async assignQualityTeam(
        @Req() req: any,
        @Param('id') id: string,
        @Body('qualityId') qualityId: string | null,
    ) {
        if (req.user.role !== 'MASTER_ADMIN' && req.user.role !== 'admin') {
            throw new ForbiddenException('Only master admin can assign quality team');
        }
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
    ) {
        return this.applicationsService.finalizeQualityReview(id, qualityId, scores);
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
