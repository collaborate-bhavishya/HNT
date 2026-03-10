import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/utils';
import { Search, User, XCircle, RefreshCw, AlertCircle, FileUp, Database, Trash2, CheckCircle2 } from 'lucide-react';
import { Input } from '../components/ui/Input';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

type CandidateStatus = 'APPLIED' | 'REJECTED' | 'AI_SCORING' | 'REJECTED_FORM' | 'TESTING' | 'AUDIO_PROCESSING' | 'SELECTED' | 'MANUAL_REVIEW' | 'REJECTED_FINAL' | 'AUDIO_FAILED';

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
    createdAt: string;
    updatedAt: string;
    assessments?: Assessment[];
}

interface McqQuestion {
    id: string;
    questionText: string;
    options: string[];
    correctAnswer: string;
    difficulty: string;
    category: string;
}

interface Assessment {
    id: string;
    status: string;
    topic: string | null;
    mcqScore: number | null;
    mcqQuestions: McqQuestion[] | null;
    introAudioDriveLink: string | null;
    audioDriveLink: string | null;
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
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [adminPasswordInput, setAdminPasswordInput] = useState('');
    const [adminPasswordError, setAdminPasswordError] = useState('');

    const [isQuestionBankAuthenticated, setIsQuestionBankAuthenticated] = useState(false);
    const [qbPasswordInput, setQbPasswordInput] = useState('');
    const [qbPasswordError, setQbPasswordError] = useState('');

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [activeTab, setActiveTab] = useState<'CANDIDATES' | 'QUESTIONS'>('CANDIDATES');

