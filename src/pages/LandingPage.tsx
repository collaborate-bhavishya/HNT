import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/utils';

const stats = [
    { value: '20+', label: 'Countries', icon: '🌍' },
    { value: '4000+', label: 'Teachers', icon: '👩‍🏫' },
    { value: '6-16', label: 'Age Group', icon: '🧒' },
    { value: '1:1', label: '& Small Groups', icon: '💬' },
];

const benefits = [
    {
        icon: '💻',
        title: 'Teach Online',
        desc: 'Teach 1:1 or in small groups through our interactive platform. Engage students from across the globe.',
        gradient: 'from-orange-500/10 to-amber-500/10',
        border: 'border-orange-200',
        iconBg: 'bg-orange-100',
    },
    {
        icon: '🏠',
        title: 'Work From Home',
        desc: 'No commute needed. Teach comfortably from your home with flexible scheduling options.',
        gradient: 'from-purple-500/10 to-indigo-500/10',
        border: 'border-purple-200',
        iconBg: 'bg-purple-100',
    },
    {
        icon: '🌏',
        title: 'Training & Global Exposure',
        desc: 'Get trained by industry experts and gain exposure working with students from 20+ countries.',
        gradient: 'from-emerald-500/10 to-teal-500/10',
        border: 'border-emerald-200',
        iconBg: 'bg-emerald-100',
    },
    {
        icon: '🚀',
        title: 'Work on Exciting Projects',
        desc: 'If interested, apply to work on other interesting projects apart from teaching as per company requirements.',
        gradient: 'from-pink-500/10 to-rose-500/10',
        border: 'border-pink-200',
        iconBg: 'bg-pink-100',
    },
];

const countries = [
    { name: 'India', flag: '🇮🇳' },
    { name: 'Indonesia', flag: '🇮🇩' },
    { name: 'Vietnam', flag: '🇻🇳' },
    { name: 'South Africa', flag: '🇿🇦' },
    { name: 'USA', flag: '🇺🇸' },
    { name: 'UK', flag: '🇬🇧' },
    { name: 'Philippines', flag: '🇵🇭' },
    { name: 'And More', flag: '🌐' },
];

