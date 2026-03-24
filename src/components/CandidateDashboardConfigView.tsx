import { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card } from './ui/Card';
import { Plus, Trash2, Save, LayoutDashboard } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const SUBJECTS = ["Coding", "Math", "Science", "English", "Robotics"];

const DEFAULT_TRAINING_NODES = [
  { heading: 'Welcome to Brightchamps', sub: 'Learning more about brightchamps', type: 'self', ctaLink: 'https://adhyayan.brightchamps.com/module/TT0101', date: '' },
  { heading: 'Onboarding Session', sub: 'Get to know your colleagues and team', type: 'live', ctaLink: 'TBD', date: '' },
  { heading: 'Your Role & Growth Opportunities', sub: 'Know more about earning potential and cross functional opportunities', type: 'self', ctaLink: 'https://adhyayan.brightchamps.com/module/TT0102', date: '' },
  { heading: 'Payout Policy', sub: 'learn more about payout', type: 'self', ctaLink: 'https://adhyayan.brightchamps.com/module/TT0103', date: '' },
  { heading: 'Soft Skill Training', sub: 'Learn about soft skill required for taking a class', type: 'self', ctaLink: 'https://adhyayan.brightchamps.com/module/TT0104', date: '' },
  { heading: 'Soft Skill Training', sub: 'Learn about soft skills', type: 'live', ctaLink: 'TBD', date: '' },
  { heading: 'Content Training', sub: 'Learn about the content that you\'ll teach in demo classes', type: 'live', ctaLink: 'TBD', date: '' },
  { heading: 'Product and Policy', sub: 'Learn about tools and policies', type: 'self', ctaLink: 'https://adhyayan.brightchamps.com/module/TT0105', date: '' }
];

