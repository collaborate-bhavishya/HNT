import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/utils';
import { Search, User, XCircle, RefreshCw, AlertCircle } from 'lucide-react';
import { Input } from '../components/ui/Input';

const API_BASE = import.meta.env.VITE_API_URL || 'https://hnt.onrender.com';

type CandidateStatus = 'APPLIED' | 'REJECTED' | 'AI_SCORING' | 'REJECTED_FORM' | 'TESTING' | 'AUDIO_PROCESSING' | 'SELECTED' | 'MANUAL_REVIEW' | 'REJECTED_FINAL' | 'AUDIO_FAILED';

interface Candidate {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    position: string;
    experience: number;
    expectedSalary: number | null;
    currentLocation: string | null;
    cvDriveLink: string | null;
    cvText: string | null;
    motivation: string | null;
    status: CandidateStatus;
    rejectionReason: string | null;
    layer1Score: number | null;
    aiMotivationScore: number | null;
    aiCvScore: number | null;
    applicationScore: number | null;
    finalScore: number | null;
    createdAt: string;
    updatedAt: string;
    assessments?: Assessment[];
}

interface Assessment {
    id: string;
    status: string;
    mcqScore: number | null;
    audioScore: number | null;
    finalScore: number | null;
    audioDriveLink: string | null;
    aiSpeechRawScores: any;
    aiSpeechTranscript: string | null;
    completedAt: string | null;
    createdAt: string;
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
};