export default function LandingPage() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-white antialiased">
            {/* ===== NAVBAR ===== */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <img
                        src="/brightchamps-logo.svg"
                        alt="BrightChamps"
                        className="h-9"
                    />
                    <div className="flex items-center gap-4">
                        <a href="#benefits" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition hidden sm:block">
                            Benefits
                        </a>
                        <a href="#countries" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition hidden sm:block">
                            Global Reach
                        </a>
                        <Button
                            onClick={() => navigate('/admin')}
                            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-200 rounded-full px-8"
                        >
                            Login
                        </Button>
                    </div>
                </div>
            </nav>

            {/* ===== HERO ===== */}
            <section className="relative pt-32 pb-20 overflow-hidden">
                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-orange-100/60 via-purple-50/40 to-transparent rounded-full -translate-y-1/3 translate-x-1/4 blur-3xl" />
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-purple-100/40 to-transparent rounded-full translate-y-1/3 -translate-x-1/4 blur-3xl" />

                <div className="max-w-6xl mx-auto px-6 relative">
                    <div className="max-w-3xl mx-auto text-center space-y-8">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-full px-4 py-1.5 text-sm font-medium text-orange-700 animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <span className="flex h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                            Now Hiring Teachers Globally
                        </div>

                        {/* Heading */}
                        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
                            <span className="text-gray-900">Join the World's Leading</span>
                            <br />
                            <span className="bg-gradient-to-r from-orange-500 via-orange-600 to-purple-700 bg-clip-text text-transparent">
                                EdTech Teaching Academy
                            </span>
                        </h1>

                        {/* Subheading */}
                        <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                            We are a global edtech platform for kids from <strong className="text-gray-900">6 to 16 years</strong>.
                            With students from <strong className="text-gray-900">20+ countries</strong> and
                            a global pool of <strong className="text-gray-900">4,000+ teachers</strong> from
                            India, Indonesia, Vietnam, South Africa, and many more.
                        </p>

                        {/* CTA */}
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300">
                            <Button
                                onClick={() => navigate('/apply')}
                                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-lg h-14 px-10 rounded-full shadow-xl shadow-orange-200 hover:shadow-2xl hover:shadow-orange-300 transition-all hover:scale-105"
                            >
                                🚀 Start Your Application
                            </Button>
                            <p className="text-sm text-gray-500">Takes only 5 minutes</p>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="mt-20 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-12 duration-700 delay-500">
                        {stats.map((s) => (
                            <div
                                key={s.label}
                                className="bg-white border border-gray-100 rounded-2xl p-5 text-center shadow-sm hover:shadow-md transition-shadow"
                            >
                                <div className="text-2xl mb-2">{s.icon}</div>
                                <div className="text-2xl sm:text-3xl font-extrabold text-gray-900">{s.value}</div>
                                <div className="text-sm text-gray-500 mt-1">{s.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ===== WHY YOU? ===== */}
            <section className="py-20 bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDJ2LTJoMzR6bTAtMzBWNkgyVjRoMzR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
                <div className="max-w-4xl mx-auto px-6 text-center relative">
                    <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 rounded-full px-5 py-2 text-sm text-orange-300 font-medium mb-8">
                        ✨ You're Invited
                    </div>
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight">
                        Based on your background,<br />
                        <span className="bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">
                            we believe you could be a great fit
                        </span>
                    </h2>
                    <p className="text-lg text-purple-200 mt-6 max-w-2xl mx-auto">
                        Join our teaching academy and make a real impact on thousands of young learners across the globe.
                    </p>
                    <Button
                        onClick={() => navigate('/apply')}
                        className="mt-10 bg-white text-purple-900 hover:bg-gray-100 text-lg h-14 px-10 rounded-full shadow-xl font-bold hover:scale-105 transition-all"
                    >
                        Apply to Teaching Academy →
                    </Button>
                </div>
            </section>

            {/* ===== BENEFITS ===== */}
            <section id="benefits" className="py-24 bg-gray-50">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-full px-4 py-1.5 text-sm font-medium text-purple-700 mb-4">
                            💼 Perks & Benefits
                        </div>
                        <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
                            Benefits of Working With Us
                        </h2>
                        <p className="text-gray-600 mt-3 max-w-lg mx-auto">
                            Enjoy flexibility, growth, and global exposure — all from the comfort of your home.
                        </p>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
                        {benefits.map((b, i) => (
                            <div
                                key={b.title}
                                className={cn(
                                    "group bg-gradient-to-br bg-white border rounded-2xl p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-1",
                                    b.border,
                                    b.gradient
                                )}
                                style={{ animationDelay: `${i * 100}ms` }}
                            >
                                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-5 group-hover:scale-110 transition-transform", b.iconBg)}>
                                    {b.icon}
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">{b.title}</h3>
                                <p className="text-gray-600 leading-relaxed">{b.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ===== COUNTRIES ===== */}
            <section id="countries" className="py-24 bg-white">
                <div className="max-w-6xl mx-auto px-6 text-center">
                    <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-full px-4 py-1.5 text-sm font-medium text-emerald-700 mb-4">
                        🌍 Global Network
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
                        Our Teachers Come From Around the World
                    </h2>
                    <p className="text-gray-600 max-w-lg mx-auto mb-12">
                        Join a diverse community of educators from India, Indonesia, Vietnam, South Africa, and many other countries.
                    </p>

                    <div className="flex flex-wrap items-center justify-center gap-4 max-w-3xl mx-auto">
                        {countries.map((c) => (
                            <div
                                key={c.name}
                                className="bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 flex items-center gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all"
                            >
                                <span className="text-3xl">{c.flag}</span>
                                <span className="font-semibold text-gray-800">{c.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ===== FINAL CTA ===== */}
            <section className="py-24 bg-gradient-to-r from-orange-500 via-orange-600 to-purple-700 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent)] pointer-events-none" />
                <div className="max-w-3xl mx-auto px-6 text-center relative">
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-4">
                        Ready to Make a Difference?
                    </h2>
                    <p className="text-lg text-orange-100 mb-10 max-w-xl mx-auto">
                        Start your journey with BrightChamps today. Help shape the future of young minds across the globe.
                    </p>
                    <Button
                        onClick={() => navigate('/apply')}
                        className="bg-white text-orange-600 hover:bg-gray-100 text-lg h-14 px-12 rounded-full shadow-xl font-bold hover:scale-105 transition-all"
                    >
                        Start Your Application →
                    </Button>
                </div>
            </section>

            {/* ===== FOOTER ===== */}
            <footer className="bg-gray-900 text-gray-400 py-10 border-t border-gray-800">
                <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <img src="/brightchamps-logo.svg" alt="BrightChamps" className="h-7 brightness-200" />
                    </div>
                    <p className="text-sm">
                        © {new Date().getFullYear()} BrightChamps. All rights reserved.
                    </p>
                    <div className="flex gap-6 text-sm">
                        <a href="#" className="hover:text-white transition">Terms</a>
                        <a href="#" className="hover:text-white transition">Privacy</a>
                        <a href="#" className="hover:text-white transition">Contact</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
