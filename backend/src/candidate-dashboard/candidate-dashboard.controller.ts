import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../prisma.service';

@Controller('api/candidate/dashboard')
export class CandidateDashboardController {
  constructor(private readonly prisma: PrismaService) {}

  @UseGuards(AuthGuard('jwt-candidate'))
  @Get()
  async getDashboard(@Req() req: any) {
    const candidateId = req.user.userId;

    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
      include: {
        assessments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!candidate) {
      return { status: 'NOT_FOUND' };
    }

    const assessment = candidate.assessments[0] || null;

    const config = await this.prisma.subjectDashboardConfig.findUnique({
      where: { subject: candidate.position }
    });

    return {
      candidate: {
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        email: candidate.email,
        phone: candidate.phone,
        position: candidate.position,
        cvDriveLink: candidate.cvDriveLink,
        motivation: candidate.motivation,
        status: candidate.status,
      },
      assessment: assessment ? {
        token: assessment.token,
        status: assessment.status,
        mcqScore: assessment.mcqScore,
        audioScore: assessment.audioScore,
        finalScore: assessment.finalScore,
        completedAt: assessment.completedAt,
      } : null,
      mockInterviewLink: config?.mockInterviewLink || null,
      trainingSteps: config?.trainingNodes || null,
      timelineSteps: [
        { 
          name: 'Application', 
          status: candidate.status === 'REJECTED_FORM' ? 'REJECTED' : 'COMPLETED' 
        },
        { 
          name: 'MCQ Assessment', 
          status: candidate.status === 'REJECTED_FINAL' && (assessment?.mcqScore === null || assessment.mcqScore < 60) ? 'REJECTED' :
                  (assessment?.mcqScore !== null ? 'COMPLETED' : 
                  (candidate.status === 'TESTING' || candidate.status === 'AUDIO_PROCESSING' || candidate.status === 'MANUAL_REVIEW' || candidate.status === 'ASSESSMENT_COMPLETED' || candidate.status === 'SELECTED' ? 'IN_PROGRESS' : 'PENDING'))
        },
        { 
          name: 'Audio Assessment', 
          status: candidate.status === 'REJECTED_FINAL' && assessment?.mcqScore !== null && assessment.mcqScore >= 60 && assessment?.audioScore === null ? 'REJECTED' :
                  (assessment?.audioScore !== null || candidate.status === 'MANUAL_REVIEW' || candidate.status === 'ASSESSMENT_COMPLETED' || candidate.status === 'SELECTED' ? 'COMPLETED' : 
                  (candidate.status === 'AUDIO_PROCESSING' ? 'IN_PROGRESS' : 'PENDING'))
        },
        { 
          name: 'Schedule & Prepare Mock Round Interview', 
          status: candidate.status === 'SELECTED' ? 'COMPLETED' : 
                  (candidate.status === 'MANUAL_REVIEW' || candidate.status === 'ASSESSMENT_COMPLETED' ? 'IN_PROGRESS' : 'PENDING') 
        },
        { 
          name: 'Mock Interview', 
          status: candidate.status === 'SELECTED' ? 'COMPLETED' : 
                  (candidate.status === 'SELECTED' ? 'IN_PROGRESS' : 'PENDING')
        },
      ]
    };
  }
}
