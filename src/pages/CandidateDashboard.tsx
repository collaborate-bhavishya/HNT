import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LogOut, User, CheckCircle2, Clock, CircleDot, PlayCircle, BookOpen,
  ChevronRight, Lock, ExternalLink, ChevronDown, ChevronUp,
  ClipboardCheck, FileStack, Mic, CalendarDays, Video, XCircle, AlertCircle
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface DashboardData {
  candidate: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    position: string;
    cvDriveLink: string | null;
    motivation: string | null;
    status: string;
  };
  assessment: any;
  timelineSteps: { name: string; status: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING' }[];
  trainingSteps?: any[];
  mockInterviewLink?: string | null;
}

// UI Configuration for the steps with Icons and Colors
const stepConfig: Record<string, any> = {
  'Application': { 
      heading: 'Application Submitted', 
      sub: 'Your profile background, CV, and initial details have been captured.',
      ctaInProg: 'View Application',
      icon: ClipboardCheck,
      themeBg: 'bg-blue-50/60',
      themeBorder: 'border-blue-100',
      themeIconBg: 'bg-blue-100 text-blue-600',
  },
  'MCQ Assessment': { 
      heading: 'Technical MCQ Test', 
      sub: 'A comprehensive 20-minute multiple-choice assessment of your core foundational knowledge.',
      ctaInProg: 'Start Assessment',
      ctaIcon: PlayCircle,
      icon: FileStack,
      themeBg: 'bg-purple-50/60',
      themeBorder: 'border-purple-100',
      themeIconBg: 'bg-purple-100 text-purple-600',
  },
  'Audio Assessment': { 
      heading: 'Communication Audio Test', 
      sub: 'A short interactive audio recording to evaluate your verbal communication and clarity.',
      ctaInProg: 'Start Recording',
      ctaIcon: PlayCircle,
      icon: Mic,
      themeBg: 'bg-orange-50/60',
      themeBorder: 'border-orange-100',
      themeIconBg: 'bg-orange-100 text-orange-600',
  },
  'Schedule & Prepare Mock Round Interview': { 
      heading: 'Mock Interview Prep', 
      sub: 'Review the preparation materials and choose a convenient time slot with our team.',
      ctaInProg: 'Schedule Now',
      icon: CalendarDays,
      themeBg: 'bg-sky-50/60',
      themeBorder: 'border-sky-100',
      themeIconBg: 'bg-sky-100 text-sky-600',
  },
  'Mock Interview': { 
      heading: 'Live Mock Interview', 
      sub: 'A face-to-face 1-on-1 video call assessment with one of our experienced interviewers.',
      ctaInProg: 'Join Video Call',
      icon: Video,
      themeBg: 'bg-rose-50/60',
      themeBorder: 'border-rose-100',
      themeIconBg: 'bg-rose-100 text-rose-600',
  }
};

const trainingSteps = [
  { heading: 'Welcome to Brightchamps', sub: 'Learning more about brightchamps', type: 'self', ctaLink: 'https://adhyayan.brightchamps.com/module/TT0101', date: '' },
  { heading: 'Onboarding Session', sub: 'Get to know your colleagues and team', type: 'live', ctaLink: 'TBD', date: '' },
  { heading: 'Your Role & Growth Opportunities', sub: 'Know more about earning potential and cross functional opportunities', type: 'self', ctaLink: 'https://adhyayan.brightchamps.com/module/TT0102', date: '' },
  { heading: 'Payout Policy', sub: 'learn more about payout', type: 'self', ctaLink: 'https://adhyayan.brightchamps.com/module/TT0103', date: '' },
  { heading: 'Soft Skill Training', sub: 'Learn about soft skill required for taking a class', type: 'self', ctaLink: 'https://adhyayan.brightchamps.com/module/TT0104', date: '' },
  { heading: 'Soft Skill Training', sub: 'Learn about soft skills', type: 'live', ctaLink: 'TBD', date: '' },
  { heading: 'Content Training', sub: 'Learn about the content that you\'ll teach in demo classes', type: 'live', ctaLink: 'TBD', date: '' },
  { heading: 'Product and Policy', sub: 'Learn about tools and policies', type: 'self', ctaLink: 'https://adhyayan.brightchamps.com/module/TT0105', date: '' }
];

