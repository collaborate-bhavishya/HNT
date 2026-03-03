import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/utils';
import { Search, User, Play, Calendar, Star, XCircle, Clock, Volume2 } from 'lucide-react';
import { Input } from '../components/ui/Input';

type CandidateStatus = 'Pending' | 'Testing' | 'Shortlisted' | 'Rejected';

interface Candidate {
    id: string;
    name: string;
    email: string;
    subject: string;
    status: CandidateStatus;
    appliedDate: string;
    mcqScore?: number;
    audioScore?: number;
    audioUrl?: string; // Mock URL or placeholder
}

const mockCandidates: Candidate[] = [
    { id: 'C-1001', name: 'Alice Smith', email: 'alice@example.com', subject: 'Math', status: 'Pending', appliedDate: '2023-10-25' },
    { id: 'C-1002', name: 'Bob Johnson', email: 'bob@example.com', subject: 'Coding', status: 'Testing', appliedDate: '2023-10-26' },
    { id: 'C-1003', name: 'Charlie Brown', email: 'charlie@example.com', subject: 'Science', status: 'Shortlisted', appliedDate: '2023-10-26', mcqScore: 95, audioScore: 88, audioUrl: '#' },
    { id: 'C-1004', name: 'Diana Prince', email: 'diana@example.com', subject: 'English', status: 'Rejected', appliedDate: '2023-10-27', mcqScore: 45 },
    { id: 'C-1005', name: 'Ethan Hunt', email: 'ethan@example.com', subject: 'Robotics', status: 'Shortlisted', appliedDate: '2023-10-27', mcqScore: 92, audioScore: 95, audioUrl: '#' },
];

const statusColors: Record<CandidateStatus, string> = {
    Pending: 'bg-gray-100 text-gray-800 border-gray-200',
    Testing: 'bg-blue-50 text-blue-700 border-blue-200',
    Shortlisted: 'bg-green-50 text-green-700 border-green-200',
    Rejected: 'bg-red-50 text-red-700 border-red-200',
};