export default function AdminDashboard() {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('ALL');

    const fetchCandidates = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE}/api/applications`);
            if (!res.ok) throw new Error(`API returned ${res.status}`);
            const data = await res.json();
            setCandidates(data);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch candidates');
        } finally {
            setLoading(false);
        }
    };

    const fetchCandidateDetail = async (id: string) => {
        try {
            const res = await fetch(`${API_BASE}/api/applications/${id}`);
            if (!res.ok) throw new Error(`API returned ${res.status}`);
            const data = await res.json();
            setSelectedCandidate(data);
        } catch {
            // If detail endpoint doesn't exist, use list data
            const c = candidates.find(c => c.id === id);
            if (c) setSelectedCandidate(c);
        }
    };

    useEffect(() => {
        fetchCandidates();
    }, []);

    const filteredCandidates = candidates.filter(c => {
        const matchesSearch =
            `${c.firstName} ${c.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.position.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const statusCounts = candidates.reduce((acc, c) => {
        acc[c.status] = (acc[c.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const isRejected = (status: string) => ['REJECTED', 'REJECTED_FORM', 'REJECTED_FINAL'].includes(status);
    const isSuccess = (status: string) => ['SELECTED'].includes(status);

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <div className="w-64 bg-white border-r hidden md:flex flex-col">
                <div className="p-6 border-b">
                    <h1 className="text-xl font-bold text-gray-900">EdTech Admin</h1>
                    <p className="text-xs text-gray-500 mt-1">Teacher Hiring Pipeline</p>
                </div>
                <nav className="p-4 space-y-1 flex-1">
                    <Button
                        variant="ghost"
                        className={cn("w-full justify-start gap-3", statusFilter === 'ALL' ? "bg-primary-50 text-primary-700" : "text-gray-600")}
                        onClick={() => setStatusFilter('ALL')}
                    >
                        <User className="w-5 h-5" />
                        All Candidates
                        <span className="ml-auto text-xs bg-gray-100 px-2 py-0.5 rounded-full">{candidates.length}</span>
                    </Button>
                    {Object.entries(statusConfig).map(([key, config]) => {
                        const count = statusCounts[key] || 0;
                        if (count === 0) return null;
                        return (
                            <Button
                                key={key}
                                variant="ghost"
                                className={cn("w-full justify-start gap-3 text-sm", statusFilter === key ? "bg-primary-50 text-primary-700" : "text-gray-600")}
                                onClick={() => setStatusFilter(key)}
                            >
                                <span className={cn("w-2 h-2 rounded-full", isRejected(key) ? "bg-red-500" : isSuccess(key) ? "bg-green-500" : "bg-blue-500")} />
                                {config.label}
                                <span className="ml-auto text-xs bg-gray-100 px-2 py-0.5 rounded-full">{count}</span>
                            </Button>
                        );
                    })}
                </nav>
                <div className="p-4 border-t">
                    <Button variant="outline" className="w-full gap-2" onClick={fetchCandidates}>
                        <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className="bg-white border-b px-8 py-4 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-semibold text-gray-800">Candidates</h2>
                        <p className="text-sm text-gray-500">{filteredCandidates.length} of {candidates.length} candidates</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <Input
                                className="pl-10 w-64 bg-gray-50 border-transparent focus:bg-white"
                                placeholder="Search by name, email, position..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-auto p-8 flex gap-8">
                    {/* List View */}
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
                            <>
                                <div className="overflow-auto flex-1">
                                    <table className="w-full text-left text-sm whitespace-nowrap">
                                        <thead className="bg-gray-50 text-gray-600 font-medium sticky top-0 shadow-sm">
                                            <tr>
                                                <th className="px-6 py-4">Candidate</th>
                                                <th className="px-6 py-4">Position</th>
                                                <th className="px-6 py-4">Experience</th>
                                                <th className="px-6 py-4">App Score</th>
                                                <th className="px-6 py-4">Final Score</th>
                                                <th className="px-6 py-4">Status</th>
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
                                                            {candidate.applicationScore != null ? (
                                                                <span className={cn("font-medium", candidate.applicationScore >= 6 ? "text-green-600" : "text-red-600")}>
                                                                    {candidate.applicationScore.toFixed(1)}
                                                                </span>
                                                            ) : <span className="text-gray-400">—</span>}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            {candidate.finalScore != null ? (
                                                                <span className={cn("font-bold", candidate.finalScore >= 75 ? "text-green-600" : candidate.finalScore >= 60 ? "text-yellow-600" : "text-red-600")}>
                                                                    {candidate.finalScore.toFixed(1)}
                                                                </span>
                                                            ) : <span className="text-gray-400">—</span>}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border", sc.color)}>
                                                                {sc.label}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-gray-500 text-xs">{new Date(candidate.createdAt).toLocaleDateString()}</td>
                                                    </tr>
                                                );
                                            })}
                                            {filteredCandidates.length === 0 && (
                                                <tr>
                                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                                        No candidates found.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </Card>

                    {/* Detail View */}
                    {selectedCandidate ? (
                        <Card className="w-[480px] shadow-lg flex flex-col animate-in slide-in-from-right-8 duration-300">
                            <CardHeader className="border-b bg-gray-50 relative pb-4">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
                                    onClick={() => setSelectedCandidate(null)}
                                >
                                    <XCircle className="w-5 h-5" />
                                </Button>
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-2xl font-bold border-2 border-primary-200">
                                        {selectedCandidate.firstName.charAt(0)}
                                    </div>
                                    <div>
                                        <CardTitle className="text-xl">{selectedCandidate.firstName} {selectedCandidate.lastName}</CardTitle>
                                        <CardDescription>{selectedCandidate.email}</CardDescription>
                                    </div>
                                </div>
                                <div className="mt-4 flex gap-2 flex-wrap">
                                    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border", (statusConfig[selectedCandidate.status] || {}).color || '')}>
                                        {(statusConfig[selectedCandidate.status] || {}).label || selectedCandidate.status}
                                    </span>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border bg-white text-gray-600">
                                        {selectedCandidate.position}
                                    </span>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border bg-white text-gray-600">
                                        {selectedCandidate.experience}y exp
                                    </span>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6 space-y-6 flex-1 overflow-auto">
                                {/* Application Info */}
                                <div className="space-y-3">
                                    <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Application Details</h4>
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div className="bg-gray-50 p-3 rounded-lg">
                                            <div className="text-gray-500 text-xs">Phone</div>
                                            <div className="font-medium">{selectedCandidate.phone}</div>
                                        </div>
                                        <div className="bg-gray-50 p-3 rounded-lg">
                                            <div className="text-gray-500 text-xs">Location</div>
                                            <div className="font-medium">{selectedCandidate.currentLocation || '—'}</div>
                                        </div>
                                        <div className="bg-gray-50 p-3 rounded-lg">
                                            <div className="text-gray-500 text-xs">Salary Exp.</div>
                                            <div className="font-medium">{selectedCandidate.expectedSalary != null ? `₹${selectedCandidate.expectedSalary.toLocaleString()}` : '—'}</div>
                                        </div>
                                        <div className="bg-gray-50 p-3 rounded-lg">
                                            <div className="text-gray-500 text-xs">Layer 1 Score</div>
                                            <div className="font-medium">{selectedCandidate.layer1Score ?? '—'}</div>
                                        </div>
                                    </div>
                                    {selectedCandidate.motivation && (
                                        <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg text-sm">
                                            <div className="text-blue-600 text-xs font-medium mb-1">Motivation</div>
                                            <div className="text-blue-900">{selectedCandidate.motivation}</div>
                                        </div>
                                    )}
                                    {selectedCandidate.cvDriveLink && (
                                        <div className="bg-gray-50 border p-3 rounded-lg text-sm flex justify-between items-center">
                                            <div>
                                                <div className="text-gray-500 text-xs font-medium mb-1">CV File</div>
                                                <div className="text-gray-900 truncate max-w-[200px]">{selectedCandidate.cvDriveLink.split('/').pop()}</div>
                                            </div>
                                            <a href={selectedCandidate.cvDriveLink} target="_blank" rel="noreferrer" className="text-primary-600 hover:text-primary-700 text-xs font-semibold">
                                                Mock View
                                            </a>
                                        </div>
                                    )}
                                    {selectedCandidate.cvText && (
                                        <div className="bg-gray-50 border p-3 rounded-lg text-sm">
                                            <div className="text-gray-500 text-xs font-medium mb-1">Extracted CV Text (Preview)</div>
                                            <div className="text-gray-600 text-xs max-h-32 overflow-y-auto whitespace-pre-wrap">{selectedCandidate.cvText.substring(0, 500)}...</div>
                                        </div>
                                    )}
                                    {selectedCandidate.rejectionReason && (
                                        <div className="bg-red-50 border border-red-100 p-3 rounded-lg text-sm">
                                            <div className="text-red-600 text-xs font-medium mb-1">Rejection Reason</div>
                                            <div className="text-red-900">{selectedCandidate.rejectionReason}</div>
                                        </div>
                                    )}
                                </div>

                                {/* AI Scores */}
                                <div className="space-y-3">
                                    <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">AI Evaluation</h4>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="bg-white border text-center p-3 rounded-xl shadow-sm">
                                            <div className="text-2xl font-bold text-gray-900">{selectedCandidate.aiMotivationScore ?? '—'}</div>
                                            <div className="text-xs text-gray-500 mt-1">Motivation</div>
                                        </div>
                                        <div className="bg-white border text-center p-3 rounded-xl shadow-sm">
                                            <div className="text-2xl font-bold text-gray-900">{selectedCandidate.aiCvScore ?? '—'}</div>
                                            <div className="text-xs text-gray-500 mt-1">CV Score</div>
                                        </div>
                                        <div className="bg-white border text-center p-3 rounded-xl shadow-sm">
                                            <div className={cn("text-2xl font-bold", (selectedCandidate.applicationScore || 0) >= 6 ? "text-green-600" : "text-gray-900")}>
                                                {selectedCandidate.applicationScore?.toFixed(1) ?? '—'}
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1">App Score</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Assessment Scores */}
                                {selectedCandidate.assessments && selectedCandidate.assessments.length > 0 && (
                                    <div className="space-y-3">
                                        <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Assessment Results</h4>
                                        {selectedCandidate.assessments.map((a: Assessment) => (
                                            <div key={a.id} className="space-y-3">
                                                <div className="grid grid-cols-3 gap-3">
                                                    <div className="bg-white border text-center p-3 rounded-xl shadow-sm">
                                                        <div className="text-2xl font-bold text-gray-900">{a.mcqScore ?? '—'}%</div>
                                                        <div className="text-xs text-gray-500 mt-1">MCQ Score</div>
                                                    </div>
                                                    <div className="bg-white border text-center p-3 rounded-xl shadow-sm">
                                                        <div className={cn("text-2xl font-bold", (a.audioScore || 0) >= 70 ? "text-green-600" : "text-gray-900")}>
                                                            {a.audioScore ?? '—'}
                                                        </div>
                                                        <div className="text-xs text-gray-500 mt-1">Audio Score</div>
                                                    </div>
                                                    <div className="bg-white border text-center p-3 rounded-xl shadow-sm">
                                                        <div className={cn("text-2xl font-bold", (a.finalScore || 0) >= 75 ? "text-green-600" : (a.finalScore || 0) >= 60 ? "text-yellow-600" : "text-red-600")}>
                                                            {a.finalScore?.toFixed(1) ?? '—'}
                                                        </div>
                                                        <div className="text-xs text-gray-500 mt-1">Final Score</div>
                                                    </div>
                                                </div>

                                                {/* Audio Playback Link */}
                                                {a.audioDriveLink && (
                                                    <div className="bg-purple-50 border border-purple-100 p-3 rounded-lg flex items-center justify-between">
                                                        <span className="text-purple-700 text-xs font-semibold">Audio Recording</span>
                                                        <a href={a.audioDriveLink} target="_blank" rel="noreferrer" className="text-purple-600 hover:text-purple-800 text-xs font-medium bg-white px-3 py-1 rounded-full shadow-sm border border-purple-200">
                                                            Mock Listen
                                                        </a>
                                                    </div>
                                                )}

                                                {/* Azure Speech Raw Scores */}
                                                {a.aiSpeechRawScores && Object.keys(a.aiSpeechRawScores).length > 0 && !a.aiSpeechRawScores.note && (
                                                    <div className="bg-gray-50 border rounded-xl p-4 space-y-2">
                                                        <div className="text-xs font-semibold text-gray-600 uppercase">Azure Speech Breakdown</div>
                                                        {Object.entries(a.aiSpeechRawScores).map(([key, val]) => (
                                                            <div key={key} className="flex items-center gap-3">
                                                                <span className="text-xs text-gray-500 w-28 capitalize">{key}</span>
                                                                <div className="flex-1 bg-gray-200 rounded-full h-2">
                                                                    <div
                                                                        className={cn("h-2 rounded-full", (val as number) >= 70 ? "bg-green-500" : (val as number) >= 40 ? "bg-yellow-500" : "bg-red-500")}
                                                                        style={{ width: `${Math.min(val as number, 100)}%` }}
                                                                    />
                                                                </div>
                                                                <span className="text-xs font-medium w-10 text-right">{(val as number).toFixed(0)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Transcript */}
                                                {a.aiSpeechTranscript && (
                                                    <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg text-sm">
                                                        <div className="text-blue-600 text-xs font-medium mb-1">Speech Transcript</div>
                                                        <div className="text-blue-900 italic">"{a.aiSpeechTranscript}"</div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Final Score Banner */}
                                {selectedCandidate.finalScore != null && (
                                    <div className={cn(
                                        "border rounded-xl p-4 text-center",
                                        selectedCandidate.finalScore >= 75 ? "bg-green-50 border-green-200" :
                                            selectedCandidate.finalScore >= 60 ? "bg-yellow-50 border-yellow-200" :
                                                "bg-red-50 border-red-200"
                                    )}>
                                        <div className={cn(
                                            "text-3xl font-bold",
                                            selectedCandidate.finalScore >= 75 ? "text-green-700" :
                                                selectedCandidate.finalScore >= 60 ? "text-yellow-700" :
                                                    "text-red-700"
                                        )}>
                                            {selectedCandidate.finalScore.toFixed(1)}
                                        </div>
                                        <div className="text-sm text-gray-600 mt-1">Final Composite Score</div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 max-w-[480px]">
                            <User className="w-12 h-12 mb-4 text-gray-300" />
                            <p>Select a candidate to view details</p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
