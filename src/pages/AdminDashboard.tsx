import { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/utils';
import { Search, User, XCircle, RefreshCw, AlertCircle, FileUp, Database, Trash2, CheckCircle2, Clock, Mail, LayoutDashboard, ShieldCheck, Home, Users, Video, ExternalLink, Star, Loader2 } from 'lucide-react';
import { Input } from '../components/ui/Input';
import { CandidateDashboardConfigView } from '../components/CandidateDashboardConfigView';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const toIST = (dateStr: string, includeTime = false) => {
    const options: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Kolkata',
        day: '2-digit', month: 'short', year: 'numeric',
        ...(includeTime && { hour: '2-digit', minute: '2-digit', hour12: true }),
    };
    return new Date(dateStr).toLocaleString('en-IN', options);
};

type CandidateStatus = 'APPLIED' | 'REJECTED' | 'AI_SCORING' | 'REJECTED_FORM' | 'TESTING' | 'AUDIO_PROCESSING' | 'SELECTED' | 'MANUAL_REVIEW' | 'REJECTED_FINAL' | 'AUDIO_FAILED' | 'QUALITY_REVIEW_PENDING' | 'SELECTED_FOR_TRAINING';

interface Candidate {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    position: string;
    experience: number;
    currentLocation: string | null;
    cvDriveLink: string | null;
    motivation: string | null;
    status: CandidateStatus;
    rejectionReason: string | null;
    hiringManagerId: string | null;
    hiringManager: { id: string; name: string } | null;
    createdAt: string;
    updatedAt: string;
    assessments?: Assessment[];
    qualityReviewLink?: string | null;
    qualityReviewScore?: any | null;
    qualityReviewResult?: string | null;
    qualityTeamId?: string | null;
    mockInterview?: {
        scheduledAt: string;
        meetingLink: string;
        status: string;
    } | null;
}

interface McqQuestion {
    id: string;
    questionText: string;
    options: string[];
    correctAnswer: string;
    difficulty: string;
    category: string;
}

interface AudioPromptItem {
    label: string;
    prompt: string;
}

interface Assessment {
    id: string;
    token: string;
    status: string;
    topic: string | null;
    mcqScore: number | null;
    mcqQuestions: McqQuestion[] | null;
    introAudioDriveLink: string | null;
    audioDriveLink: string | null;
    audioPrompts?: AudioPromptItem[] | null;
    startedAt: string | null;
    completedAt: string | null;
    expiresAt: string | null;
    reminderCount: number;
    lastReminderAt: string | null;
    createdAt: string;
}

function displayAudioPromptText(prompt: string | undefined): string {
    if (!prompt) return '';
    const t = prompt.trim();
    if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
        return t.slice(1, -1);
    }
    return t;
}