export default function CandidateDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Collapsible states
  const [isHiringOpen, setIsHiringOpen] = useState(true);
  const [isTrainingOpen, setIsTrainingOpen] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('candidate_token');
    if (!token) {
      navigate('/candidate-login');
      return;
    }

    fetch(`${API_BASE}/api/candidate/dashboard`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Unauthorized');
        return res.json();
      })
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        localStorage.removeItem('candidate_token');
        navigate('/candidate-login');
      });
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('candidate_token');
    navigate('/candidate-login');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SELECTED': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'REJECTED_FORM':
      case 'REJECTED_FINAL': return 'bg-red-100 text-red-700 border-red-200';
      case 'TESTING': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!data) return null;

  const renderStepBlock = (step: any, isTraining: boolean, index: number) => {
    let config = stepConfig[step.name] || { heading: step.name, sub: 'Progress step.', ctaInProg: 'Continue', themeBg: 'bg-white', themeBorder: 'border-slate-200', themeIconBg: 'bg-slate-100 text-slate-400' };
    
    if (isTraining) {
        const isLive = step.type === 'live';
        const theme = isLive 
          ? { icon: Video, themeBg: 'bg-emerald-50/70', themeBorder: 'border-emerald-200', themeIconBg: 'bg-emerald-100 text-emerald-600' }
          : { icon: BookOpen, themeBg: 'bg-blue-50/60', themeBorder: 'border-blue-100', themeIconBg: 'bg-blue-100 text-blue-600' };
        
        config = { ...theme, ...step };
    }
    
    // Status Logic
    const isCompleted = isTraining ? false : step.status === 'COMPLETED';
    const isRejected = !isTraining && step.status === 'REJECTED';
    const isPending = isTraining ? data.candidate.status !== 'SELECTED' : step.status === 'PENDING';
    const isInProgress = isTraining ? data.candidate.status === 'SELECTED' : step.status === 'IN_PROGRESS';
    const isLiveWithoutDate = step.type === 'live' && (!step.date || step.date.trim() === '' || step.date.trim().toUpperCase() === 'TBD');
    
    // Status Node Icon
    let StateIcon = CircleDot;
    let iconColors = "bg-slate-100 text-slate-300 border-slate-200";
    if (isCompleted) {
       StateIcon = CheckCircle2;
       iconColors = "bg-emerald-100 text-emerald-600 border-emerald-200 ring-4 ring-emerald-50";
    } else if (isRejected) {
       StateIcon = XCircle;
       iconColors = "bg-red-100 text-red-600 border-red-200 ring-4 ring-red-50";
    } else if (isInProgress) {
       StateIcon = Clock;
       iconColors = "bg-indigo-100 text-indigo-600 border-indigo-200 ring-4 ring-indigo-50 animate-pulse";
    }

    const MainIcon = config.icon || CircleDot;

    // Apply color tint ONLY if it's not pending visually
    const blockBgClass = isRejected ? 'bg-red-50/60' : (isPending ? 'bg-white' : config.themeBg);
    const blockBorderClass = isRejected ? 'border-red-200 shadow-sm' : (isInProgress ? 'border-indigo-400 shadow-md shadow-indigo-100/50' : (isPending ? 'border-slate-200 border-dashed shadow-sm' : `${config.themeBorder} shadow-sm border`));
    const internalIconClass = isRejected ? 'bg-red-100 text-red-600' : (isPending ? 'bg-slate-50 text-slate-300' : config.themeIconBg);

    return (
      <div key={step.name} className={`relative pl-12 md:pl-16 w-full ${isPending ? 'opacity-70' : 'opacity-100'} transition-opacity`}>
         <div className="absolute left-0 top-6 bottom-0 w-0.5 bg-slate-200 -ml-px z-0 last:hidden"></div>
         {/* Dot node */}
         <div className={`absolute left-[-15px] top-6 w-8 h-8 flex items-center justify-center rounded-full border-2 z-10 ${iconColors} bg-white transition-all duration-300`}>
             <StateIcon size={isCompleted ? 20 : 18} className={isCompleted ? "fill-emerald-100 text-emerald-600" : ""} strokeWidth={isCompleted ? 2 : 2.5} />
         </div>

         {/* Content Block */}
         <div className={`rounded-2xl ${blockBgClass} ${blockBorderClass} p-5 md:p-6 transition-all`}>
           <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
              
              <div className="flex items-start gap-4">
                {/* Big Visual Icon inside block */}
                <div className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center border border-white/40 shadow-sm ${internalIconClass}`}>
                  <MainIcon size={24} strokeWidth={1.5} />
                </div>
                
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                     <span className={`text-xs font-bold tracking-wider uppercase ${isPending ? 'text-slate-400' : 'text-slate-500'}`}>Session {isTraining ? index + 1 - data.timelineSteps.length : index + 1}</span>
                     {isTraining && step.type === 'live' && (
                        <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-sm font-bold border border-red-200 uppercase tracking-widest flex items-center gap-1">
                          <CircleDot size={8} className="animate-pulse" /> LIVE SESSION
                        </span>
                     )}
                     {isTraining && step.type === 'self' && (
                        <span className="text-[10px] bg-sky-100 text-sky-700 px-2 py-0.5 rounded-sm font-bold border border-sky-200 uppercase tracking-widest flex items-center gap-1">
                           SELF LEARNING
                        </span>
                     )}
                     {!isTraining && isCompleted && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold border border-emerald-200 shadow-sm">DONE</span>}
                     {!isTraining && isRejected && <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold border border-red-200 shadow-sm">FAILED</span>}
                  </div>
                  
                  <h3 className={`text-lg font-bold mb-1 ${isPending ? 'text-slate-600' : 'text-slate-900'}`}>{config.heading}</h3>
                  <p className={`text-sm ${isPending ? 'text-slate-400' : 'text-slate-600'} leading-relaxed max-w-2xl`}>
                    {config.sub}
                  </p>

                  {/* Training specific date tags */}
                  {isTraining && (
                     <div className={`mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-md border ${isPending ? 'bg-slate-50 border-slate-200 text-slate-400' : 'bg-white border-slate-200 text-slate-600'} shadow-[0_1px_2px_rgba(0,0,0,0.02)]`}>
                        <CalendarDays size={14} />
                        {step.type === 'live' ? (isLiveWithoutDate ? 'TBD' : step.date) : 'Self-Paced'}
                     </div>
                  )}

                  {/* Optional Result Data from backend */}
                  {isCompleted && !isTraining && step.name === 'MCQ Assessment' && data.assessment?.mcqScore && (
                      <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 font-medium shadow-sm">
                         MCQ Score: <span className="font-extrabold text-indigo-700 text-base">{data.assessment.mcqScore.toFixed(1)}</span> <span className="text-xs text-slate-400">/ 100</span>
                      </div>
                  )}
                </div>
              </div>

              {/* CTAs right aligned */}
              <div className="mt-2 md:mt-0 flex-shrink-0 flex items-center md:self-center ml-16 md:ml-0">
                 {/* Training CTA */}
                 {isTraining ? (
                     isInProgress ? (
                      <button 
                         className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold shadow-md transition-transform ${isLiveWithoutDate ? 'bg-slate-300 text-slate-500 border border-slate-300 cursor-not-allowed shadow-none' : 'bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white active:scale-95'}`}
                         onClick={() => { if (!isLiveWithoutDate && step.ctaLink) window.open(step.ctaLink, '_blank') }}
                         disabled={isLiveWithoutDate}
                      >
                         {step.type === 'live' ? <Video size={18} /> : <PlayCircle size={18} />}
                         {step.type === 'live' ? (isLiveWithoutDate ? 'To Be Decided' : 'Join') : 'Start Now'}
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 text-slate-400 text-sm font-bold tracking-wide px-4 py-2 bg-slate-50 rounded-lg border border-slate-200 shadow-sm opacity-80">
                         <Lock size={14} /> LOCKED
                      </div>
                    )
                 ) : (
                    /* Hiring CTA */
                    <>
                       {isInProgress && (
                          <button 
                             className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white font-semibold text-sm rounded-xl shadow-md transition-transform active:scale-95"
                             onClick={() => {
                                 if (step.name === 'Schedule & Prepare Mock Round Interview' && data.mockInterviewLink) {
                                     window.open(data.mockInterviewLink, '_blank');
                                 } else if (config.ctaLink) {
                                     window.open(config.ctaLink, '_blank');
                                 }
                             }}
                          >
                             {config.ctaIcon && <config.ctaIcon size={18} />}
                             {config.ctaInProg}
                          </button>
                       )}
                       {isCompleted && (
                          <button className="flex items-center gap-1 text-slate-500 hover:text-slate-800 font-medium text-sm transition-colors px-4 py-2 hover:bg-white rounded-lg border border-transparent hover:border-slate-200">
                             Review details <ChevronRight size={16} />
                          </button>
                       )}
                    </>
                 )}
              </div>
           </div>
         </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F4F7F9] font-sans pb-32">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm shadow-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <img src="/brightchamps-logo.svg" alt="BrightChamps" className="h-8" />
              <div className="h-6 w-px bg-slate-200 mx-1"></div>
              <span className="font-bold text-slate-800 text-xl tracking-tight hidden sm:block">Global Teacher Program</span>
              <span className="font-bold text-slate-800 text-xl tracking-tight sm:hidden">GTP Portal</span>
            </div>
            <button
              onClick={handleLogout}
              className="text-slate-500 hover:text-slate-800 flex items-center gap-2 text-sm font-semibold transition-colors bg-slate-50 hover:bg-slate-100 py-2 px-4 rounded-xl border border-slate-200"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        
        {/* Header Profile Card */}
        <div className="bg-white rounded-3xl shadow-md shadow-slate-200/50 border border-slate-200 p-8 mb-12 flex flex-col relative overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-blend-soft-light">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-80 -mr-20 -mt-20 pointer-events-none"></div>
          
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 relative z-10 w-full border-b border-slate-100 pb-6 mb-6">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-100 shrink-0 shadow-inner">
                <User size={38} strokeWidth={1.25} />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  Welcome back, {data.candidate.firstName}
                </h1>
                <p className="text-slate-500 mt-1.5 text-base font-medium flex items-center gap-2">
                   <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                   {data.candidate.position}
                </p>
              </div>
            </div>
            <div className="w-full md:w-auto bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-slate-100 shadow-sm text-center md:text-right">
              <p className="text-[11px] text-slate-400 font-bold mb-2 uppercase tracking-[0.2em]">Application Phase</p>
              <div className={`px-5 py-2 rounded-xl border-2 inline-flex items-center gap-2 font-bold tracking-wide uppercase text-sm shadow-sm ${getStatusColor(data.candidate.status)}`}>
                 {data.candidate.status.replace('_', ' ')}
              </div>
            </div>
          </div>
          
          {/* Candidate Detailed Banner Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10 w-full mb-4">
             <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 hover:shadow-md transition-shadow">
                <p className="text-xs text-slate-400 font-bold tracking-wider uppercase mb-1 flex items-center gap-1.5">Email ID</p>
                <p className="text-sm font-semibold text-slate-800 break-all">{data.candidate.email}</p>
             </div>
             <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 hover:shadow-md transition-shadow">
                <p className="text-xs text-slate-400 font-bold tracking-wider uppercase mb-1">Phone No.</p>
                <p className="text-sm font-semibold text-slate-800">{data.candidate.phone}</p>
             </div>
             <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 hover:shadow-md transition-shadow flex flex-col">
                <p className="text-xs text-slate-400 font-bold tracking-wider uppercase mb-1">Resume / CV</p>
                {data.candidate.cvDriveLink ? (
                  <a href={data.candidate.cvDriveLink} target="_blank" rel="noreferrer" className="text-sm font-bold text-indigo-600 hover:text-indigo-800 underline underline-offset-4 flex items-center gap-1.5 w-max mt-auto">
                    View Document <ExternalLink size={14} />
                  </a>
                ) : (
                  <p className="text-sm font-semibold text-slate-400 mt-auto">Not Uploaded</p>
                )}
             </div>
          </div>
          <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 relative z-10 w-full hover:shadow-md transition-shadow">
              <p className="text-xs text-slate-400 font-bold tracking-wider uppercase mb-2">Why do you want to join BrightChamps?</p>
              <p className="text-[15px] text-slate-700 leading-relaxed font-medium italic border-l-4 rounded-sm border-indigo-200 pl-4 py-1">
                "{data.candidate.motivation || 'No answer provided.'}"
              </p>
          </div>
        </div>

        {/* Unified Timeline Container */}
        <div className="space-y-6">
          
          {/* HIRING SECTION COLLAPSIBLE */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <button 
              onClick={() => setIsHiringOpen(!isHiringOpen)}
              className="w-full flex items-center justify-between p-6 md:p-8 bg-white hover:bg-slate-50 transition-colors cursor-pointer select-none"
            >
               <div className="flex items-center gap-4">
                 <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                    <User size={20} strokeWidth={2.5} />
                 </div>
                 <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">
                    Hiring Journey
                 </h2>
               </div>
               <div className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors">
                  {isHiringOpen ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
               </div>
            </button>
            
            <div className={`transition-all duration-500 ease-in-out ${isHiringOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
              <div className="p-6 md:p-8 pt-0 space-y-7 border-t border-slate-100">
                 {data.timelineSteps.map((step, idx) => renderStepBlock(step, false, idx))}
              </div>
            </div>
          </div>

          {/* BIFURCATION DIVIDER */}
          <div className="flex items-center justify-center py-6 relative">
             <div className="absolute left-1/2 top-0 h-1/2 w-0.5 bg-slate-300 -ml-px border-dashed border-l-2 bg-transparent opacity-50"></div>
             <div className="absolute left-1/2 bottom-0 h-1/2 w-0.5 bg-slate-300 -ml-px border-dashed border-l-2 bg-transparent opacity-50"></div>
             
             <div className="px-6 py-2.5 rounded-full border border-dashed border-slate-300 bg-white text-slate-500 font-bold tracking-widest uppercase text-[11px] z-10 shadow-sm shadow-slate-200/50 flex items-center gap-2">
                <ChevronDown size={14} /> Next Stage: Onboarding <ChevronDown size={14} />
             </div>
          </div>

          {/* TRAINING SECTION COLLAPSIBLE */}
          <div className={`bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden transition-opacity duration-500 ${data.candidate.status === 'SELECTED' ? 'opacity-100' : 'opacity-80'}`}>
            <button 
              onClick={() => setIsTrainingOpen(!isTrainingOpen)}
              className="w-full flex items-center justify-between p-6 md:p-8 bg-white hover:bg-slate-50 transition-colors cursor-pointer select-none"
            >
               <div className="flex items-center gap-4">
                 <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                    <BookOpen size={20} strokeWidth={2.5} />
                 </div>
                 <div className="flex items-center gap-3">
                   <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">
                      Training Modules
                   </h2>
                   {data.candidate.status !== 'SELECTED' && (
                       <span className="text-[10px] font-bold tracking-widest uppercase bg-slate-100 border border-slate-200 text-slate-500 px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm">
                          <Lock size={12} /> Unlocks Upon Selection
                       </span>
                   )}
                 </div>
               </div>
               <div className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors">
                  {isTrainingOpen ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
               </div>
            </button>
            
            <div className={`transition-all duration-500 ease-in-out ${isTrainingOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
              <div className="p-6 md:p-8 pt-0 space-y-7 border-t border-slate-100">
                 {((data.trainingSteps && data.trainingSteps.length > 0) ? data.trainingSteps : trainingSteps).map((step: any, idx: number) => renderStepBlock(step, true, data.timelineSteps.length + idx))}
              </div>
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}