export default function AdminDashboard() {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

    const filteredCandidates = mockCandidates.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar - Optional but good for layout */}
            <div className="w-64 bg-white border-r hidden md:block">
                <div className="p-6 border-b">
                    <h1 className="text-xl font-bold text-gray-900">EdTech Admin</h1>
                </div>
                <nav className="p-4 space-y-2">
                    <Button variant="ghost" className="w-full justify-start gap-3 bg-primary-50 text-primary-700">
                        <User className="w-5 h-5" />
                        Candidates
                    </Button>
                    <Button variant="ghost" className="w-full justify-start gap-3 text-gray-600">
                        <Calendar className="w-5 h-5" />
                        Interviews
                    </Button>
                    <Button variant="ghost" className="w-full justify-start gap-3 text-gray-600">
                        <Star className="w-5 h-5" />
                        Assessments
                    </Button>
                </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className="bg-white border-b px-8 py-4 flex justify-between items-center">
                    <h2 className="text-2xl font-semibold text-gray-800">Candidates</h2>
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
                        <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold border border-primary-200">
                            AD
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-auto p-8 flex gap-8">
                    {/* List View */}
                    <Card className="flex-1 flex flex-col min-h-0 bg-white">
                        <div className="overflow-auto border-b">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-gray-50 text-gray-600 font-medium sticky top-0 shadow-sm">
                                    <tr>
                                        <th className="px-6 py-4">Candidate</th>
                                        <th className="px-6 py-4">Subject</th>
                                        <th className="px-6 py-4">Applied Date</th>
                                        <th className="px-6 py-4">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredCandidates.map(candidate => (
                                        <tr
                                            key={candidate.id}
                                            onClick={() => setSelectedCandidate(candidate)}
                                            className={cn(
                                                "cursor-pointer transition-colors hover:bg-gray-50",
                                                selectedCandidate?.id === candidate.id ? "bg-primary-50 hover:bg-primary-50" : ""
                                            )}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-900">{candidate.name}</div>
                                                <div className="text-gray-500 text-xs mt-1">{candidate.email}</div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-700">{candidate.subject}</td>
                                            <td className="px-6 py-4 text-gray-500">{candidate.appliedDate}</td>
                                            <td className="px-6 py-4">
                                                <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border", statusColors[candidate.status])}>
                                                    {candidate.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredCandidates.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                                                No candidates found matching '{searchTerm}'.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-4 text-sm text-gray-500 bg-gray-50 text-center">
                            Showing {filteredCandidates.length} of {mockCandidates.length} candidates
                        </div>
                    </Card>

                    {/* Detail View */}
                    {selectedCandidate ? (
                        <Card className="w-[450px] shadow-lg flex flex-col animate-in slide-in-from-right-8 duration-300">
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
                                        {selectedCandidate.name.charAt(0)}
                                    </div>
                                    <div>
                                        <CardTitle className="text-xl">{selectedCandidate.name}</CardTitle>
                                        <CardDescription>{selectedCandidate.id} • {selectedCandidate.email}</CardDescription>
                                    </div>
                                </div>
                                <div className="mt-4 flex gap-2">
                                    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border", statusColors[selectedCandidate.status])}>
                                        {selectedCandidate.status}
                                    </span>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border bg-white text-gray-600">
                                        {selectedCandidate.subject}
                                    </span>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6 space-y-8 flex-1 overflow-auto">
                                {/* Scores Section */}
                                <div className="space-y-4">
                                    <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Assessment Results</h4>

                                    {selectedCandidate.status === 'Pending' || selectedCandidate.status === 'Testing' ? (
                                        <div className="bg-gray-50 border rounded-xl p-8 flex flex-col items-center justify-center text-center space-y-3">
                                            <Clock className="w-8 h-8 text-gray-400" />
                                            <div>
                                                <p className="font-medium text-gray-900">Awaiting Results</p>
                                                <p className="text-sm text-gray-500">Candidate has not completed the assessment.</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-white border text-center p-4 rounded-xl shadow-sm">
                                                <div className="text-3xl font-bold text-gray-900 mb-1">
                                                    {selectedCandidate.mcqScore}%
                                                </div>
                                                <div className="text-xs text-gray-500 uppercase tracking-wide">MCQ Score</div>
                                            </div>
                                            <div className="bg-white border text-center p-4 rounded-xl shadow-sm relative overflow-hidden">
                                                <div className="absolute top-0 right-0 p-1 pointer-events-none">
                                                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                                                </div>
                                                <div className={cn(
                                                    "text-3xl font-bold mb-1",
                                                    (selectedCandidate.audioScore || 0) >= 80 ? "text-primary-600" : "text-gray-900"
                                                )}>
                                                    {selectedCandidate.audioScore || 'N/A'}
                                                </div>
                                                <div className="text-xs text-gray-500 uppercase tracking-wide">Speech API Score</div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Audio Playback Section */}
                                {(selectedCandidate.audioScore || selectedCandidate.audioUrl) && (
                                    <div className="space-y-4">
                                        <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider flex items-center justify-between">
                                            Audio Recording
                                            <span className="text-xs font-normal text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full border border-primary-100">AI Analyzed</span>
                                        </h4>
                                        <div className="bg-gray-900 text-white rounded-xl p-4 flex flex-col gap-4 shadow-lg relative overflow-hidden group">
                                            <div className="absolute inset-0 bg-gradient-to-tr from-gray-900 to-gray-800 -z-10" />

                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Volume2 className="w-4 h-4 text-gray-400" />
                                                    <span className="text-sm font-medium">Interview Response.webm</span>
                                                </div>
                                                <span className="text-xs text-gray-400">01:24</span>
                                            </div>

                                            {/* Mock Waveform */}
                                            <div className="h-10 w-full flex items-center justify-between gap-[2px] opacity-70 group-hover:opacity-100 transition-opacity">
                                                {Array.from({ length: 40 }).map((_, i) => (
                                                    <div key={i} className="bg-primary-500 w-1 rounded-full" style={{ height: `${Math.max(20, Math.random() * 100)}%` }} />
                                                ))}
                                            </div>

                                            <div className="flex items-center justify-between mt-2 flex-row-reverse">
                                                <Button size="sm" className="bg-white text-gray-900 hover:bg-gray-100 gap-2 rounded-full px-4 h-9">
                                                    <Play className="w-4 h-4 fill-current" />
                                                    Play Audio
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-sm text-blue-800">
                                            <strong>AI Speech Notes:</strong> Strong vocabulary. Clear pronunciation. Shows excellent enthusiasm for teaching {selectedCandidate.subject.toLowerCase()}.
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                            <div className="p-4 border-t bg-gray-50 flex gap-3">
                                <Button variant="outline" className="flex-1 bg-white">Reject</Button>
                                <Button className="flex-1">Shortlist Candidate</Button>
                            </div>
                        </Card>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 max-w-[450px]">
                            <User className="w-12 h-12 mb-4 text-gray-300" />
                            <p>Select a candidate to view details</p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