const statusConfig: Record<string, { label: string; color: string }> = {
    APPLIED: { label: 'Applied', color: 'bg-gray-100 text-gray-800 border-gray-200' },
    REJECTED: { label: 'Rejected', color: 'bg-red-50 text-red-700 border-red-200' },
    AI_SCORING: { label: 'AI Scoring', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    REJECTED_FORM: { label: 'Rejected (AI)', color: 'bg-red-50 text-red-700 border-red-200' },
    TESTING: { label: 'Testing', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    AUDIO_PROCESSING: { label: 'Audio Processing', color: 'bg-purple-50 text-purple-700 border-purple-200' },
    SELECTED: { label: 'Selected', color: 'bg-green-50 text-green-700 border-green-200' },
    MANUAL_REVIEW: { label: 'Manual Review', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
    REJECTED_FINAL: { label: 'Rejected (Final)', color: 'bg-red-50 text-red-700 border-red-200' },
    AUDIO_FAILED: { label: 'Audio Failed', color: 'bg-orange-50 text-orange-700 border-orange-200' },
    QUALITY_REVIEW_PENDING: { label: 'Quality Review Pending', color: 'bg-orange-50 text-orange-700 border-orange-200' },
    SELECTED_FOR_TRAINING: { label: 'Selected for Training', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

interface HiringManagerInfo {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    subject?: string;
    isActive?: boolean;
    isAutoAssignEnabled?: boolean;
    lastAssignedAt?: string;
    candidateCount?: number;
}

type UserRole = 'MASTER_ADMIN' | 'HIRING_MANAGER' | 'QUALITY_TEAM';

export default function AdminDashboard() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [loginError, setLoginError] = useState('');
    const [loginLoading, setLoginLoading] = useState(false);

    const [userRole, setUserRole] = useState<UserRole | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [userName, setUserName] = useState('');
    const [token, setToken] = useState<string | null>(null);

    const [isQuestionBankAuthenticated, setIsQuestionBankAuthenticated] = useState(false);
    const [qbPasswordInput, setQbPasswordInput] = useState('');
    const [qbPasswordError, setQbPasswordError] = useState('');

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
    const [isDetailLoading, setIsDetailLoading] = useState(false);
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [positionFilter, setPositionFilter] = useState<string>('ALL');
    const [activeTab, setActiveTab] = useState<'HOME' | 'CANDIDATES' | 'QUESTIONS' | 'TEAM' | 'HIRING_MANAGERS' | 'DASHBOARD_CONFIG' | 'QUALITY_TEAM' | 'QUALITY_CUTOFF'>('HOME');
    const [teamTab, setTeamTab] = useState<'HIRING_MANAGERS' | 'QUALITY_TEAM'>('HIRING_MANAGERS');
    const [activeDetailTab, setActiveDetailTab] = useState<'ASSESSMENT' | 'MOCK_INTERVIEW' | 'EMAILS' | 'TIMELINE'>('ASSESSMENT');

    const [hiringManagers, setHiringManagers] = useState<HiringManagerInfo[]>([]);
    const [activeManagers, setActiveManagers] = useState<HiringManagerInfo[]>([]);
    const [hmForm, setHmForm] = useState({ name: '', email: '', password: '', phone: '', subject: 'Coding', isAutoAssignEnabled: false });
    const [editingHm, setEditingHm] = useState<string | null>(null);
    const [hmMsg, setHmMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [isAddHmOpen, setIsAddHmOpen] = useState(false);

    // Quality Team Management State
    const [qualityMembers, setQualityMembers] = useState<any[]>([]);
    const [qtForm, setQtForm] = useState({ name: '', email: '', pin: '', subject: 'Coding', isActive: true, isAutoAssignEnabled: false });
    const [editingQt, setEditingQt] = useState<string | null>(null);
    const [isAddQtOpen, setIsAddQtOpen] = useState(false);
    const [qtMsg, setQtMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const isMasterAdmin = userRole === 'MASTER_ADMIN';

    const [sendingReminder, setSendingReminder] = useState(false);
    const [rejectionComment, setRejectionComment] = useState('');

    // --- Detail Slide-over State ---
    const [candidateEmails, setCandidateEmails] = useState<any[]>([]);
    const [candidateTimeline, setCandidateTimeline] = useState<any[]>([]);
    const [candidateMockInterview, setCandidateMockInterview] = useState<any>(null);
    const [mockInterviewTabLoading, setMockInterviewTabLoading] = useState(false);
    const [mockInterviewScheduleSaving, setMockInterviewScheduleSaving] = useState(false);
    const [qualityReviewLinkSubmitting, setQualityReviewLinkSubmitting] = useState(false);
    const [qualityFinalizeLoading, setQualityFinalizeLoading] = useState<null | 'pass' | 'reject'>(null);
    const [mockInterviewDate, setMockInterviewDate] = useState('');
    const [mockInterviewTime, setMockInterviewTime] = useState('');
    const [mockInterviewLinkInput, setMockInterviewLinkInput] = useState('');
    const [qualityReviewComment, setQualityReviewComment] = useState('');
    const [mockInterviewRejectReason, setMockInterviewRejectReason] = useState<'not_connect' | 'not_interested' | 'other' | ''>('');
    const [mockInterviewRejectComment, setMockInterviewRejectComment] = useState('');
    const [mockInterviewRejectLoading, setMockInterviewRejectLoading] = useState(false);
    const [qtViewFilter, setQtViewFilter] = useState<'PENDING' | 'COMPLETED'>('PENDING');

    const [cutoffAuthenticated, setCutoffAuthenticated] = useState(false);
    const [cutoffPasswordInput, setCutoffPasswordInput] = useState('');
    const [cutoffPasswordError, setCutoffPasswordError] = useState('');
    const [cutoffSubject, setCutoffSubject] = useState('Coding');
    const [cutoffScores, setCutoffScores] = useState<Record<string, number>>({ subjectKnowledge: 5, studentEngagement: 5, energyLevel: 5, communication: 5 });
    const [cutoffLoading, setCutoffLoading] = useState(false);
    const [cutoffSaving, setCutoffSaving] = useState(false);
    const CUTOFF_PASSWORD = 'cutoff@2026';

    useEffect(() => {
        setMockInterviewRejectReason('');
        setMockInterviewRejectComment('');
    }, [selectedCandidate?.id]);

    useEffect(() => {
        if (!selectedCandidate?.id) return;
        const fetchTabData = async () => {
            if (activeDetailTab === 'ASSESSMENT') return;
            const isMockTab = activeDetailTab === 'MOCK_INTERVIEW';
            if (isMockTab) setMockInterviewTabLoading(true);
            try {
                if (activeDetailTab === 'EMAILS') {
                    const res = await fetch(`${API_BASE}/api/applications/${selectedCandidate.id}/emails`, { headers: { 'Authorization': `Bearer ${token}` } });
                    if (res.ok) setCandidateEmails(await res.json());
                } else if (activeDetailTab === 'TIMELINE') {
                    const res = await fetch(`${API_BASE}/api/applications/${selectedCandidate.id}/timeline`, { headers: { 'Authorization': `Bearer ${token}` } });
                    if (res.ok) setCandidateTimeline(await res.json());
                } else if (isMockTab) {
                    const res = await fetch(`${API_BASE}/api/applications/${selectedCandidate.id}/mock-interview`, { headers: { 'Authorization': `Bearer ${token}` } });
                    if (res.ok) {
                        const data = await res.json();
                        setCandidateMockInterview(data);
                        if (data && data.scheduledAt) {
                            const istStr = new Date(data.scheduledAt).toLocaleString('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
                            const [datePart, timePart] = istStr.split(', ');
                            setMockInterviewDate(datePart || '');
                            setMockInterviewTime(timePart?.substring(0, 5) || '');
                        }
                        if (data && data.meetingLink) setMockInterviewLinkInput(data.meetingLink);
                    }
                }
            } catch (err) {
                console.error(err);
            } finally {
                if (isMockTab) setMockInterviewTabLoading(false);
            }
        };
        fetchTabData();
    }, [activeDetailTab, selectedCandidate?.id, token]);

    // Question management state
    const [uploading, setUploading] = useState(false);
    const [importMsg, setImportMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [qbTab, setQbTab] = useState<'MCQ' | 'AUDIO'>('MCQ');
    const [audioQs, setAudioQs] = useState<any[]>([]);
    const [aqForm, setAqForm] = useState({ subject: 'Coding', questionText: '' });
    const [aqLoading, setAqLoading] = useState(false);

    const fetchCandidates = async () => {
        setLoading(true);
        setError(null);
        try {
            let url = `${API_BASE}/api/applications`;
            if (userRole === 'HIRING_MANAGER' && userId) {
                url += `?managerId=${userId}`;
            } else if (userRole === 'QUALITY_TEAM' && userId) {
                url += `?qualityId=${userId}`;
            }
            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error(`API returned ${res.status}`);
            const data = await res.json();
            setCandidates(data);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch candidates');
        } finally {
            setLoading(false);
        }
    };

    const fetchQualityMembers = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/quality-team`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (res.ok) {
                const data = await res.json();
                setQualityMembers(data);
            }
        } catch (err) {
            console.error('Failed to fetch quality members', err);
        }
    };

    const fetchHiringManagers = async () => {
        try {
            const [allRes, activeRes] = await Promise.all([
                fetch(`${API_BASE}/api/hiring-managers`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${API_BASE}/api/hiring-managers/active`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
            ]);
            if (allRes.ok) setHiringManagers(await allRes.json());
            if (activeRes.ok) setActiveManagers(await activeRes.json());
        } catch {}
    };

    const assignManager = async (candidateId: string, hiringManagerId: string | null) => {
        try {
            const res = await fetch(`${API_BASE}/api/applications/${candidateId}/assign`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ hiringManagerId }),
            });
            if (res.ok) {
                const updated = await res.json();
                setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, hiringManagerId: updated.hiringManagerId, hiringManager: updated.hiringManager } : c));
                if (selectedCandidate?.id === candidateId) {
                    setSelectedCandidate(prev => prev ? { ...prev, hiringManagerId: updated.hiringManagerId, hiringManager: updated.hiringManager } : prev);
                }
            }
        } catch {}
    };

    const assignQuality = async (candidateId: string, qualityId: string | null) => {
        try {
            const res = await fetch(`${API_BASE}/api/applications/${candidateId}/assign-quality`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ qualityId }),
            });
            if (res.ok) {
                const updated = await res.json();
                setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, qualityTeamId: updated.qualityTeamId, qualityTeam: updated.qualityTeam } : c));
                if (selectedCandidate?.id === candidateId) {
                    setSelectedCandidate(prev => prev ? { ...prev, qualityTeamId: updated.qualityTeamId, qualityTeam: updated.qualityTeam } : prev);
                }
            }
        } catch {}
    };

    const createOrUpdateHm = async () => {
        setHmMsg(null);
        try {
            const url = editingHm
                ? `${API_BASE}/api/hiring-managers/${editingHm}`
                : `${API_BASE}/api/hiring-managers`;
            const method = editingHm ? 'PUT' : 'POST';
            const body: any = { 
                name: hmForm.name, 
                email: hmForm.email, 
                phone: hmForm.phone || undefined, 
                subject: hmForm.subject,
                isAutoAssignEnabled: hmForm.isAutoAssignEnabled
            };
            if (hmForm.password) body.password = hmForm.password;

            const res = await fetch(url, { 
                method, 
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }, 
                body: JSON.stringify(body) 
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Failed');
            }
            setHmMsg({ type: 'success', text: editingHm ? 'Updated successfully' : 'Hiring manager created' });
            setHmForm({ name: '', email: '', password: '', phone: '', subject: 'Coding', isAutoAssignEnabled: false });
            setEditingHm(null);
            setIsAddHmOpen(false);
            fetchHiringManagers();
        } catch (err: any) {
            setHmMsg({ type: 'error', text: err.message });
        }
    };

    const deactivateHm = async (id: string) => {
        if (!confirm('Deactivate this hiring manager?')) return;
        try {
            await fetch(`${API_BASE}/api/hiring-managers/${id}`, { 
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchHiringManagers();
        } catch {}
    };

    const fetchCandidateDetail = async (id: string) => {
        // Optimistically set partial data from list to animate instantly
        const partialData = candidates.find(c => c.id === id);
        if (partialData) setSelectedCandidate(partialData);
        setIsDetailLoading(true);

        try {
            const res = await fetch(`${API_BASE}/api/applications/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error(`API returned ${res.status}`);
            const data = await res.json();
            setSelectedCandidate(data);
        } catch {
            // If detail endpoint doesn't exist, we fallback to partial entirely.
        } finally {
            setIsDetailLoading(false);
        }
    };

    const updateStatus = async (id: string, newStatus: string, comment?: string): Promise<boolean> => {
        try {
            const res = await fetch(`${API_BASE}/api/applications/${id}/status`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus, comment })
            });
            if (res.ok) {
                setCandidates(candidates.map(c => c.id === id ? { ...c, status: newStatus as CandidateStatus, ...(comment ? { rejectionReason: comment } : {}) } : c));
                if (selectedCandidate?.id === id) {
                    setSelectedCandidate({
                        ...selectedCandidate,
                        status: newStatus as CandidateStatus,
                        ...(comment ? { rejectionReason: comment } : {}),
                    });
                }
                setRejectionComment('');
                return true;
            }
            return false;
        } catch (err) {
            console.error('Failed to update status', err);
            return false;
        }
    };

    const buildMockInterviewRejectionNote = (reason: 'not_connect' | 'not_interested' | 'other', extra: string) => {
        const labels: Record<typeof reason, string> = {
            not_connect: 'Not able to connect',
            not_interested: 'Not Interested',
            other: 'Other',
        };
        const base = `[Mock interview] ${labels[reason]}`;
        const t = extra.trim();
        return t ? `${base} — ${t}` : base;
    };

    const handleMockInterviewReject = async () => {
        if (!selectedCandidate?.id || !mockInterviewRejectReason) return;
        const note = buildMockInterviewRejectionNote(mockInterviewRejectReason, mockInterviewRejectComment);
        setMockInterviewRejectLoading(true);
        try {
            const ok = await updateStatus(selectedCandidate.id, 'REJECTED_FINAL', note);
            if (ok) {
                setMockInterviewRejectReason('');
                setMockInterviewRejectComment('');
                fetchCandidates();
            } else {
                alert('Failed to reject candidate. Please try again.');
            }
        } finally {
            setMockInterviewRejectLoading(false);
        }
    };

    const loadCutoffConfig = async (subj: string) => {
        setCutoffLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/admin/dashboard-config/${subj}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) {
                const data = await res.json();
                const c = data.qualityCutoffScores || {};
                setCutoffScores({
                    subjectKnowledge: c.subjectKnowledge ?? 5,
                    studentEngagement: c.studentEngagement ?? 5,
                    energyLevel: c.energyLevel ?? 5,
                    communication: c.communication ?? 5,
                });
            }
        } catch { /* ignore */ } finally { setCutoffLoading(false); }
    };

    const saveCutoffConfig = async () => {
        setCutoffSaving(true);
        try {
            const res = await fetch(`${API_BASE}/api/admin/dashboard-config`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ subject: cutoffSubject, qualityCutoffScores: cutoffScores }),
            });
            if (res.ok) alert(`Cutoff scores saved for ${cutoffSubject}`);
            else alert('Failed to save');
        } catch { alert('Network error'); } finally { setCutoffSaving(false); }
    };

    const sendReminder = async (id: string) => {
        setSendingReminder(true);
        try {
            const res = await fetch(`${API_BASE}/api/applications/${id}/send-reminder`, { 
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                await res.json();
                alert('Reminder sent successfully!');
                fetchCandidates();
                if (selectedCandidate?.id === id) {
                    const detailRes = await fetch(`${API_BASE}/api/applications/${id}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (detailRes.ok) setSelectedCandidate(await detailRes.json());
                }
            } else {
                const data = await res.json();
                alert(`Failed: ${data.message || 'Unknown error'}`);
            }
        } catch (err) {
            alert('Failed to send reminder');
        } finally {
            setSendingReminder(false);
        }
    };

    const fetchAudioQs = async (subject: string) => {
        try {
            const res = await fetch(`${API_BASE}/api/questions/audio/${subject}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setAudioQs(await res.json());
        } catch (err) {
            console.error(err);
        }
    };

    const handleCreateAq = async () => {
        if (!aqForm.questionText) return;
        setAqLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/questions/audio`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(aqForm),
            });
            if (res.ok) {
                setAqForm({ ...aqForm, questionText: '' });
                fetchAudioQs(aqForm.subject);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setAqLoading(false);
        }
    };

    const handleDeleteAq = async (id: string) => {
        if (!confirm('Delete this prompt?')) return;
        try {
            const res = await fetch(`${API_BASE}/api/questions/audio/${id}`, { 
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) fetchAudioQs(aqForm.subject);
        } catch (err) {
            console.error(err);
        }
    };

    const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setImportMsg(null);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch(`${API_BASE}/api/questions/import`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            const data = await res.json();
            if (res.ok) {
                setImportMsg({ type: 'success', text: `Successfully imported ${data.count} questions!` });
            } else {
                throw new Error(data.message || 'Import failed');
            }
        } catch (err: any) {
            setImportMsg({ type: 'error', text: err.message });
        } finally {
            setUploading(false);
            if (e.target) e.target.value = ''; // Reset input
        }
    };

    const clearAllQuestions = async () => {
        if (!confirm('Are you sure you want to delete ALL questions from the database?')) return;
        try {
            const res = await fetch(`${API_BASE}/api/questions/all`, { 
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setImportMsg({ type: 'success', text: 'All questions cleared successfully.' });
            }
        } catch (err: any) {
            setImportMsg({ type: 'error', text: 'Failed to clear questions.' });
        }
    };

    useEffect(() => {
        if (isAuthenticated && token) {
            fetchCandidates();
            if (isMasterAdmin) fetchHiringManagers();
            if (activeTab === 'QUALITY_TEAM' && isMasterAdmin) fetchQualityMembers();
        }
    }, [isAuthenticated, token, isMasterAdmin, activeTab]);

    const uniquePositions = Array.from(new Set(candidates.map(c => c.position))).sort();

    const positionCounts = candidates.reduce((acc, c) => {
        acc[c.position] = (acc[c.position] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const isQtReviewCompleted = (c: Candidate) => !!c.qualityReviewResult;
    const isQtReviewPending = (c: Candidate) => c.status === 'QUALITY_REVIEW_PENDING' && !c.qualityReviewResult;

    const filteredCandidates = candidates.filter(c => {
        const matchesSearch =
            `${c.firstName} ${c.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.position.toLowerCase().includes(searchTerm.toLowerCase());

        if (userRole === 'QUALITY_TEAM') {
            if (qtViewFilter === 'PENDING') return matchesSearch && isQtReviewPending(c);
            return matchesSearch && isQtReviewCompleted(c);
        }

        const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
        const matchesPosition = positionFilter === 'ALL' || c.position === positionFilter;
        return matchesSearch && matchesStatus && matchesPosition;
    });

    // Status counts scoped to the selected position
    const statusCounts = candidates
        .filter(c => positionFilter === 'ALL' || c.position === positionFilter)
        .reduce((acc, c) => {
            acc[c.status] = (acc[c.status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

    const isRejected = (status: string) => ['REJECTED', 'REJECTED_FORM', 'REJECTED_FINAL'].includes(status);
    const isSuccess = (status: string) => ['SELECTED'].includes(status);

    const getRejectionStage = (c: Candidate): string | null => {
        if (c.status !== 'REJECTED_FINAL') return null;
        if (c.qualityReviewResult === 'REJECTED') return 'Quality Review';
        if (c.rejectionReason?.trimStart().startsWith('[Mock interview]')) return 'Mock Interview';
        return 'Manual Review';
    };

    const handleAdminLogin = async () => {
        setLoginLoading(true);
        setLoginError('');
        try {
            const res = await fetch(`${API_BASE}/api/admin/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: loginEmail, password: loginPassword }),
            });
            
            if (res.status === 429) {
                throw new Error('Too many requests. Please try again after 15 minutes.');
            }

            const contentType = res.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Server returned an unexpected response. Please try again.');
            }

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Invalid credentials');
            
            setUserRole(data.role);
            setUserId(data.id || null);
            setUserName(data.name);
            setToken(data.access_token);
            setIsAuthenticated(true);
        } catch (err: any) {
            setLoginError(err.message || 'Login failed');
        } finally {
            setLoginLoading(false);
        }
    };

    const handleQbLogin = () => {
        if (qbPasswordInput === 'admin@questionbank') {
            setIsQuestionBankAuthenticated(true);
            setQbPasswordError('');
        } else {
            setQbPasswordError('Incorrect password');
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
                <Card className="w-full max-w-md p-8 space-y-8 shadow-2xl border-0 animate-in fade-in zoom-in duration-500">
                    <div className="text-center space-y-3">
                        <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-2 relative overflow-hidden">
                            <User className="w-8 h-8 text-primary-600" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Admin Portal</h1>
                        <p className="text-gray-500 font-medium">Please enter your credentials</p>
                    </div>
                    <div className="space-y-5">
                        <div className="space-y-2">
                            <Input
                                type="email"
                                placeholder="Email Address"
                                value={loginEmail}
                                onChange={e => setLoginEmail(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleAdminLogin(); }}
                                className="h-12 bg-gray-50/50"
                            />
                        </div>
                        <div className="space-y-2">
                            <Input
                                type="password"
                                placeholder={loginEmail.toLowerCase().includes('quality') ? "4-Digit PIN" : "Password"}
                                value={loginPassword}
                                onChange={e => setLoginPassword(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleAdminLogin(); }}
                                className="h-12 bg-gray-50/50 tracking-widest"
                                maxLength={loginEmail.toLowerCase().includes('quality') ? 4 : undefined}
                            />
                            {loginEmail.toLowerCase().includes('quality') && (
                                <p className="text-[10px] text-gray-400 text-center italic">Quality Team: Use your 4-digit security PIN</p>
                            )}
                            {loginError && <p className="text-red-500 text-sm font-medium pl-1">{loginError}</p>}
                        </div>
                        <Button className="w-full h-12 text-lg bg-primary-600 hover:bg-primary-700 shadow-md transition-all" onClick={handleAdminLogin} disabled={loginLoading}>
                            {loginLoading ? 'Signing in...' : 'Sign In'}
                        </Button>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex animate-in fade-in duration-500">
            {/* Sidebar */}
            <div className="w-64 bg-white border-r hidden md:flex flex-col">
                <div className="p-6 border-b">
                    <h1 className="text-xl font-bold text-gray-900">EdTech Admin</h1>
                    <p className="text-xs text-gray-500 mt-1">{userName} · {userRole === 'MASTER_ADMIN' ? 'Master Admin' : userRole === 'QUALITY_TEAM' ? 'Quality Team' : 'Hiring Manager'}</p>
                </div>
                <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
                    <Button
                        variant="ghost"
                        className={cn("w-full justify-start gap-3 transition-colors", activeTab === 'HOME' ? "bg-primary-50 text-primary-700 font-semibold" : "text-gray-600 hover:bg-gray-100")}
                        onClick={() => { setActiveTab('HOME'); }}
                    >
                        <Home className="w-5 h-5" />
                        Home
                    </Button>
                    
                    <div className="h-4" />

                    {/* Section: Candidates */}
                    {activeTab === 'CANDIDATES' && userRole === 'QUALITY_TEAM' && (
                        <>
                            <div className="px-3 pb-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Quality Review</div>
                            <Button
                                variant="ghost"
                                className={cn("w-full justify-start gap-3 transition-colors", qtViewFilter === 'PENDING' ? "bg-primary-50 text-primary-700 font-semibold" : "text-gray-600 hover:bg-gray-100")}
                                onClick={() => setQtViewFilter('PENDING')}
                            >
                                <ShieldCheck className="w-5 h-5" />
                                Pending Review
                                <span className="ml-auto text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">{candidates.filter(isQtReviewPending).length}</span>
                            </Button>
                            <Button
                                variant="ghost"
                                className={cn("w-full justify-start gap-3 transition-colors", qtViewFilter === 'COMPLETED' ? "bg-primary-50 text-primary-700 font-semibold" : "text-gray-600 hover:bg-gray-100")}
                                onClick={() => setQtViewFilter('COMPLETED')}
                            >
                                <CheckCircle2 className="w-5 h-5" />
                                Completed
                                <span className="ml-auto text-xs bg-gray-100 px-2 py-0.5 rounded-full">{candidates.filter(isQtReviewCompleted).length}</span>
                            </Button>
                        </>
                    )}

                    {activeTab === 'CANDIDATES' && userRole !== 'QUALITY_TEAM' && (
                        <>
                            <div className="px-3 pb-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Recruitment</div>
                            <Button
                                variant="ghost"
                                className={cn("w-full justify-start gap-3 transition-colors", positionFilter === 'ALL' && statusFilter === 'ALL' ? "bg-primary-50 text-primary-700 font-semibold" : "text-gray-600 hover:bg-gray-100")}
                                onClick={() => { setPositionFilter('ALL'); setStatusFilter('ALL'); }}
                            >
                                <User className="w-5 h-5" />
                                {isMasterAdmin ? 'All Candidates' : 'My Candidates'}
                                <span className="ml-auto text-xs bg-gray-100 px-2 py-0.5 rounded-full">{candidates.length}</span>
                            </Button>

                            <div className="h-4" />
                            <div className="px-3 pb-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Subjects</div>

                            {uniquePositions.map(pos => {
                                const posCount = positionCounts[pos] || 0;
                                const isActivePos = positionFilter === pos;
                                return (
                                    <div key={pos}>
                                        <Button
                                            variant="ghost"
                                            className={cn("w-full justify-start gap-3 text-sm", isActivePos ? "bg-primary-50 text-primary-700 font-semibold" : "text-gray-600")}
                                            onClick={() => {
                                                if (isActivePos) {
                                                    setPositionFilter('ALL');
                                                    setStatusFilter('ALL');
                                                } else {
                                                    setPositionFilter(pos);
                                                    setStatusFilter('ALL');
                                                }
                                            }}
                                        >
                                            <span className={cn("w-2.5 h-2.5 rounded-md", isActivePos ? "bg-primary-500" : "bg-gray-300")} />
                                            {pos}
                                            <span className="ml-auto text-xs bg-gray-100 px-2 py-0.5 rounded-full">{posCount}</span>
                                        </Button>

                                        {isActivePos && (
                                            <div className="ml-5 pl-3 border-l-2 border-primary-100 space-y-0.5 mt-1 mb-2">
                                                {Object.entries(statusConfig).map(([key, config]) => {
                                                    const count = statusCounts[key] || 0;
                                                    if (count === 0) return null;
                                                    return (
                                                        <Button
                                                            key={key}
                                                            variant="ghost"
                                                            className={cn("w-full justify-start gap-2 text-xs h-8", statusFilter === key ? "bg-primary-50 text-primary-700 font-medium" : "text-gray-500")}
                                                            onClick={() => {
                                                                setStatusFilter(statusFilter === key ? 'ALL' : key);
                                                            }}
                                                        >
                                                            <span className={cn("w-1.5 h-1.5 rounded-full", isRejected(key) ? "bg-red-500" : isSuccess(key) ? "bg-green-500" : "bg-blue-500")} />
                                                            {config.label}
                                                            <span className="ml-auto text-[10px] bg-gray-100 px-1.5 py-0.5 rounded-full">{count}</span>
                                                        </Button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </>
                    )}

                    {/* Section: Question Bank */}
                    {isMasterAdmin && activeTab === 'QUESTIONS' && (
                        <>
                            <div className="px-3 pb-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Assessments</div>
                            <Button
                                variant="ghost"
                                className="w-full justify-start gap-3 transition-colors bg-primary-50 text-primary-700 font-semibold"
                            >
                                <Database className="w-5 h-5" />
                                Question Bank
                            </Button>
                            <div className="ml-5 pl-3 border-l-2 border-primary-100 space-y-1 mt-2">
                                <Button variant="ghost" className={cn("w-full justify-start text-xs h-8 px-3", qbTab === 'MCQ' ? "bg-primary-50 text-primary-700 font-medium" : "text-gray-500")} onClick={() => setQbTab('MCQ')}>MCQ Bank</Button>
                                <Button variant="ghost" className={cn("w-full justify-start text-xs h-8 px-3", qbTab === 'AUDIO' ? "bg-primary-50 text-primary-700 font-medium" : "text-gray-500")} onClick={() => setQbTab('AUDIO')}>Audio Bank</Button>
                            </div>
                        </>
                    )}

                    {/* Section: Dashboard Config */}
                    {isMasterAdmin && activeTab === 'DASHBOARD_CONFIG' && (
                        <>
                            <div className="px-3 pb-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Configuration</div>
                            <Button
                                variant="ghost"
                                className="w-full justify-start gap-3 transition-colors bg-primary-50 text-primary-700 font-semibold"
                            >
                                <LayoutDashboard className="w-5 h-5" />
                                Dashboard Config
                            </Button>
                        </>
                    )}

                    {/* Section: Quality Cutoff */}
                    {isMasterAdmin && activeTab === 'QUALITY_CUTOFF' && (
                        <>
                            <div className="px-3 pb-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Quality Review</div>
                            <Button
                                variant="ghost"
                                className="w-full justify-start gap-3 transition-colors bg-primary-50 text-primary-700 font-semibold"
                            >
                                <ShieldCheck className="w-5 h-5" />
                                Cutoff Scores
                            </Button>
                        </>
                    )}

                    {/* Section: Team Management */}
                    {isMasterAdmin && activeTab === 'TEAM' && (
                        <>
                            <div className="px-3 pb-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Organization</div>
                            <Button
                                variant="ghost"
                                className="w-full justify-start gap-3 transition-colors bg-primary-50 text-primary-700 font-semibold"
                            >
                                <Users className="w-5 h-5" />
                                Team
                            </Button>
                            <div className="ml-5 pl-3 border-l-2 border-primary-100 space-y-1 mt-2">
                                <Button variant="ghost" className={cn("w-full justify-start text-xs h-8 px-3", teamTab === 'HIRING_MANAGERS' ? "bg-primary-50 text-primary-700 font-medium" : "text-gray-500")} onClick={() => setTeamTab('HIRING_MANAGERS')}>Hiring Managers</Button>
                                <Button variant="ghost" className={cn("w-full justify-start text-xs h-8 px-3", teamTab === 'QUALITY_TEAM' ? "bg-primary-50 text-primary-700 font-medium" : "text-gray-500")} onClick={() => setTeamTab('QUALITY_TEAM')}>Quality Team</Button>
                            </div>
                        </>
                    )}
                </nav>

                <div className="p-4 border-t space-y-2">
                    <Button variant="outline" className="w-full gap-2" onClick={fetchCandidates}>
                        <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                        Refresh
                    </Button>
                    <Button variant="ghost" className="w-full text-gray-500 text-xs" onClick={() => { setIsAuthenticated(false); setUserRole(null); setUserId(null); setLoginEmail(''); setLoginPassword(''); setCandidates([]); setActiveTab('CANDIDATES'); }}>
                        Sign Out
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className="bg-white border-b px-8 py-4 flex justify-between items-center text-sans">
                    <div>
                        <h2 className="text-2xl font-semibold text-gray-800">
                            {activeTab === 'HOME' ? 'Dashboard Overview' : activeTab === 'CANDIDATES' ? 'Candidates' : activeTab === 'TEAM' ? 'Team Management' : activeTab === 'HIRING_MANAGERS' ? 'Hiring Managers' : activeTab === 'DASHBOARD_CONFIG' ? 'Candidate Dashboard Configuration' : activeTab === 'QUALITY_CUTOFF' ? 'Quality Review Cutoffs' : 'Question Bank'}
                        </h2>
                        <p className="text-sm text-gray-500">
                            {activeTab === 'HOME' ? 'Navigate your modules' : activeTab === 'CANDIDATES' ? `${filteredCandidates.length} applicants in view` : activeTab === 'TEAM' ? 'Manage your organization\'s panels' : activeTab === 'HIRING_MANAGERS' ? 'Manage your hiring team' : activeTab === 'DASHBOARD_CONFIG' ? 'Map subject configurations' : activeTab === 'QUALITY_CUTOFF' ? 'Minimum pass scores per rubric per subject' : 'Manage your technical question pool'}
                        </p>
                    </div>
                    {activeTab === 'CANDIDATES' && (
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <Input
                                    className="pl-10 w-64 bg-gray-50 border-transparent focus:bg-white"
                                    placeholder="Search candidates..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    )}
                </header>

                <main className="flex-1 overflow-auto p-8 flex gap-8">
                    {/* List View */}
                    {activeTab === 'HOME' ? (
                        <div className="w-full max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700 p-4">
                            <div className="text-left space-y-1.5 mb-2">
                                <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Welcome, {userName.split(' ')[0]}!</h1>
                                <p className="text-sm md:text-base text-gray-500 font-medium">Select a module to manage your recruitment pipeline and assessment tools.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Card 
                                    className="group p-5 cursor-pointer hover:shadow-xl transition-all border-0 ring-1 ring-gray-100 hover:ring-primary-500/50 bg-white relative overflow-hidden" 
                                    onClick={() => { setActiveTab('CANDIDATES'); setPositionFilter('ALL'); setStatusFilter('ALL'); }}
                                >
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary-50 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500 opacity-50" />
                                    <div className="flex flex-col h-full relative z-10">
                                        <div className="p-3 bg-primary-100 text-primary-600 rounded-xl w-fit mb-4 group-hover:bg-primary-600 group-hover:text-white transition-colors duration-300">
                                            <User className="w-6 h-6" />
                                        </div>
                                        <h3 className="text-lg font-black text-gray-900 mb-2 group-hover:text-primary-700 transition-colors">{isMasterAdmin ? 'Candidate Pipeline' : 'My Candidates'}</h3>
                                        <p className="text-gray-500 text-sm leading-relaxed mb-4">Track applications, evaluate CVs, and manage candidates across hiring verticals.</p>
                                        <div className="mt-auto flex items-center text-primary-600 font-bold text-xs uppercase tracking-widest gap-2">
                                            Enter Module <span className="text-base group-hover:translate-x-2 transition-transform">→</span>
                                        </div>
                                    </div>
                                </Card>

                                {isMasterAdmin && (
                                    <>
                                        <Card 
                                            className="group p-5 cursor-pointer hover:shadow-xl transition-all border-0 ring-1 ring-gray-100 hover:ring-indigo-500/50 bg-white relative overflow-hidden" 
                                            onClick={() => setActiveTab('QUESTIONS')}
                                        >
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500 opacity-50" />
                                            <div className="flex flex-col h-full relative z-10">
                                                <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl w-fit mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                                                    <Database className="w-6 h-6" />
                                                </div>
                                                <h3 className="text-lg font-black text-gray-900 mb-2 group-hover:text-indigo-700 transition-colors">Question Bank</h3>
                                                <p className="text-gray-500 text-sm leading-relaxed mb-4">Manage the assessment pool for MCQ and audio-based interviews.</p>
                                                <div className="mt-auto flex items-center text-indigo-600 font-bold text-xs uppercase tracking-widest gap-2">
                                                    Manage Questions <span className="text-base group-hover:translate-x-2 transition-transform">→</span>
                                                </div>
                                            </div>
                                        </Card>

                                        <Card 
                                            className="group p-5 cursor-pointer hover:shadow-xl transition-all border-0 ring-1 ring-gray-100 hover:ring-emerald-500/50 bg-white relative overflow-hidden" 
                                            onClick={() => setActiveTab('DASHBOARD_CONFIG')}
                                        >
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500 opacity-50" />
                                            <div className="flex flex-col h-full relative z-10">
                                                <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl w-fit mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300">
                                                    <LayoutDashboard className="w-6 h-6" />
                                                </div>
                                                <h3 className="text-lg font-black text-gray-900 mb-2 group-hover:text-emerald-700 transition-colors">Dashboard Config</h3>
                                                <p className="text-gray-500 text-sm leading-relaxed mb-4">Configure subject-specific onboarding steps, prep links, and training materials.</p>
                                                <div className="mt-auto flex items-center text-emerald-600 font-bold text-xs uppercase tracking-widest gap-2">
                                                    Set Parameters <span className="text-base group-hover:translate-x-2 transition-transform">→</span>
                                                </div>
                                            </div>
                                        </Card>

                                        <Card 
                                            className="group p-5 cursor-pointer hover:shadow-xl transition-all border-0 ring-1 ring-gray-100 hover:ring-rose-500/50 bg-white relative overflow-hidden" 
                                            onClick={() => setActiveTab('QUALITY_CUTOFF')}
                                        >
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500 opacity-50" />
                                            <div className="flex flex-col h-full relative z-10">
                                                <div className="p-3 bg-rose-100 text-rose-600 rounded-xl w-fit mb-4 group-hover:bg-rose-600 group-hover:text-white transition-colors duration-300">
                                                    <ShieldCheck className="w-6 h-6" />
                                                </div>
                                                <h3 className="text-lg font-black text-gray-900 mb-2 group-hover:text-rose-700 transition-colors">Quality Cutoff Scores</h3>
                                                <p className="text-gray-500 text-sm leading-relaxed mb-4">Set minimum pass marks per rubric for the automated quality review decision engine.</p>
                                                <div className="mt-auto flex items-center text-rose-600 font-bold text-xs uppercase tracking-widest gap-2">
                                                    Configure <span className="text-base group-hover:translate-x-2 transition-transform">→</span>
                                                </div>
                                            </div>
                                        </Card>

                                        <Card 
                                            className="group p-5 cursor-pointer hover:shadow-xl transition-all border-0 ring-1 ring-gray-100 hover:ring-purple-500/50 bg-white relative overflow-hidden" 
                                            onClick={() => { setActiveTab('TEAM'); setTeamTab('HIRING_MANAGERS'); fetchHiringManagers(); fetchQualityMembers(); }}
                                        >
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500 opacity-50" />
                                            <div className="flex flex-col h-full relative z-10">
                                                <div className="p-3 bg-purple-100 text-purple-600 rounded-xl w-fit mb-4 group-hover:bg-purple-600 group-hover:text-white transition-colors duration-300">
                                                    <Users className="w-6 h-6" />
                                                </div>
                                                <h3 className="text-lg font-black text-gray-900 mb-2 group-hover:text-purple-700 transition-colors">Team Management</h3>
                                                <p className="text-gray-500 text-sm leading-relaxed mb-4">Organize panels, manage access, and assign subjects.</p>
                                                <div className="mt-auto flex items-center text-purple-600 font-bold text-xs uppercase tracking-widest gap-2">
                                                    Manage Team <span className="text-base group-hover:translate-x-2 transition-transform">→</span>
                                                </div>
                                            </div>
                                        </Card>
                                    </>
                                )}
                            </div>
                        </div>
                    ) : activeTab === 'CANDIDATES' ? (
                        <Card className="flex-1 flex flex-col min-h-0 bg-white">
                            {loading ? (
                                <div className="flex-1 flex items-center justify-center text-gray-400">
                                    <RefreshCw className="w-6 h-6 animate-spin mr-2" /> Loading candidates...
                                </div>
                            ) : error ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-red-500 gap-2">
                                    <AlertCircle className="w-8 h-8" />
                                    <p>{error}</p>
                                    <Button variant="outline" className="mt-2" onClick={fetchCandidates}>Retry</Button>
                                </div>
                            ) : (
                                <div className="overflow-auto flex-1">
                                    <table className="w-full text-left text-sm whitespace-nowrap">
                                        <thead className="bg-gray-50 text-gray-600 font-medium sticky top-0 shadow-sm">
                                            <tr>
                                                <th className="px-6 py-4">Candidate</th>
                                                <th className="px-6 py-4">Position</th>
                                                <th className="px-6 py-4">Experience</th>
                                                <th className="px-6 py-4">Status</th>
                                                {isMasterAdmin && <th className="px-6 py-4">Assigned To</th>}
                                                <th className="px-6 py-4">Reminder</th>
                                                <th className="px-6 py-4">Applied</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {filteredCandidates.map(candidate => {
                                                const sc = statusConfig[candidate.status] || { label: candidate.status, color: 'bg-gray-100 text-gray-800 border-gray-200' };
                                                return (
                                                    <tr
                                                        key={candidate.id}
                                                        onClick={() => fetchCandidateDetail(candidate.id)}
                                                        className={cn(
                                                            "cursor-pointer transition-colors hover:bg-gray-50",
                                                            selectedCandidate?.id === candidate.id ? "bg-primary-50 hover:bg-primary-50" : ""
                                                        )}
                                                    >
                                                        <td className="px-6 py-4">
                                                            <div className="font-medium text-gray-900">{candidate.firstName} {candidate.lastName}</div>
                                                            <div className="text-gray-500 text-xs mt-1">{candidate.email}</div>
                                                        </td>
                                                        <td className="px-6 py-4 text-gray-700">{candidate.position}</td>
                                                        <td className="px-6 py-4 text-gray-700">{candidate.experience}y</td>
                                                        <td className="px-6 py-4">
                                                            {userRole === 'QUALITY_TEAM' && isQtReviewCompleted(candidate) ? (
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-gray-100 text-gray-700 border-gray-200">
                                                                    Review Completed
                                                                </span>
                                                            ) : (
                                                                <div className="flex flex-col gap-1">
                                                                    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border", sc.color)}>
                                                                        {sc.label}
                                                                    </span>
                                                                    {getRejectionStage(candidate) && (
                                                                        <span className="text-[10px] text-red-500 font-semibold pl-1">
                                                                            at {getRejectionStage(candidate)}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </td>
                                                        {isMasterAdmin && (
                                                            <td className="px-6 py-4 text-gray-500 text-xs">
                                                                {candidate.hiringManager?.name || <span className="text-gray-300">Unassigned</span>}
                                                            </td>
                                                        )}
                                                        <td className="px-6 py-4 text-xs">
                                                            {candidate.status === 'TESTING' && candidate.assessments?.[0] ? (() => {
                                                                const a = candidate.assessments[0];
                                                                const count = a.reminderCount || 0;
                                                                return count > 0 ? (
                                                                    <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-medium">
                                                                        <Mail className="w-3 h-3" /> {count}x{a.lastReminderAt ? ` · ${toIST(a.lastReminderAt, true)}` : ''}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-gray-300">No reminder</span>
                                                                );
                                                            })() : <span className="text-gray-200">—</span>}
                                                        </td>
                                                        <td className="px-6 py-4 text-gray-500 text-xs">{toIST(candidate.createdAt)}</td>
                                                    </tr>
                                                );
                                            })}
                                            {filteredCandidates.length === 0 && (
                                                <tr>
                                                    <td colSpan={isMasterAdmin ? 7 : 6} className="px-6 py-12 text-center text-gray-500">
                                                        No candidates found.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </Card>
                    ) : activeTab === 'TEAM' && isMasterAdmin ? (
                        <div className="flex-1 flex flex-col space-y-6 min-h-0 w-full animate-in fade-in">
                            <div className="flex bg-gray-100 p-1.5 rounded-xl w-max border border-gray-200/60 shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)]">
                                <button 
                                  onClick={() => setTeamTab('HIRING_MANAGERS')} 
                                  className={cn("px-6 py-2.5 text-sm font-bold rounded-lg transition-all", teamTab === 'HIRING_MANAGERS' ? "bg-white text-gray-900 shadow-sm border border-gray-200/60" : "text-gray-500 hover:text-gray-700")}
                                >
                                  Hiring Managers
                                </button>
                                <button 
                                  onClick={() => setTeamTab('QUALITY_TEAM')} 
                                  className={cn("px-6 py-2.5 text-sm font-bold rounded-lg transition-all", teamTab === 'QUALITY_TEAM' ? "bg-white text-gray-900 shadow-sm border border-gray-200/60" : "text-gray-500 hover:text-gray-700")}
                                >
                                  Quality Team
                                </button>
                            </div>

                            {teamTab === 'HIRING_MANAGERS' ? (
                                <Card className="flex-1 flex flex-col bg-white p-8 space-y-8 overflow-hidden min-h-0">
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xl font-bold text-gray-900">{editingHm ? 'Edit Hiring Manager' : 'Add New Hiring Manager'}</h3>
                                    {!editingHm && (
                                        <Button 
                                            variant={isAddHmOpen ? "outline" : "default"} 
                                            size="sm" 
                                            onClick={() => setIsAddHmOpen(!isAddHmOpen)}
                                            className={cn(!isAddHmOpen && "bg-primary-600 hover:bg-primary-700")}
                                        >
                                            {isAddHmOpen ? 'Close Form' : 'Add Manager'}
                                        </Button>
                                    )}
                                </div>

                                {(isAddHmOpen || editingHm) && (
                                    <div className="max-w-2xl space-y-6 p-6 bg-gray-50 border rounded-2xl animate-in slide-in-from-top-4 duration-300">
                                        {hmMsg && <div className={`text-sm px-3 py-2 rounded ${hmMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{hmMsg.text}</div>}
                                        <div className="grid grid-cols-2 gap-4">
                                            <Input placeholder="Full Name" value={hmForm.name} onChange={e => setHmForm(f => ({ ...f, name: e.target.value }))} />
                                            <Input placeholder="Email" type="email" value={hmForm.email} onChange={e => setHmForm(f => ({ ...f, email: e.target.value }))} />
                                            <Input placeholder={editingHm ? 'New Password (leave blank to keep)' : 'Password'} type="password" value={hmForm.password} onChange={e => setHmForm(f => ({ ...f, password: e.target.value }))} />
                                            <Input placeholder="Phone (optional)" value={hmForm.phone} onChange={e => setHmForm(f => ({ ...f, phone: e.target.value }))} />
                                            <select 
                                                className="h-10 border border-input bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 rounded-md shadow-sm"
                                                value={hmForm.subject}
                                                onChange={e => setHmForm(f => ({ ...f, subject: e.target.value }))}
                                            >
                                                <option value="Coding">Coding</option>
                                                <option value="Math">Math</option>
                                                <option value="Science">Science</option>
                                                <option value="English">English</option>
                                                <option value="Robotics">Robotics</option>
                                                <option value="Financial Literacy">Financial Literacy</option>
                                                <option value="Rubik's Cube">Rubik's Cube</option>
                                                <option value="Chess">Chess</option>
                                            </select>
                                            <div className="flex items-center gap-3 px-3">
                                                <input 
                                                    type="checkbox" 
                                                    id="isAutoAssignEnabled"
                                                    className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                                                    checked={hmForm.isAutoAssignEnabled}
                                                    onChange={e => setHmForm(f => ({ ...f, isAutoAssignEnabled: e.target.checked }))}
                                                />
                                                <label htmlFor="isAutoAssignEnabled" className="text-sm font-medium text-gray-700 cursor-pointer">
                                                    Enable Auto-Assign (Round Robin)
                                                </label>
                                            </div>
                                        </div>
                                        <div className="flex gap-3">
                                            <Button onClick={createOrUpdateHm} className="bg-primary-600 hover:bg-primary-700">{editingHm ? 'Update' : 'Add Manager'}</Button>
                                            {(editingHm || isAddHmOpen) && <Button variant="outline" onClick={() => { setEditingHm(null); setIsAddHmOpen(false); setHmForm({ name: '', email: '', password: '', phone: '', subject: 'Coding', isAutoAssignEnabled: false }); }}>Cancel</Button>}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="border-t pt-6 flex-1 flex flex-col min-h-0">
                                <h3 className="text-lg font-bold text-gray-900 mb-4">All Hiring Managers</h3>
                                <div className="overflow-auto border rounded-xl shadow-sm">
                                    <table className="w-full text-sm">
                                    <thead><tr className="text-left text-gray-500 bg-gray-50"><th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Phone</th><th className="px-4 py-3">Subject</th><th className="px-4 py-3 text-center">Auto-Assign</th><th className="px-4 py-3">Candidates</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th></tr></thead>
                                    <tbody>
                                        {hiringManagers.map(hm => (
                                            <tr key={hm.id} className="border-t hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-3 font-medium">{hm.name}</td>
                                                <td className="px-4 py-3 text-gray-500">{hm.email}</td>
                                                <td className="px-4 py-3 text-gray-500">{hm.phone || '-'}</td>
                                                <td className="px-4 py-3 text-gray-700 font-medium">{hm.subject || 'Coding'}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <div className="flex justify-center">
                                                        <div className={cn("w-10 h-5 rounded-full relative transition-colors cursor-pointer", hm.isAutoAssignEnabled ? "bg-primary-600" : "bg-gray-200")}
                                                            onClick={async () => {
                                                                try {
                                                                    const res = await fetch(`${API_BASE}/api/hiring-managers/${hm.id}`, {
                                                                        method: 'PUT',
                                                                        headers: { 
                                                                            'Content-Type': 'application/json',
                                                                            'Authorization': `Bearer ${token}`
                                                                        },
                                                                        body: JSON.stringify({ isAutoAssignEnabled: !hm.isAutoAssignEnabled }),
                                                                    });
                                                                    if (res.ok) fetchHiringManagers();
                                                                } catch {}
                                                            }}
                                                        >
                                                            <div className={cn("absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform", hm.isAutoAssignEnabled ? "translate-x-5" : "")} />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">{hm.candidateCount || 0}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${hm.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                        {hm.isActive ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 flex gap-2">
                                                    <Button size="sm" variant="outline" onClick={() => { setEditingHm(hm.id); setHmForm({ name: hm.name, email: hm.email, password: '', phone: hm.phone || '', subject: hm.subject || 'Coding', isAutoAssignEnabled: !!hm.isAutoAssignEnabled }); }}>Edit</Button>
                                                    {hm.isActive && <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => deactivateHm(hm.id)}>Deactivate</Button>}
                                                </td>
                                            </tr>
                                        ))}
                                        {hiringManagers.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No hiring managers yet</td></tr>}
                                    </tbody>
                                </table>
                                </div>
                            </div>
                                </Card>
                            ) : (
                                <Card className="flex-1 flex flex-col bg-white">
                            <div className="p-6 border-b flex justify-between items-center text-sans">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-800">Quality Team Management</h3>
                                    <p className="text-sm text-gray-500 font-sans">Manage reviewers and their subject specialties</p>
                                </div>
                                <Button className="bg-primary-600 hover:bg-primary-700" onClick={() => { setIsAddQtOpen(!isAddQtOpen); setEditingQt(null); setQtForm({ name: '', email: '', pin: '', subject: 'Coding', isActive: true, isAutoAssignEnabled: false }); }}>
                                    {isAddQtOpen ? <XCircle className="w-4 h-4 mr-2" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                                    {isAddQtOpen ? 'Close Form' : 'Add Team Member'}
                                </Button>
                            </div>
                            <div className="flex-1 overflow-auto p-6 space-y-6">
                                {isAddQtOpen && (
                                    <div className="bg-gray-50 p-6 rounded-2xl border-2 border-primary-100 space-y-4 animate-in slide-in-from-top-4 duration-300">
                                        <h4 className="font-bold text-lg text-gray-800">{editingQt ? 'Edit Member' : 'Register New Quality Member'}</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-semibold text-gray-600 ml-1">Full Name</label>
                                                <Input placeholder="e.g. John Doe" value={qtForm.name} onChange={e => setQtForm({...qtForm, name: e.target.value})} />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-semibold text-gray-600 ml-1">Email Address</label>
                                                <Input placeholder="name@company.com" value={qtForm.email} onChange={e => setQtForm({...qtForm, email: e.target.value})} />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-semibold text-gray-600 ml-1">4-Digit Access PIN</label>
                                                <Input placeholder="xxxx" maxLength={4} value={qtForm.pin} onChange={e => setQtForm({...qtForm, pin: e.target.value})} />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-semibold text-gray-600 ml-1">Subject Specialty</label>
                                                <select className="flex h-11 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" value={qtForm.subject} onChange={e => setQtForm({...qtForm, subject: e.target.value})}>
                                                    <option value="Coding">Coding</option>
                                                    <option value="Math">Math</option>
                                                    <option value="Science">Science</option>
                                                    <option value="English">English</option>
                                                    <option value="Robotics">Robotics</option>
                                                    <option value="Financial Literacy">Financial Literacy</option>
                                                    <option value="Rubik's Cube">Rubik's Cube</option>
                                                    <option value="Chess">Chess</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 pt-1">
                                            <div className={cn("w-10 h-5 rounded-full relative transition-colors cursor-pointer", qtForm.isAutoAssignEnabled ? "bg-primary-600" : "bg-gray-200")}
                                                onClick={() => setQtForm({...qtForm, isAutoAssignEnabled: !qtForm.isAutoAssignEnabled})}
                                            >
                                                <div className={cn("absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform", qtForm.isAutoAssignEnabled ? "translate-x-5" : "")} />
                                            </div>
                                            <label className="text-sm font-medium text-gray-700 cursor-pointer" onClick={() => setQtForm({...qtForm, isAutoAssignEnabled: !qtForm.isAutoAssignEnabled})}>
                                                Enable Auto Assign
                                            </label>
                                        </div>
                                        <div className="flex justify-end gap-3 pt-2">
                                            <Button variant="ghost" onClick={() => setIsAddQtOpen(false)}>Cancel</Button>
                                            <Button className="bg-primary-600 hover:bg-primary-700 font-bold px-8" onClick={async () => {
                                                const url = editingQt ? `${API_BASE}/api/quality-team/${editingQt}` : `${API_BASE}/api/quality-team`;
                                                const method = editingQt ? 'PATCH' : 'POST';
                                                try {
                                                    const res = await fetch(url, {
                                                        method,
                                                        headers: { 
                                                            'Content-Type': 'application/json',
                                                            'Authorization': `Bearer ${token}`
                                                        },
                                                        body: JSON.stringify(qtForm),
                                                    });
                                                    if (res.ok) {
                                                        setQtMsg({ type: 'success', text: `Quality member ${editingQt ? 'updated' : 'added'} successfully` });
                                                        setIsAddQtOpen(false);
                                                        fetchQualityMembers();
                                                    } else {
                                                        const err = await res.json();
                                                        setQtMsg({ type: 'error', text: err.message || 'Something went wrong' });
                                                    }
                                                } catch {
                                                    setQtMsg({ type: 'error', text: 'Network error' });
                                                }
                                            }}>{editingQt ? 'Update' : 'Confirm'} Details</Button>
                                        </div>
                                        {qtMsg && <div className={cn("p-4 rounded-xl flex items-center gap-3", qtMsg.type === 'success' ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-700 border border-red-100")}>
                                            {qtMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                                            <span className="text-sm font-medium">{qtMsg.text}</span>
                                        </div>}
                                    </div>
                                )}
                                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                                    <table className="w-full text-left text-sm whitespace-nowrap">
                                        <thead className="bg-gray-50 border-b text-gray-500 font-semibold">
                                            <tr>
                                                <th className="px-6 py-4">Reviewer</th>
                                                <th className="px-6 py-4">Specialty</th>
                                                <th className="px-6 py-4 text-center">Auto Assign</th>
                                                <th className="px-6 py-4">Status</th>
                                                <th className="px-6 py-4">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {qualityMembers.map(m => (
                                                <tr key={m.id} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-bold">
                                                                {m.name.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-gray-900">{m.name}</div>
                                                                <div className="text-xs text-gray-500">{m.email}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 font-medium">{m.subject}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <div className="flex justify-center">
                                                            <div className={cn("w-10 h-5 rounded-full relative transition-colors cursor-pointer", m.isAutoAssignEnabled ? "bg-primary-600" : "bg-gray-200")}
                                                                onClick={async () => {
                                                                    try {
                                                                        const res = await fetch(`${API_BASE}/api/quality-team/${m.id}`, {
                                                                            method: 'PATCH',
                                                                            headers: { 
                                                                                'Content-Type': 'application/json',
                                                                                'Authorization': `Bearer ${token}`
                                                                            },
                                                                            body: JSON.stringify({ isAutoAssignEnabled: !m.isAutoAssignEnabled }),
                                                                        });
                                                                        if (res.ok) fetchQualityMembers();
                                                                    } catch {}
                                                                }}
                                                            >
                                                                <div className={cn("absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform", m.isAutoAssignEnabled ? "translate-x-5" : "")} />
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={cn("px-2.5 py-1 rounded-full text-xs font-bold", m.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500")}>
                                                            {m.isActive ? 'Active' : 'Inactive'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <Button size="sm" variant="outline" className="text-primary-700 border-primary-100 hover:bg-primary-50" onClick={() => { setEditingQt(m.id); setQtForm({ name: m.name, email: m.email, pin: '', subject: m.subject, isActive: m.isActive, isAutoAssignEnabled: m.isAutoAssignEnabled }); setIsAddQtOpen(true); }}>Edit</Button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {qualityMembers.length === 0 && <tr><td colSpan={5} className="p-12 text-center text-gray-400">No Quality Team members found. Click 'Add Team Member' to start.</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </Card>
                            )}
                        </div>
                    ) : activeTab === 'DASHBOARD_CONFIG' && isMasterAdmin ? (
                        <CandidateDashboardConfigView token={token} />
                    ) : activeTab === 'QUALITY_CUTOFF' && isMasterAdmin ? (
                        !cutoffAuthenticated ? (
                            <Card className="flex-1 flex flex-col items-center justify-center bg-white p-8">
                                <div className="w-full max-w-sm space-y-6 text-center">
                                    <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
                                        <ShieldCheck className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-gray-900">Quality Cutoff Configuration</h3>
                                        <p className="text-sm text-gray-500 mt-2">Enter the access password to manage quality review cutoff scores.</p>
                                    </div>
                                    <div className="space-y-3">
                                        <Input
                                            type="password"
                                            placeholder="Enter password"
                                            className="text-center h-12 text-lg tracking-widest"
                                            value={cutoffPasswordInput}
                                            onChange={e => { setCutoffPasswordInput(e.target.value); setCutoffPasswordError(''); }}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') {
                                                    if (cutoffPasswordInput === CUTOFF_PASSWORD) {
                                                        setCutoffAuthenticated(true);
                                                        setCutoffPasswordInput('');
                                                        loadCutoffConfig(cutoffSubject);
                                                    } else {
                                                        setCutoffPasswordError('Incorrect password');
                                                    }
                                                }
                                            }}
                                        />
                                        {cutoffPasswordError && <p className="text-red-500 text-sm font-medium">{cutoffPasswordError}</p>}
                                        <Button
                                            className="w-full bg-rose-600 hover:bg-rose-700 text-white h-11"
                                            onClick={() => {
                                                if (cutoffPasswordInput === CUTOFF_PASSWORD) {
                                                    setCutoffAuthenticated(true);
                                                    setCutoffPasswordInput('');
                                                    loadCutoffConfig(cutoffSubject);
                                                } else {
                                                    setCutoffPasswordError('Incorrect password');
                                                }
                                            }}
                                        >
                                            Unlock
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        ) : (
                            <Card className="flex-1 overflow-auto bg-white p-8">
                                <div className="max-w-3xl space-y-8 animate-in fade-in duration-300">
                                    <div className="flex justify-between items-center bg-gray-50 p-6 rounded-2xl border border-gray-100 shadow-sm">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center">
                                                <ShieldCheck className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">Quality Review — Cutoff Scores</h3>
                                                <p className="text-sm text-gray-500 font-medium mt-1">Candidates must score at or above these cutoffs (out of 10) on every rubric to be auto-selected.</p>
                                            </div>
                                        </div>
                                        <Button onClick={saveCutoffConfig} disabled={cutoffSaving} className="bg-rose-600 hover:bg-rose-700 shadow-md h-11 px-6">
                                            {cutoffSaving ? 'Saving…' : 'Save Cutoffs'}
                                        </Button>
                                    </div>

                                    <div className="space-y-4 max-w-sm">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Select Target Subject</label>
                                        <select
                                            className="w-full h-12 border-2 border-gray-200 rounded-xl px-4 font-semibold text-gray-800 bg-white hover:border-rose-300 focus:border-rose-500 focus:ring-0 outline-none transition-colors cursor-pointer shadow-sm"
                                            value={cutoffSubject}
                                            onChange={e => { setCutoffSubject(e.target.value); loadCutoffConfig(e.target.value); }}
                                        >
                                            {["Coding", "Math", "Science", "English", "Robotics", "Financial Literacy"].map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>

                                    {cutoffLoading ? (
                                        <div className="flex gap-2 items-center text-rose-600 font-medium p-4 justify-center bg-rose-50 rounded-xl animate-pulse">Loading…</div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                            {[
                                                { key: 'subjectKnowledge', label: 'Subject Knowledge' },
                                                { key: 'studentEngagement', label: 'Student Engagement' },
                                                { key: 'energyLevel', label: 'Energy & Confidence' },
                                                { key: 'communication', label: 'Communication' },
                                            ].map(param => (
                                                <div key={param.key} className="bg-gray-50/50 p-5 rounded-xl border border-gray-100 space-y-3">
                                                    <label className="text-xs font-bold text-gray-600 uppercase tracking-widest">{param.label}</label>
                                                    <Input
                                                        type="number"
                                                        min={1}
                                                        max={10}
                                                        className="h-12 bg-white max-w-[100px] font-bold text-center text-xl"
                                                        value={cutoffScores[param.key]}
                                                        onChange={e => {
                                                            const v = Math.min(10, Math.max(1, parseInt(e.target.value) || 1));
                                                            setCutoffScores({ ...cutoffScores, [param.key]: v });
                                                        }}
                                                    />
                                                    <p className="text-[10px] text-gray-400">Min score to pass: <strong>{cutoffScores[param.key]}</strong>/10</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </Card>
                        )
                    ) : activeTab === 'QUESTIONS' && isMasterAdmin ? (
                        !isQuestionBankAuthenticated ? (
                        <Card className="flex-1 flex flex-col items-center justify-center bg-white p-8">
                            <div className="max-w-md w-full space-y-6 text-center animate-in fade-in zoom-in duration-300">
                                <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 border-[6px] border-amber-50">
                                    <Database className="w-10 h-10 text-amber-600" />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900">Question Bank Vault</h2>
                                <p className="text-gray-500 text-sm leading-relaxed">This area contains sensitive assessment material and requires secondary authentication.</p>
                                <div className="space-y-4 mt-8 pt-6 border-t">
                                    <Input
                                        type="password"
                                        placeholder="Question Bank Password"
                                        value={qbPasswordInput}
                                        onChange={e => setQbPasswordInput(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') handleQbLogin();
                                        }}
                                        className="h-12 text-center bg-gray-50/50"
                                    />
                                    {qbPasswordError && <p className="text-red-500 text-sm font-medium">{qbPasswordError}</p>}
                                    <Button className="w-full h-12 text-lg bg-amber-600 hover:bg-amber-700 text-white shadow-md transition-all" onClick={handleQbLogin}>Unlock Access</Button>
                                </div>
                            </div>
                        </Card>
                    ) : (
                        <div className="flex-1 flex flex-col gap-6 animate-in fade-in duration-300">
                            <div className="flex gap-2 border-b border-gray-200 pb-2">
                                <Button 
                                    variant={qbTab === 'MCQ' ? 'default' : 'ghost'} 
                                    className={qbTab === 'MCQ' ? 'bg-primary-600 text-white' : 'text-gray-600'}
                                    onClick={() => setQbTab('MCQ')}
                                >
                                    Multiple Choice Questions (CSV)
                                </Button>
                                <Button 
                                    variant={qbTab === 'AUDIO' ? 'default' : 'ghost'} 
                                    className={qbTab === 'AUDIO' ? 'bg-primary-600 text-white' : 'text-gray-600'}
                                    onClick={() => { setQbTab('AUDIO'); fetchAudioQs(aqForm.subject); }}
                                >
                                    Audio Interview Questions
                                </Button>
                            </div>

                            {qbTab === 'MCQ' ? (
                                <>
                                    <Card className="bg-white p-8 space-y-8">
                                        <div className="max-w-xl space-y-4">
                                            <h3 className="text-xl font-bold text-gray-900">Import MCQ Question Bank</h3>
                                            <p className="text-sm text-gray-600">
                                                Upload a CSV file to populate your technical pool. The file should have columns for:
                                                <code className="block mt-2 p-2 bg-gray-50 rounded text-xs text-primary-700 font-mono">
                                                    #, Category, Difficulty, Question, Option A, Option B, Option C, Option D, Correct Answer
                                                </code>
                                            </p>
                                        </div>

                                        <div className="grid sm:grid-cols-2 gap-8 items-start">
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-center w-full">
                                                    <label className={cn(
                                                        "flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-2xl cursor-pointer transition-all",
                                                        uploading ? "bg-gray-100 border-gray-300" : "bg-primary-50/30 border-primary-200 hover:bg-primary-50"
                                                    )}>
                                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                            <FileUp className={cn("w-10 h-10 mb-3", uploading ? "text-gray-400 animate-bounce" : "text-primary-600")} />
                                                            <p className="mb-2 text-sm text-gray-700">
                                                                <span className="font-bold">Click to upload MCQ CSV</span>
                                                            </p>
                                                            <p className="text-xs text-gray-500">Only CSV files are supported</p>
                                                        </div>
                                                        <input type="file" className="hidden" accept=".csv" onChange={handleCsvUpload} disabled={uploading} />
                                                    </label>
                                                </div>

                                                {importMsg && (
                                                    <div className={cn(
                                                        "p-4 rounded-xl flex items-center gap-3 transition-all animate-in fade-in slide-in-from-top-2",
                                                        importMsg.type === 'success' ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-700 border border-red-100"
                                                    )}>
                                                        {importMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
                                                        <span className="text-sm font-medium">{importMsg.text}</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100 space-y-4">
                                                <h4 className="font-bold text-amber-900 flex items-center gap-2">
                                                    <Database className="w-4 h-4" />
                                                    Database Actions
                                                </h4>
                                                <p className="text-xs text-amber-800 leading-relaxed">
                                                    Importing new questions will add them to the existing pool. If you want to replace the entire bank, clear the database first.
                                                </p>
                                                <Button
                                                    variant="outline"
                                                    className="w-full justify-start gap-3 border-amber-200 text-amber-900 hover:bg-amber-100 font-bold"
                                                    onClick={clearAllQuestions}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                    Clear All Questions
                                                </Button>
                                            </div>
                                        </div>
                                    </Card>

                                    <Card className="bg-white p-6">
                                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">CSV Template Preview</h3>
                                        <div className="bg-gray-900 rounded-xl p-4 text-gray-300 font-mono text-xs overflow-x-auto whitespace-pre">
                                            {"# Header Row Required\n#,Category,Difficulty,Question,Option A,Option B,Option C,Option D,Correct Answer\n1,Python,easy,\"Output of 2**3?\",6,8,9,16,8\n2,JavaScript,medium,\"Which is not a data type?\",String,Boolean,Number,Float,Float"}
                                        </div>
                                    </Card>
                                </>
                            ) : (
                                <Card className="bg-white p-8 space-y-8">
                                    <div className="max-w-xl space-y-4">
                                        <h3 className="text-xl font-bold text-gray-900">Audio Assessment Prompts</h3>
                                        <p className="text-sm text-gray-600">
                                            Manage the subject-specific audio questions. One active question per subject will be randomly selected along with the global intro question.
                                        </p>
                                    </div>
                                    <div className="grid sm:grid-cols-3 gap-6">
                                        <div className="sm:col-span-1 space-y-4 bg-gray-50 border border-gray-200 rounded-xl p-4">
                                           <h4 className="font-bold text-gray-800">Add New Prompt</h4>
                                           <select 
                                               className="w-full text-sm border-gray-300 rounded-lg p-2"
                                               value={aqForm.subject}
                                               onChange={e => {
                                                   setAqForm({...aqForm, subject: e.target.value});
                                                   fetchAudioQs(e.target.value);
                                               }}
                                           >
                                               <option value="Coding">Coding</option>
                                               <option value="Math">Math</option>
                                               <option value="Science">Science</option>
                                               <option value="English">English</option>
                                               <option value="Robotics">Robotics</option>
                                               <option value="Financial Literacy">Financial Literacy</option>
                                           </select>
                                           <textarea
                                               className="w-full text-sm border-gray-300 rounded-lg p-2"
                                               placeholder="Type the question prompt..."
                                               rows={3}
                                               value={aqForm.questionText}
                                               onChange={e => setAqForm({...aqForm, questionText: e.target.value})}
                                           />
                                           <Button 
                                               className="w-full bg-primary-600" 
                                               disabled={aqLoading || !aqForm.questionText}
                                               onClick={handleCreateAq}
                                           >
                                               {aqLoading ? 'Adding...' : 'Add Prompt'}
                                           </Button>
                                        </div>
                                        <div className="sm:col-span-2 space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h4 className="font-bold text-gray-800">Current Prompts for {aqForm.subject}</h4>
                                                <Button size="sm" variant="outline" onClick={() => fetchAudioQs(aqForm.subject)}><RefreshCw className="w-4 h-4 mr-2"/> Refresh</Button>
                                            </div>
                                            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                                                {audioQs.length === 0 ? (
                                                    <div className="text-center p-8 bg-gray-50 rounded-xl text-gray-500 border border-dashed border-gray-300">
                                                        No audio prompts configured for this subject yet.
                                                    </div>
                                                ) : (
                                                    audioQs.map(q => (
                                                        <div key={q.id} className="flex items-start justify-between p-4 bg-white border border-gray-200 shadow-sm rounded-xl">
                                                            <div className="pr-4">
                                                                <p className="text-sm font-medium text-gray-900">{q.questionText}</p>
                                                                <p className="text-xs text-gray-400 mt-1">Added {new Date(q.createdAt).toLocaleDateString()}</p>
                                                            </div>
                                                            <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-50 hover:text-red-700" onClick={() => handleDeleteAq(q.id)}>
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            )}
                        </div>
                        )
                    ) : null}

                    {/* Overlay Detail View for selected Candidate */}
                    {activeTab === 'CANDIDATES' && (
                        selectedCandidate ? (
                            <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
                                <div className="w-3/4 h-full bg-white shadow-2xl flex relative animate-in slide-in-from-right duration-500">
                                    {/* Left Panel - 25% */}
                                    <div className="w-1/4 h-full bg-gray-50 border-r border-gray-200 flex flex-col overflow-y-auto">
                                        <div className="p-6 space-y-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-16 h-16 rounded-full bg-primary-100 flex-shrink-0 flex items-center justify-center text-primary-700 text-2xl font-bold border-2 border-primary-200">
                                                    {selectedCandidate.firstName.charAt(0)}
                                                </div>
                                                <div className="overflow-hidden">
                                                    <h3 className="text-xl font-bold text-gray-900 truncate">{selectedCandidate.firstName} {selectedCandidate.lastName}</h3>
                                                    <p className="text-sm text-gray-500 truncate">{selectedCandidate.email}</p>
                                                    <p className="text-sm text-gray-500 truncate">{selectedCandidate.phone}</p>
                                                </div>
                                            </div>

                                            <div className="flex gap-2 flex-wrap">
                                                <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border", (statusConfig[selectedCandidate.status] || {}).color || '')}>
                                                    {(statusConfig[selectedCandidate.status] || {}).label || selectedCandidate.status}
                                                </span>
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border bg-white text-gray-600">
                                                    {selectedCandidate.position}
                                                </span>
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border bg-white text-gray-600">
                                                    {selectedCandidate.experience}y exp
                                                </span>
                                                {selectedCandidate.currentLocation && (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border bg-white text-gray-600">
                                                        {selectedCandidate.currentLocation}
                                                    </span>
                                                )}
                                            </div>

                                            {selectedCandidate.cvDriveLink && (
                                                <Button
                                                    variant="outline"
                                                    className="w-full justify-center gap-2 border-primary-200 text-primary-700 hover:bg-primary-50 font-semibold"
                                                    onClick={() => {
                                                        let cvUrl = selectedCandidate.cvDriveLink!;
                                                        if (cvUrl.startsWith('http://localhost')) {
                                                            cvUrl = cvUrl.replace(/^http:\/\/localhost:\d+/, API_BASE);
                                                        }
                                                        window.open(cvUrl, '_blank');
                                                    }}
                                                >
                                                    <FileUp className="w-4 h-4" />
                                                    View CV
                                                </Button>
                                            )}

                                            <div className="space-y-4 pt-6 border-t border-gray-200">
                                                {isMasterAdmin && (
                                                    <div className="space-y-4">
                                                        <div>
                                                            <label className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-1 block">Subject Vertical</label>
                                                            <select
                                                                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary-300"
                                                                value={selectedCandidate.position}
                                                                onChange={async (e) => {
                                                                    const newPosition = e.target.value;
                                                                    try {
                                                                        const res = await fetch(`${API_BASE}/api/applications/${selectedCandidate.id}/position`, {
                                                                            method: 'POST',
                                                                            headers: { 
                                                                                'Content-Type': 'application/json',
                                                                                'Authorization': `Bearer ${token}`
                                                                            },
                                                                            body: JSON.stringify({ position: newPosition }),
                                                                        });
                                                                        if (res.ok) {
                                                                            setSelectedCandidate({ ...selectedCandidate, position: newPosition });
                                                                            fetchCandidates();
                                                                        }
                                                                    } catch {}
                                                                }}
                                                            >
                                                                <option value="Coding">Coding</option>
                                                                <option value="Math">Math</option>
                                                                <option value="Science">Science</option>
                                                                <option value="English">English</option>
                                                                <option value="Robotics">Robotics</option>
                                                                <option value="Financial Literacy">Financial Literacy</option>
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-1 block">Assign To</label>
                                                            <select
                                                                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary-300"
                                                                value={selectedCandidate.hiringManagerId || ''}
                                                                onChange={e => assignManager(selectedCandidate.id, e.target.value || null)}
                                                            >
                                                                <option value="">Unassigned</option>
                                                                {activeManagers.map(m => (
                                                                    <option key={m.id} value={m.id}>{m.name}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-1 block">Quality Team</label>
                                                            <select
                                                                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary-300"
                                                                value={selectedCandidate.qualityTeamId || ''}
                                                                onChange={e => assignQuality(selectedCandidate.id, e.target.value || null)}
                                                            >
                                                                <option value="">Unassigned</option>
                                                                {qualityMembers.map(m => (
                                                                    <option key={m.id} value={m.id}>{m.name}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Panel - 75% */}
                                    <div className="flex-1 h-full flex flex-col bg-white relative">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 z-10"
                                            onClick={() => setSelectedCandidate(null)}
                                        >
                                            <XCircle className="w-6 h-6" />
                                        </Button>

                                        <div className="px-8 pt-6 border-b border-gray-200 flex gap-6">
                                            {userRole !== 'QUALITY_TEAM' ? (
                                                [
                                                    { id: 'ASSESSMENT', label: 'Assessment' },
                                                    { id: 'MOCK_INTERVIEW', label: 'Mock Interview' },
                                                    { id: 'EMAILS', label: 'Emails' },
                                                    { id: 'TIMELINE', label: 'Timeline' }
                                                ].map(tab => (
                                                    <button
                                                        key={tab.id}
                                                        className={cn("pb-3 text-sm font-bold border-b-2 transition-colors", activeDetailTab === tab.id ? "border-primary-600 text-primary-600" : "border-transparent text-gray-500 hover:text-gray-700")}
                                                        onClick={() => setActiveDetailTab(tab.id as any)}
                                                    >
                                                        {tab.label}
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="pb-3 text-sm font-bold border-b-2 border-primary-600 text-primary-600 uppercase tracking-widest">
                                                    Quality Performance Assessment
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 overflow-y-auto relative p-8 max-w-4xl space-y-8">
                                            {isDetailLoading && (
                                                <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-xl animate-in fade-in duration-200">
                                                    <RefreshCw className="w-8 h-8 text-primary-500 animate-spin mb-4" />
                                                </div>
                                            )}
                                            {activeDetailTab === 'ASSESSMENT' && (
                                                <>
                                                    {selectedCandidate.motivation && (() => {
                                                        const whyLine = selectedCandidate.motivation.split('\n').find(l => l.startsWith('Why teach with us:'));
                                                        const answer = whyLine ? whyLine.replace('Why teach with us:', '').trim() : selectedCandidate.motivation;
                                                        return (
                                                            <div className="space-y-3">
                                                                <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Candidate Motivation</h4>
                                                                <div className="bg-blue-50 border border-blue-100 p-5 rounded-xl text-sm">
                                                                    <div className="text-blue-600 text-xs font-bold mb-2 uppercase tracking-wider">Why teach with us?</div>
                                                                    <div className="text-blue-900 leading-relaxed text-base">{answer}</div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}

                                    {/* Assessment Status for TESTING candidates */}
                                    {selectedCandidate.status === 'TESTING' && selectedCandidate.assessments && selectedCandidate.assessments.length > 0 && (() => {
                                        const a = selectedCandidate.assessments[0];
                                        const isExpired = a.expiresAt ? new Date() > new Date(a.expiresAt) : false;
                                        const isStarted = !!a.startedAt;
                                        const statusLabel = isExpired ? 'Expired' : isStarted ? 'In Progress' : 'Not Started';
                                        const statusColor = isExpired ? 'text-red-600 bg-red-50 border-red-200' : isStarted ? 'text-amber-600 bg-amber-50 border-amber-200' : 'text-gray-600 bg-gray-50 border-gray-200';
                                        const iconColor = isExpired ? 'text-red-500' : isStarted ? 'text-amber-500' : 'text-gray-400';

                                        return (
                                            <div className="space-y-3">
                                                <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Assessment Status</h4>
                                                <div className={cn("border rounded-xl p-4 space-y-3", statusColor)}>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <Clock className={cn("w-5 h-5", iconColor)} />
                                                            <span className="font-bold text-sm">{statusLabel}</span>
                                                        </div>
                                                        <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium border", statusColor)}>
                                                            {a.status}
                                                        </span>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                                        <div>
                                                            <span className="text-gray-500">Sent:</span>{' '}
                                                            <span className="font-medium">{toIST(a.createdAt, true)}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-500">Expires:</span>{' '}
                                                            <span className="font-medium">{a.expiresAt ? toIST(a.expiresAt, true) : '—'}</span>
                                                        </div>
                                                        {a.startedAt && (
                                                            <div className="col-span-2">
                                                                <span className="text-gray-500">Started:</span>{' '}
                                                                <span className="font-medium">{toIST(a.startedAt!, true)}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-3 text-xs bg-white/60 rounded-lg px-3 py-2 border border-gray-100">
                                                        <div className="flex items-center gap-1.5">
                                                            <Mail className="w-3.5 h-3.5 text-gray-400" />
                                                            <span className="text-gray-500">Reminders sent:</span>
                                                            <span className="font-bold text-gray-800">{a.reminderCount || 0}</span>
                                                        </div>
                                                        {a.lastReminderAt && (
                                                            <div className="border-l pl-3">
                                                                <span className="text-gray-500">Last:</span>{' '}
                                                                <span className="font-medium text-gray-700">{toIST(a.lastReminderAt, true)}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <Button
                                                        variant="outline"
                                                        className="w-full gap-2 border-primary-200 text-primary-700 hover:bg-primary-50 font-semibold text-sm"
                                                        onClick={() => sendReminder(selectedCandidate.id)}
                                                        disabled={sendingReminder}
                                                    >
                                                        <Mail className="w-4 h-4" />
                                                        {sendingReminder ? 'Sending...' : isExpired ? 'Resend Link (extends 72hrs)' : 'Send Reminder'}
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* Admin Actions for TESTING candidates */}
                                    {selectedCandidate.status === 'TESTING' && (
                                        <div className="border border-orange-200 bg-orange-50 p-4 rounded-xl space-y-3">
                                            <h4 className="text-sm font-semibold text-orange-800 uppercase tracking-wider">Admin Actions</h4>
                                            <div className="space-y-2">
                                                <label className="text-xs font-medium text-gray-700">Rejection Comment <span className="text-red-500">*</span></label>
                                                <textarea
                                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400 min-h-[80px]"
                                                    placeholder="Mandatory: Provide reason for rejection..."
                                                    value={rejectionComment}
                                                    onChange={e => setRejectionComment(e.target.value)}
                                                />
                                            </div>
                                            <div className="flex gap-3">
                                                <Button
                                                    variant="outline"
                                                    className="w-full border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 border-2 font-semibold"
                                                    disabled={!rejectionComment.trim()}
                                                    onClick={() => updateStatus(selectedCandidate.id, 'REJECTED_FINAL', rejectionComment.trim())}
                                                >
                                                    <XCircle className="w-4 h-4 mr-1" />
                                                    Reject Candidate
                                                </Button>
                                            </div>
                                            {!rejectionComment.trim() && (
                                                <p className="text-[11px] text-red-500">* Comment is required to reject a candidate</p>
                                            )}
                                        </div>
                                    )}

                                    {/* MCQ Assessment */}
                                    {selectedCandidate.assessments && selectedCandidate.assessments.length > 0 && (
                                        <div className="space-y-3">
                                            <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">MCQ Assessment</h4>
                                            {selectedCandidate.assessments.map((a: Assessment) => (
                                                <div key={a.id} className="bg-white border rounded-xl overflow-hidden">
                                                    <div className="grid grid-cols-2 divide-x">
                                                        <div className="text-center p-4">
                                                            <div className={cn("text-2xl font-bold", (a.mcqScore ?? 0) >= 60 ? "text-green-600" : "text-red-600")}>{a.mcqScore ?? '—'}%</div>
                                                            <div className="text-xs text-gray-500 mt-1">Score</div>
                                                        </div>
                                                        <div className="text-center p-4">
                                                            <div className="text-lg font-bold text-gray-900">{a.topic || '—'}</div>
                                                            <div className="text-xs text-gray-500 mt-1">Topic</div>
                                                        </div>
                                                    </div>
                                                    {a.mcqQuestions && a.mcqQuestions.length > 0 && (
                                                        <details className="border-t">
                                                            <summary className="px-4 py-2.5 text-xs font-semibold text-gray-600 cursor-pointer hover:bg-gray-50">
                                                                View {a.mcqQuestions.length} Questions
                                                            </summary>
                                                            <div className="px-4 pb-3 space-y-3 max-h-64 overflow-auto">
                                                                {a.mcqQuestions.map((q: McqQuestion, qi: number) => (
                                                                    <div key={q.id} className="text-xs border-t pt-2">
                                                                        <div className="flex gap-2">
                                                                            <span className="text-gray-400 font-mono">{qi + 1}.</span>
                                                                            <div>
                                                                                <p className="font-medium text-gray-800 whitespace-pre-line">{q.questionText}</p>
                                                                                <div className="mt-1 space-y-0.5">
                                                                                    {q.options.map((opt: string, oi: number) => (
                                                                                        <div key={oi} className={cn(
                                                                                            "px-2 py-0.5 rounded",
                                                                                            opt === q.correctAnswer ? "bg-green-100 text-green-800 font-medium" : "text-gray-600"
                                                                                        )}>
                                                                                            {String.fromCharCode(65 + oi)}. {opt}
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                                <span className={cn(
                                                                                    "inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium",
                                                                                    q.difficulty === 'easy' ? "bg-green-50 text-green-700" : q.difficulty === 'hard' ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"
                                                                                )}>
                                                                                    {q.difficulty}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </details>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Communication Skills */}
                                    {selectedCandidate.assessments && selectedCandidate.assessments.some((a: Assessment) => a.introAudioDriveLink || a.audioDriveLink) && (
                                        <div className="space-y-4">
                                            <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Communication Skills</h4>
                                            {selectedCandidate.assessments.map((a: Assessment) => {
                                                const prompts = Array.isArray(a.audioPrompts) ? a.audioPrompts : [];
                                                const introText =
                                                    displayAudioPromptText(prompts[0]?.prompt) || 'Tell me about yourself';
                                                const subjectText =
                                                    displayAudioPromptText(prompts[1]?.prompt) ||
                                                    `Please explain a fundamental concept of ${selectedCandidate.position} to a beginner. (Prompt not stored for this assessment.)`;
                                                return (
                                                <div key={`comm-${a.id}`} className="space-y-3">
                                                    {a.introAudioDriveLink && (
                                                        <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl space-y-2">
                                                            {prompts[0]?.label && (
                                                                <div className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">{prompts[0].label}</div>
                                                            )}
                                                            <div className="text-indigo-800 text-sm font-semibold">Q: {introText}</div>
                                                            <audio controls className="w-full h-8" src={a.introAudioDriveLink.startsWith('http://localhost') ? a.introAudioDriveLink.replace(/^http:\/\/localhost:\d+/, API_BASE) : a.introAudioDriveLink}>
                                                                Your browser does not support the audio element.
                                                            </audio>
                                                        </div>
                                                    )}
                                                    {a.audioDriveLink && (
                                                        <div className="bg-purple-50 border border-purple-100 p-4 rounded-xl space-y-2">
                                                            {prompts[1]?.label && (
                                                                <div className="text-xs font-semibold text-purple-600 uppercase tracking-wide">{prompts[1].label}</div>
                                                            )}
                                                            <div className="text-purple-800 text-sm font-semibold">Q: {subjectText}</div>
                                                            <audio controls className="w-full h-8" src={a.audioDriveLink.startsWith('http://localhost') ? a.audioDriveLink.replace(/^http:\/\/localhost:\d+/, API_BASE) : a.audioDriveLink}>
                                                                Your browser does not support the audio element.
                                                            </audio>
                                                        </div>
                                                    )}
                                                </div>
                                                );
                                            })}

                                            {['AUDIO_PROCESSING', 'MANUAL_REVIEW', 'AUDIO_FAILED'].includes(selectedCandidate.status) && (
                                                <div className="border border-gray-200 bg-white p-4 rounded-xl space-y-3">
                                                    <p className="text-xs text-gray-500">Based on the candidate's communication skills, make your decision:</p>
                                                    <div className="flex gap-3">
                                                        <Button
                                                            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                                            onClick={() => updateStatus(selectedCandidate.id, 'SELECTED')}
                                                        >
                                                            <CheckCircle2 className="w-4 h-4 mr-1" />
                                                            Select Candidate
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            className="flex-1 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 border-2"
                                                            onClick={() => updateStatus(selectedCandidate.id, 'REJECTED_FINAL')}
                                                        >
                                                            <XCircle className="w-4 h-4 mr-1" />
                                                            Reject Candidate
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Admin Actions – show only for candidates who cleared Stage 1 + MCQ */}
                                    {['AUDIO_PROCESSING', 'MANUAL_REVIEW', 'AUDIO_FAILED'].includes(selectedCandidate.status) && (
                                        <div className={cn(
                                            "border p-4 rounded-xl space-y-3",
                                            selectedCandidate.status === 'MANUAL_REVIEW' ? "bg-yellow-50 border-yellow-200" : "bg-gray-50 border-gray-200"
                                         )}>
                                             <h4 className="text-sm font-semibold text-gray-800 uppercase tracking-wider">Admin Actions</h4>
                                             <div className="flex gap-3">
                                                 <Button
                                                     className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                                     onClick={() => updateStatus(selectedCandidate.id, 'SELECTED')}
                                                 >
                                                     <CheckCircle2 className="w-4 h-4 mr-1" />
                                                     Select
                                                 </Button>
                                                 <Button
                                                     variant="outline"
                                                     className="flex-1 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 border-2"
                                                     onClick={() => updateStatus(selectedCandidate.id, 'REJECTED_FINAL')}
                                                 >
                                                     <XCircle className="w-4 h-4 mr-1" />
                                                     Reject
                                                 </Button>
                                             </div>
                                         </div>
                                     )}
                                     </>
                                )}

                                        {userRole !== 'QUALITY_TEAM' && activeDetailTab === 'MOCK_INTERVIEW' && (
                                            <>
                                                {mockInterviewTabLoading && (
                                                    <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
                                                        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                                                        Loading mock interview…
                                                    </div>
                                                )}
                                                {/* Mock Interview Scheduling */}
                                                <div className={cn('space-y-4 mb-8', mockInterviewTabLoading && 'opacity-50 pointer-events-none')}>
                                                    <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                                                        {candidateMockInterview?.status === 'SCHEDULED' ? 'Reschedule Mock Interview' : 'Schedule Mock Interview'}
                                                    </h4>
                                                    <div className="bg-gray-50 border border-gray-200 p-5 rounded-xl space-y-4">
                                                        {candidateMockInterview?.status === 'SCHEDULED' && (
                                                            <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded-lg text-sm flex items-center gap-3">
                                                                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                                                                <div>
                                                                    <strong>Currently Scheduled</strong>
                                                                    <span className="ml-1">
                                                                        {new Date(candidateMockInterview.scheduledAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'long', timeStyle: 'short' })} IST
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        )}
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="space-y-2">
                                                                <label className="text-xs font-bold text-gray-600">Date <span className="text-gray-400 font-normal">(IST)</span></label>
                                                                <Input type="date" value={mockInterviewDate} onChange={e => setMockInterviewDate(e.target.value)} disabled={mockInterviewTabLoading || mockInterviewScheduleSaving} />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="text-xs font-bold text-gray-600">Time <span className="text-gray-400 font-normal">(IST)</span></label>
                                                                <Input type="time" value={mockInterviewTime} onChange={e => setMockInterviewTime(e.target.value)} disabled={mockInterviewTabLoading || mockInterviewScheduleSaving} />
                                                            </div>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-xs font-bold text-gray-600">Meeting Link</label>
                                                            <Input placeholder="https://meet.google.com/..." value={mockInterviewLinkInput} onChange={e => setMockInterviewLinkInput(e.target.value)} disabled={mockInterviewTabLoading || mockInterviewScheduleSaving} />
                                                        </div>
                                                        <Button
                                                            size="sm"
                                                            className={cn(
                                                                "text-white w-full sm:w-auto",
                                                                candidateMockInterview?.status === 'SCHEDULED'
                                                                    ? "bg-orange-600 hover:bg-orange-700"
                                                                    : "bg-primary-600 hover:bg-primary-700"
                                                            )}
                                                            disabled={mockInterviewTabLoading || mockInterviewScheduleSaving || qualityReviewLinkSubmitting}
                                                            onClick={async () => {
                                                                if (!mockInterviewDate || !mockInterviewTime || !mockInterviewLinkInput) return alert('Fill all fields');
                                                                const isReschedule = !!candidateMockInterview?.status;
                                                                if (isReschedule && !confirm('This will reschedule the existing interview and notify the candidate with new details. Continue?')) return;
                                                                const dt = `${mockInterviewDate}T${mockInterviewTime}:00+05:30`;
                                                                setMockInterviewScheduleSaving(true);
                                                                try {
                                                                    const res = await fetch(`${API_BASE}/api/applications/${selectedCandidate.id}/mock-interview`, {
                                                                        method: 'POST',
                                                                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                                                        body: JSON.stringify({ scheduledAt: dt, meetingLink: mockInterviewLinkInput, isReschedule })
                                                                    });
                                                                    if (res.ok) {
                                                                        alert(isReschedule ? 'Interview rescheduled! Updated invites sent.' : 'Interview Scheduled!');
                                                                        const miRes = await fetch(`${API_BASE}/api/applications/${selectedCandidate.id}/mock-interview`, { headers: { 'Authorization': `Bearer ${token}` } });
                                                                        if (miRes.ok) {
                                                                            const data = await miRes.json();
                                                                            setCandidateMockInterview(data);
                                                                            setSelectedCandidate(prev => (prev ? { ...prev, mockInterview: data } : prev));
                                                                        }
                                                                    }
                                                                } catch {
                                                                    alert('Failed to schedule interview');
                                                                } finally {
                                                                    setMockInterviewScheduleSaving(false);
                                                                }
                                                            }}
                                                        >
                                                            {mockInterviewScheduleSaving ? (
                                                                <>
                                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                                    {candidateMockInterview?.status === 'SCHEDULED' ? 'Rescheduling…' : 'Scheduling…'}
                                                                </>
                                                            ) : (
                                                                candidateMockInterview?.status === 'SCHEDULED' ? 'Reschedule Interview' : 'Save & Schedule'
                                                            )}
                                                        </Button>
                                                    </div>
                                                </div>

                                            {(selectedCandidate.status === 'SELECTED' || selectedCandidate.status === 'QUALITY_REVIEW_PENDING') && (
                                                <div className={cn('border border-red-200 bg-red-50/50 p-5 rounded-xl space-y-4 mb-8', (mockInterviewTabLoading || mockInterviewScheduleSaving) && 'opacity-50 pointer-events-none')}>
                                                    <h4 className="text-sm font-semibold text-red-900 uppercase tracking-wider">Admin actions</h4>
                                                    <p className="text-xs text-gray-600 leading-relaxed">Reject the candidate from the mock interview stage. The candidate receives the standard final rejection email; the reason is stored on their record.</p>
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-bold text-gray-700">Reason <span className="text-red-500">*</span></label>
                                                        <select
                                                            className="w-full max-w-md h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
                                                            value={mockInterviewRejectReason}
                                                            onChange={(e) => setMockInterviewRejectReason(e.target.value as 'not_connect' | 'not_interested' | 'other' | '')}
                                                            disabled={mockInterviewRejectLoading}
                                                        >
                                                            <option value="">Select a reason…</option>
                                                            <option value="not_connect">Not able to connect</option>
                                                            <option value="not_interested">Not Interested</option>
                                                            <option value="other">Other</option>
                                                        </select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-bold text-gray-700">Comment <span className="text-gray-500 font-normal">(optional)</span></label>
                                                        <textarea
                                                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-200 min-h-[80px]"
                                                            placeholder="Add any extra context (recommended if you chose Other)…"
                                                            value={mockInterviewRejectComment}
                                                            onChange={(e) => setMockInterviewRejectComment(e.target.value)}
                                                            disabled={mockInterviewRejectLoading}
                                                        />
                                                    </div>
                                                    <Button
                                                        variant="outline"
                                                        className="border-red-300 text-red-800 hover:bg-red-100 border-2 font-semibold"
                                                        disabled={!mockInterviewRejectReason || mockInterviewRejectLoading}
                                                        onClick={() => void handleMockInterviewReject()}
                                                    >
                                                        {mockInterviewRejectLoading ? (
                                                            <>
                                                                <Loader2 className="w-4 h-4 mr-2 animate-spin shrink-0" />
                                                                Rejecting…
                                                            </>
                                                        ) : (
                                                            <>
                                                                <XCircle className="w-4 h-4 mr-2 shrink-0" />
                                                                Reject candidate
                                                            </>
                                                        )}
                                                    </Button>
                                                </div>
                                            )}

                                            {/* Quality Review Submission (Hiring Manager / Master Admin) */}
                                            {(isMasterAdmin || userRole === 'HIRING_MANAGER') && (selectedCandidate.status === 'SELECTED' || selectedCandidate.status === 'QUALITY_REVIEW_PENDING') && (
                                                <div className="space-y-3 pt-4 border-t border-gray-100">
                                                    <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                                                        <ShieldCheck className="w-4 h-4 text-orange-600" />
                                                        Quality Review Submission
                                                    </h4>
                                                    <div className="bg-orange-50/50 border border-orange-100 p-4 rounded-xl space-y-4 shadow-sm">
                                                        <div className="space-y-2">
                                                            <label className="text-xs font-bold text-gray-600">Review/Recording URL</label>
                                                            <Input 
                                                                placeholder="Paste link here..." 
                                                                value={selectedCandidate.qualityReviewLink || ''}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    setSelectedCandidate({...selectedCandidate, qualityReviewLink: val});
                                                                }}
                                                                className="bg-white h-9 text-sm border-orange-200 focus:ring-orange-500"
                                                                disabled={qualityReviewLinkSubmitting || mockInterviewScheduleSaving}
                                                            />
                                                        </div>
                                                        <Button
                                                            size="sm"
                                                            className="bg-orange-600 hover:bg-orange-700 text-white w-full sm:w-auto"
                                                            disabled={qualityReviewLinkSubmitting || mockInterviewScheduleSaving || mockInterviewTabLoading}
                                                            onClick={async () => {
                                                                if (!selectedCandidate.qualityReviewLink) return alert('Please provide a review link');
                                                                setQualityReviewLinkSubmitting(true);
                                                                try {
                                                                    const res = await fetch(`${API_BASE}/api/applications/${selectedCandidate.id}/quality-review-submit`, {
                                                                        method: 'POST',
                                                                        headers: { 
                                                                            'Content-Type': 'application/json',
                                                                            'Authorization': `Bearer ${token}`
                                                                        },
                                                                        body: JSON.stringify({ link: selectedCandidate.qualityReviewLink }),
                                                                    });
                                                                    if (res.ok) {
                                                                        alert('Submitted for Quality Review! Status updated.');
                                                                        fetchCandidates();
                                                                        const detailRes = await fetch(`${API_BASE}/api/applications/${selectedCandidate.id}`, { headers: { 'Authorization': `Bearer ${token}` } });
                                                                        if (detailRes.ok) setSelectedCandidate(await detailRes.json());
                                                                    } else {
                                                                        alert('Failed to submit link.');
                                                                    }
                                                                } catch {
                                                                    alert('Network error');
                                                                } finally {
                                                                    setQualityReviewLinkSubmitting(false);
                                                                }
                                                            }}
                                                        >
                                                            {qualityReviewLinkSubmitting ? (
                                                                <>
                                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                                    Submitting…
                                                                </>
                                                            ) : (
                                                                selectedCandidate.status === 'QUALITY_REVIEW_PENDING' ? 'Update Link' : 'Submit for Quality Review'
                                                            )}
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}

                                        </>
                                    )}

                                    {/* Focused Quality Review View (Quality Team Role Only) */}
                                    {userRole === 'QUALITY_TEAM' && (
                                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
                                            {/* Header Card: Mock Interview Link */}
                                            <div className="bg-orange-50 border border-orange-200 rounded-3xl p-8 space-y-6 shadow-sm">
                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                                    <div className="flex items-center gap-5">
                                                        <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center shadow-inner">
                                                            <Video className="w-7 h-7 text-orange-600" />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <h4 className="text-lg font-bold text-gray-900">Virtual Mock Interview</h4>
                                                            <p className="text-sm text-orange-700 font-semibold flex items-center gap-2">
                                                                <Clock className="w-4 h-4" />
                                                                {selectedCandidate.mockInterview?.scheduledAt 
                                                                    ? `${new Date(selectedCandidate.mockInterview.scheduledAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'long', timeStyle: 'short' })} IST`
                                                                    : 'Not scheduled yet'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    {selectedCandidate.qualityReviewLink && (
                                                        <Button
                                                            size="sm"
                                                            className="bg-orange-600 hover:bg-orange-700 text-white shrink-0"
                                                            onClick={() => window.open(selectedCandidate.qualityReviewLink!, '_blank')}
                                                        >
                                                            Watch Recording
                                                            <ExternalLink className="w-3.5 h-3.5" />
                                                        </Button>
                                                    )}
                                                </div>
                                                
                                                {!selectedCandidate.qualityReviewLink && (
                                                    <div className="bg-white/60 p-4 rounded-2xl border border-orange-100 flex items-center gap-3 text-sm">
                                                        <div className="w-2 h-2 bg-gray-300 rounded-full" />
                                                        <span className="font-medium text-gray-500">No recording uploaded yet</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Rubric Section */}
                                            <div className="space-y-6">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="text-sm font-bold text-gray-900 uppercase tracking-widest flex items-center gap-3">
                                                        <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                                                        Quality Assessment Rubric
                                                    </h4>
                                                    <span className="text-xs font-bold text-gray-400">SCORE: 1 TO 10</span>
                                                </div>
                                                
                                                <div className="grid grid-cols-1 gap-5">
                                                    {[
                                                        { id: 'subjectKnowledge', label: 'Subject Knowledge', desc: 'Understanding of core concepts' },
                                                        { id: 'studentEngagement', label: 'Student Engagement', desc: 'Ability to keep students active' },
                                                        { id: 'energyLevel', label: 'Energy & Confidence', desc: 'Classroom presence' },
                                                        { id: 'communication', label: 'Communication', desc: 'Clarity and articulation' },
                                                    ].map(rubric => {
                                                        const currentScore = selectedCandidate.qualityReviewScore?.[rubric.id] || 0;
                                                        const isCompleted = isQtReviewCompleted(selectedCandidate);
                                                        return (
                                                        <div key={rubric.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4 hover:border-yellow-200 transition-colors group">
                                                            <div className="flex items-center justify-between">
                                                                <div>
                                                                    <label className="text-sm font-bold text-gray-800 block">{rubric.label}</label>
                                                                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">{rubric.desc}</p>
                                                                </div>
                                                                <span className={cn("text-lg font-black tabular-nums", currentScore > 0 ? "text-yellow-600" : "text-gray-300")}>{currentScore || '–'}<span className="text-xs text-gray-400 font-medium">/10</span></span>
                                                            </div>
                                                            <div className="flex gap-1.5">
                                                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                                                                    <button
                                                                        key={n}
                                                                        type="button"
                                                                        disabled={!!qualityFinalizeLoading || isCompleted}
                                                                        onClick={() => {
                                                                            const newScores = { ...selectedCandidate.qualityReviewScore, [rubric.id]: n };
                                                                            setSelectedCandidate({...selectedCandidate, qualityReviewScore: newScores});
                                                                        }}
                                                                        className={cn(
                                                                            "flex-1 h-9 rounded-lg flex items-center justify-center transition-all border text-xs font-bold disabled:opacity-60 disabled:pointer-events-none",
                                                                            currentScore >= n
                                                                                ? "bg-yellow-400 border-yellow-400 text-white shadow-sm"
                                                                                : "bg-gray-50 border-gray-100 text-gray-400 hover:border-yellow-200 hover:bg-yellow-50 hover:text-yellow-600"
                                                                        )}
                                                                    >
                                                                        {n}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Comments Section */}
                                            <div className="space-y-4">
                                                <label className="text-sm font-bold text-gray-900 uppercase tracking-widest">Review Comments</label>
                                                <textarea
                                                    placeholder="Provide detailed feedback on the candidate's performance..."
                                                    className="w-full min-h-[120px] rounded-xl border-gray-200 bg-gray-50 p-4 text-sm focus:ring-primary-500 focus:bg-white shadow-inner transition-all disabled:opacity-50"
                                                    value={qualityReviewComment}
                                                    onChange={e => setQualityReviewComment(e.target.value)}
                                                    disabled={!!qualityFinalizeLoading || isQtReviewCompleted(selectedCandidate)}
                                                />
                                            </div>

                                            {/* Action Bar — single "Done" CTA; backend auto-decides pass/reject */}
                                            {!isQtReviewCompleted(selectedCandidate) && (
                                            <div className="z-20">
                                                <Button
                                                    className="w-full sm:w-auto bg-primary-600 hover:bg-primary-700 text-white"
                                                    disabled={!!qualityFinalizeLoading}
                                                    onClick={async () => {
                                                        const scores = selectedCandidate.qualityReviewScore;
                                                        const rubricKeys = ['subjectKnowledge', 'studentEngagement', 'energyLevel', 'communication'];
                                                        const missing = rubricKeys.filter(k => !scores?.[k]);
                                                        if (missing.length > 0) {
                                                            alert('Please score ALL 4 categories before submitting.');
                                                            return;
                                                        }
                                                        setQualityFinalizeLoading('pass');
                                                        try {
                                                            const res = await fetch(`${API_BASE}/api/applications/${selectedCandidate.id}/quality-review-finalize`, {
                                                                method: 'POST',
                                                                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                                                body: JSON.stringify({
                                                                    qualityId: userId,
                                                                    scores: { ...scores, comment: qualityReviewComment },
                                                                })
                                                            });
                                                            if (res.ok) {
                                                                alert('Review submitted! Candidate outcome has been auto-determined based on cutoff scores.');
                                                                setSelectedCandidate(null);
                                                                setQualityReviewComment('');
                                                                fetchCandidates();
                                                            } else {
                                                                alert('Failed to submit review. Please try again.');
                                                            }
                                                        } catch {
                                                            alert('Network error');
                                                        } finally {
                                                            setQualityFinalizeLoading(null);
                                                        }
                                                    }}
                                                >
                                                    {qualityFinalizeLoading === 'pass' ? (
                                                        <>
                                                            <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
                                                            Submitting…
                                                        </>
                                                    ) : (
                                                        <>
                                                            <CheckCircle2 className="w-4 h-4 mr-2" />
                                                            Done
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                            )}
                                        </div>
                                    )}

                                {userRole !== 'QUALITY_TEAM' && activeDetailTab === 'EMAILS' && (
                                    <div className="space-y-4">
                                        <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Email History</h4>
                                        {candidateEmails.length === 0 ? (
                                            <p className="text-sm text-gray-500">No emails logged for this candidate.</p>
                                        ) : (
                                            candidateEmails.map(email => (
                                                <div key={email.id} className="border border-gray-200 rounded-xl p-4 space-y-2">
                                                    <div className="flex justify-between items-start">
                                                        <h5 className="font-bold text-gray-800 text-sm">{email.subject}</h5>
                                                        <span className="text-xs text-gray-500">{new Date(email.sentAt).toLocaleString()}</span>
                                                    </div>
                                                    <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100 overflow-x-auto" dangerouslySetInnerHTML={{ __html: email.body }} />
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}

                                {userRole !== 'QUALITY_TEAM' && activeDetailTab === 'TIMELINE' && (
                                    <div className="space-y-4">
                                        <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-6 pl-10 md:pl-0 md:text-center shrink-0">Journey Timeline</h4>
                                        <div className="relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent pt-4">
                                            {candidateTimeline.length === 0 ? (
                                                <p className="text-sm text-gray-500 text-center relative z-10">No events found.</p>
                                            ) : (
                                                candidateTimeline.map(event => (
                                                    <div key={event.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group mb-8">
                                                        <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-200 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 relative z-10">
                                                            <Clock className="w-4 h-4" />
                                                        </div>
                                                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-xl border border-gray-200 shadow-sm relative z-10 hover:border-primary-300 transition-colors">
                                                            <div className="flex items-center justify-between space-x-2 mb-1">
                                                                <div className="font-bold text-slate-900 text-sm">{event.action}</div>
                                                                <time className="text-xs text-slate-400">{new Date(event.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</time>
                                                            </div>
                                                            <div className="text-slate-600 text-sm mt-2">{event.description}</div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Status badge — view-only for final decisions */}
                                    {selectedCandidate.status === 'SELECTED' && (
                                        <div className="bg-green-50 border border-green-200 p-4 rounded-xl text-center">
                                            <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                                            <p className="text-green-800 font-bold">Final Status: Selected</p>
                                        </div>
                                    )}
                                    {selectedCandidate.status === 'REJECTED_FINAL' && (
                                        <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-center space-y-2">
                                            <XCircle className="w-8 h-8 text-red-500 mx-auto" />
                                            <p className="text-red-800 font-bold">Final Status: Rejected</p>
                                            {getRejectionStage(selectedCandidate) && (
                                                <p className="text-red-500 text-xs font-semibold uppercase tracking-wide">Stage: {getRejectionStage(selectedCandidate)}</p>
                                            )}
                                            {selectedCandidate.rejectionReason && (
                                                <p className="text-red-600 text-sm">Reason: {selectedCandidate.rejectionReason}</p>
                                            )}
                                        </div>
                                    )}
                                    {selectedCandidate.status === 'REJECTED_FORM' && (
                                        <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-center space-y-2">
                                            <XCircle className="w-8 h-8 text-red-400 mx-auto" />
                                            <p className="text-red-700 font-bold">Rejected at Application Stage</p>
                                            {selectedCandidate.rejectionReason && (
                                                <p className="text-red-600 text-sm">Reason: {selectedCandidate.rejectionReason}</p>
                                            )}
                                        </div>
                                    )}

                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : null
                    )}
                </main>
            </div>
        </div>
    );
}