    // Question management state
    const [uploading, setUploading] = useState(false);
    const [importMsg, setImportMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

    const updateStatus = async (id: string, newStatus: string) => {
        try {
            const res = await fetch(`${API_BASE}/api/applications/${id}/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            if (res.ok) {
                // Refresh local data
                setCandidates(candidates.map(c => c.id === id ? { ...c, status: newStatus as CandidateStatus } : c));
                if (selectedCandidate?.id === id) {
                    setSelectedCandidate({ ...selectedCandidate, status: newStatus as CandidateStatus });
                }
            }
        } catch (err) {
            console.error('Failed to update status', err);
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
            const res = await fetch(`${API_BASE}/api/questions/all`, { method: 'DELETE' });
            if (res.ok) {
                setImportMsg({ type: 'success', text: 'All questions cleared successfully.' });
            }
        } catch (err: any) {
            setImportMsg({ type: 'error', text: 'Failed to clear questions.' });
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

    const handleAdminLogin = () => {
        if (adminPasswordInput === 'admin@brightchamps') {
            setIsAuthenticated(true);
            setAdminPasswordError('');
        } else {
            setAdminPasswordError('Incorrect password');
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
                                type="password"
                                placeholder="Admin Password"
                                value={adminPasswordInput}
                                onChange={e => setAdminPasswordInput(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') handleAdminLogin();
                                }}
                                className="h-12 bg-gray-50/50"
                            />
                            {adminPasswordError && <p className="text-red-500 text-sm font-medium pl-1">{adminPasswordError}</p>}
                        </div>
                        <Button className="w-full h-12 text-lg bg-primary-600 hover:bg-primary-700 shadow-md transition-all" onClick={handleAdminLogin}>
                            Sign In
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
                    <p className="text-xs text-gray-500 mt-1">Teacher Hiring Pipeline</p>
                </div>
                <nav className="p-4 space-y-1 flex-1">
                    <Button
                        variant="ghost"
                        className={cn("w-full justify-start gap-3", activeTab === 'CANDIDATES' ? "bg-primary-50 text-primary-700" : "text-gray-600")}
                        onClick={() => setActiveTab('CANDIDATES')}
                    >
                        <User className="w-5 h-5" />
                        All Candidates
                        <span className="ml-auto text-xs bg-gray-100 px-2 py-0.5 rounded-full">{candidates.length}</span>
                    </Button>
                    <Button
                        variant="ghost"
                        className={cn("w-full justify-start gap-3", activeTab === 'QUESTIONS' ? "bg-primary-50 text-primary-700" : "text-gray-600")}
                        onClick={() => setActiveTab('QUESTIONS')}
                    >
                        <Database className="w-5 h-5" />
                        Question Bank
                    </Button>

                    <div className="h-4" />
                    <div className="px-3 pb-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Candidate Filters</div>

                    {activeTab === 'CANDIDATES' && (
                        <>
                            {Object.entries(statusConfig).map(([key, config]) => {
                                const count = statusCounts[key] || 0;
                                if (count === 0) return null;
                                return (
                                    <Button
                                        key={key}
                                        variant="ghost"
                                        className={cn("w-full justify-start gap-3 text-sm", statusFilter === key ? "bg-primary-50 text-primary-700" : "text-gray-600")}
                                        onClick={() => {
                                            setStatusFilter(key);
                                            setActiveTab('CANDIDATES');
                                        }}
                                    >
                                        <span className={cn("w-2 h-2 rounded-full", isRejected(key) ? "bg-red-500" : isSuccess(key) ? "bg-green-500" : "bg-blue-500")} />
                                        {config.label}
                                        <span className="ml-auto text-xs bg-gray-100 px-2 py-0.5 rounded-full">{count}</span>
                                    </Button>
                                );
                            })}
                        </>
                    )}
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
                <header className="bg-white border-b px-8 py-4 flex justify-between items-center text-sans">
                    <div>
                        <h2 className="text-2xl font-semibold text-gray-800">
                            {activeTab === 'CANDIDATES' ? 'Candidates' : 'Question Bank'}
                        </h2>
                        <p className="text-sm text-gray-500">
                            {activeTab === 'CANDIDATES' ? `${filteredCandidates.length} applicants in view` : 'Manage your technical question pool'}
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
                    {activeTab === 'CANDIDATES' ? (
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
                            )}
                        </Card>
                    ) : !isQuestionBankAuthenticated ? (
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
                        </div>
                    )}

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
                                    </div>
                                    {selectedCandidate.motivation && (() => {
                                        const whyLine = selectedCandidate.motivation.split('\n').find(l => l.startsWith('Why teach with us:'));
                                        const answer = whyLine ? whyLine.replace('Why teach with us:', '').trim() : selectedCandidate.motivation;
                                        return (
                                            <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg text-sm">
                                                <div className="text-blue-600 text-xs font-medium mb-1">Why teach with us?</div>
                                                <div className="text-blue-900">{answer}</div>
                                            </div>
                                        );
                                    })()}
                                    {selectedCandidate.cvDriveLink && (
                                        <div className="pt-2">
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
                                        </div>
                                    )}
                                </div>

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
                                        {selectedCandidate.assessments.map((a: Assessment) => (
                                            <div key={`comm-${a.id}`} className="space-y-3">
                                                {a.introAudioDriveLink && (
                                                    <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl space-y-2">
                                                        <div className="text-indigo-800 text-sm font-semibold">Q: Tell me about yourself</div>
                                                        <audio controls className="w-full h-8" src={a.introAudioDriveLink.startsWith('http://localhost') ? a.introAudioDriveLink.replace(/^http:\/\/localhost:\d+/, API_BASE) : a.introAudioDriveLink}>
                                                            Your browser does not support the audio element.
                                                        </audio>
                                                    </div>
                                                )}
                                                {a.audioDriveLink && (
                                                    <div className="bg-purple-50 border border-purple-100 p-4 rounded-xl space-y-2">
                                                        <div className="text-purple-800 text-sm font-semibold">Q: How would you explain the concept of variables in programming to a 10-year-old?</div>
                                                        <audio controls className="w-full h-8" src={a.audioDriveLink.startsWith('http://localhost') ? a.audioDriveLink.replace(/^http:\/\/localhost:\d+/, API_BASE) : a.audioDriveLink}>
                                                            Your browser does not support the audio element.
                                                        </audio>
                                                    </div>
                                                )}
                                            </div>
                                        ))}

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

                                {/* Status badge — view-only for final decisions */}
                                {selectedCandidate.status === 'SELECTED' && (
                                    <div className="bg-green-50 border border-green-200 p-4 rounded-xl text-center">
                                        <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                                        <p className="text-green-800 font-bold">Final Status: Selected</p>
                                    </div>
                                )}
                                {selectedCandidate.status === 'REJECTED_FINAL' && (
                                    <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-center">
                                        <XCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                                        <p className="text-red-800 font-bold">Final Status: Rejected</p>
                                    </div>
                                )}
                                {selectedCandidate.status === 'REJECTED_FORM' && (
                                    <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-center">
                                        <XCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                                        <p className="text-red-700 font-bold">Rejected at Application Stage</p>
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