export function CandidateDashboardConfigView() {
    const [subject, setSubject] = useState('Coding');
    const [mockInterviewLink, setMockInterviewLink] = useState('');
    const [mockInterviewPrepText, setMockInterviewPrepText] = useState('');
    const [mockInterviewPrepLink, setMockInterviewPrepLink] = useState('');
    const [trainingNodes, setTrainingNodes] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadConfig(subject);
    }, [subject]);

    const loadConfig = async (subj: string) => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/admin/dashboard-config/${subj}`);
            if (res.ok) {
                const data = await res.json();
                setMockInterviewLink(data.mockInterviewLink || '');
                setMockInterviewPrepText(data.mockInterviewPrepText || '');
                setMockInterviewPrepLink(data.mockInterviewPrepLink || '');
                setTrainingNodes(data.trainingNodes && data.trainingNodes.length > 0 ? data.trainingNodes : DEFAULT_TRAINING_NODES);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch(`${API_BASE}/api/admin/dashboard-config`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subject, mockInterviewLink, mockInterviewPrepText, mockInterviewPrepLink, trainingNodes })
            });
            if (res.ok) alert('Saved Configuration strictly for ' + subject);
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    const addNode = () => {
        setTrainingNodes([...trainingNodes, { heading: 'New Training Node', sub: '', type: 'self', ctaLink: '', date: '' }]);
    };

    const updateNode = (idx: number, field: string, val: string) => {
        const newNodes = [...trainingNodes];
        newNodes[idx][field] = val;
        setTrainingNodes(newNodes);
    };

    const removeNode = (idx: number) => {
        setTrainingNodes(trainingNodes.filter((_, i) => i !== idx));
    };

    return (
        <Card className="flex-1 overflow-auto bg-white p-8">
            <div className="max-w-4xl space-y-8 animate-in fade-in duration-300">
                <div className="flex justify-between items-center bg-gray-50 p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-xl flex items-center justify-center">
                            <LayoutDashboard className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">Dashboard Settings (Per Subject)</h3>
                            <p className="text-sm text-gray-500 font-medium mt-1">Configure candidate timeline links & dynamic training modules directly mapped to their applied position.</p>
                        </div>
                    </div>
                    <Button onClick={handleSave} disabled={saving} className="bg-primary-600 hover:bg-primary-700 shadow-md h-11 px-6">
                        <Save className="w-4 h-4 mr-2" /> {saving ? 'Saving Config...' : 'Save Configuration'}
                    </Button>
                </div>
                
                <div className="space-y-4 max-w-sm">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Select Target Subject</label>
                    <select 
                        className="w-full h-12 border-2 border-gray-200 rounded-xl px-4 font-semibold text-gray-800 bg-white hover:border-primary-300 focus:border-primary-500 focus:ring-0 outline-none transition-colors cursor-pointer shadow-sm"
                        value={subject}
                        onChange={e => setSubject(e.target.value)}
                    >
                        {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>

                <div className="border border-gray-200 rounded-2xl p-6 bg-white shadow-sm space-y-6">
                    <div>
                        <h4 className="text-lg font-extrabold text-gray-900">Hiring Journey Parameters</h4>
                        <p className="text-sm text-gray-500 mt-1">Override actions for specific nodes in the primary 5-step application timeline.</p>
                    </div>
                    
                    <div className="bg-gray-50/50 p-5 rounded-xl border border-gray-100 space-y-4">
                        <div>
                            <label className="text-sm font-bold text-gray-700 block mb-2">Mock Interview - Preparation Resource Link</label>
                            <Input 
                                className="bg-white max-w-2xl h-11 border-gray-300 focus:border-primary-500"
                                placeholder="e.g. https://docs.google.com/document/d/..."
                                value={mockInterviewPrepLink}
                                onChange={(e) => setMockInterviewPrepLink(e.target.value)}
                            />
                            <p className="text-xs text-gray-500 mt-2 italic flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary-400 shrink-0"></span>
                                This link is sent instantly via email to the candidate when they are marked as 'Selected'.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="border border-gray-200 rounded-2xl p-6 bg-white shadow-sm space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-6 mb-2">
                        <div>
                            <h4 className="text-lg font-extrabold text-gray-900">Training Modules Editor</h4>
                            <p className="text-sm text-gray-500 mt-1">Add infinite dynamic timeline steps for curriculum review, webinars, and onboarding.</p>
                        </div>
                        <Button variant="outline" className="border-primary-200 text-primary-700 hover:bg-primary-50 hover:border-primary-300 shadow-sm" onClick={addNode}>
                            <Plus className="w-5 h-5 mr-1" /> Add New Training Node
                        </Button>
                    </div>

                    {loading ? (
                         <div className="flex gap-2 items-center text-primary-600 font-medium p-4 justify-center bg-primary-50 rounded-xl animate-pulse">
                            Loading Config...
                         </div>
                    ) : (
                        <div className="space-y-5">
                            {trainingNodes.map((node, idx) => (
                                <div key={idx} className="p-6 border-2 border-gray-100 rounded-2xl bg-white space-y-5 relative group hover:border-primary-200 transition-colors shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
                                    <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => removeNode(idx)} className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition-colors border border-red-100">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm shadow-inner shrink-0">
                                            {idx + 1}
                                        </div>
                                        <h5 className="font-bold text-gray-800 tracking-tight">Timeline Block #{idx + 1}</h5>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 pr-12">
                                        <div>
                                            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Internal Heading</label>
                                            <Input className="h-10 bg-gray-50/50" value={node.heading} onChange={e => updateNode(idx, 'heading', e.target.value)} placeholder="e.g. Phase 1: Foundation" />
                                        </div>
                                        <div>
                                            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Session Tag Mode</label>
                                            <select 
                                                className="w-full h-10 border border-input rounded-md px-3 text-sm bg-gray-50/50 focus:border-primary-500 transition-colors font-medium text-gray-700"
                                                value={node.type || 'self'}
                                                onChange={e => updateNode(idx, 'type', e.target.value)}
                                            >
                                                <option value="self">Self Learning (Video/Docs)</option>
                                                <option value="live">Live Session (Video Call)</option>
                                            </select>
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Subheading Description</label>
                                            <Input className="h-10 bg-gray-50/50" value={node.subheading || node.sub || ''} onChange={e => updateNode(idx, 'sub', e.target.value)} placeholder="Node task description..." />
                                        </div>
                                        <div className={node.type === 'live' ? '' : 'md:col-span-2'}>
                                            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Action CTA URL Link</label>
                                            <Input className="h-10 bg-gray-50/50 font-mono text-sm" value={node.ctaLink || ''} onChange={e => updateNode(idx, 'ctaLink', e.target.value)} placeholder="https://zoom.us/..." />
                                        </div>
                                        {node.type === 'live' && (
                                            <div>
                                                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Schedule Date/Time</label>
                                                <Input className="h-10 bg-gray-50/50 font-medium" value={node.date || ''} onChange={e => updateNode(idx, 'date', e.target.value)} placeholder="Oct 24, 2026 • 10:00 AM EST" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {trainingNodes.length === 0 && (
                                <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50">
                                    <p className="text-base text-gray-500 font-medium">No training nodes configured for this subject.</p>
                                    <Button variant="outline" className="mt-4 border-primary-200 text-primary-700 hover:bg-primary-50" onClick={addNode}>
                                        <Plus className="w-4 h-4 mr-1.5" /> Start Building
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </Card>
    );
}
