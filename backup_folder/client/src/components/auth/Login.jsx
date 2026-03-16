import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Lock, Mail, Loader2, AlertCircle, Calendar, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, user } = useAuth();
    const navigate = useNavigate();

    React.useEffect(() => {
        if (user) {
            navigate('/');
        }
    }, [user, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password);
        } catch (err) {
            console.error(err);
            setError('Login failed. Please check your email/password.');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
            {/* Aurora Mesh Gradient Background */}
            <div className="absolute inset-0">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-100 via-rose-50 to-amber-50" />

                {/* Animated Mesh Blobs */}
                <div
                    className="absolute top-0 left-1/4 w-[40rem] h-[40rem] bg-gradient-to-br from-violet-300/60 to-fuchsia-300/40 rounded-full blur-3xl"
                    style={{ animation: 'float 8s ease-in-out infinite' }}
                />
                <div
                    className="absolute bottom-0 right-1/4 w-[35rem] h-[35rem] bg-gradient-to-br from-cyan-300/50 to-blue-300/40 rounded-full blur-3xl"
                    style={{ animation: 'float 10s ease-in-out infinite reverse' }}
                />
                <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50rem] h-[50rem] bg-gradient-to-br from-rose-200/40 to-orange-200/30 rounded-full blur-3xl"
                    style={{ animation: 'float 12s ease-in-out infinite' }}
                />

                {/* Grain Texture Overlay */}
                <div className="absolute inset-0 opacity-30"
                    style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")' }} />
            </div>

            {/* Floating Decorative Shapes */}
            <div className="absolute top-16 left-16 w-16 h-16 bg-yellow-400 rounded-full shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-bounce" style={{ animationDuration: '3s' }} />
            <div className="absolute top-32 right-24 w-12 h-12 bg-cyan-400 rotate-45 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" style={{ animation: 'spin 10s linear infinite' }} />
            <div className="absolute bottom-24 left-24 w-10 h-10 bg-rose-400 rounded-lg shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]" style={{ animation: 'bounce 4s ease-in-out infinite' }} />
            <div className="absolute bottom-32 right-32 w-8 h-20 bg-violet-400 rounded-full shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]" />

            {/* Main Card - Neubrutalism Style */}
            <div className="relative z-10 w-full max-w-lg mx-4">
                {/* Card Shadow */}
                <div className="absolute inset-0 bg-black translate-x-3 translate-y-3 rounded-3xl" />

                {/* Card */}
                <div className="relative bg-white rounded-3xl border-4 border-black p-10">
                    {/* Logo */}
                    <div className="flex items-center justify-center gap-3 mb-8">
                        <div className="p-3 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] border-2 border-black">
                            <Calendar size={28} className="text-white" strokeWidth={2} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-black tracking-tight">EventFlow</h1>
                            <div className="flex items-center gap-1">
                                <Sparkles size={12} className="text-amber-500" />
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Enterprise</span>
                            </div>
                        </div>
                    </div>

                    {/* Title */}
                    <div className="text-center mb-10">
                        <h2 className="text-4xl font-black text-black mb-2 leading-tight">
                            Sign In
                        </h2>
                        <p className="text-slate-500 font-medium">
                            Welcome back!
                        </p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 p-4 rounded-xl bg-red-100 border-2 border-red-400 text-red-700 text-sm flex items-start gap-3 shadow-[3px_3px_0px_0px_rgba(239,68,68,1)]">
                            <AlertCircle size={18} className="mt-0.5 shrink-0" />
                            <span className="font-medium">{error}</span>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Email Field */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-black uppercase tracking-wide">
                                Email
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-3 border-black rounded-xl focus:outline-none focus:ring-4 focus:ring-violet-300 focus:bg-white transition-all text-black font-medium placeholder:text-slate-400 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] focus:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[-2px] focus:translate-y-[-2px]"
                                    placeholder="name@company.com"
                                    style={{ borderWidth: '3px' }}
                                    required
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-bold text-black uppercase tracking-wide">
                                    Password
                                </label>
                                <button type="button" className="text-sm font-bold text-violet-600 hover:text-violet-700 transition-colors cursor-pointer hover:underline">
                                    Forgot password?
                                </button>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-3 border-black rounded-xl focus:outline-none focus:ring-4 focus:ring-violet-300 focus:bg-white transition-all text-black font-medium placeholder:text-slate-400 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] focus:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[-2px] focus:translate-y-[-2px]"
                                    placeholder="••••••••"
                                    style={{ borderWidth: '3px' }}
                                    required
                                />
                            </div>
                        </div>

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white rounded-xl font-bold text-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all duration-150 active:translate-x-[2px] active:translate-y-[2px] hover:translate-x-[-2px] hover:translate-y-[-2px] flex items-center justify-center gap-2 group cursor-pointer border-3 border-black mt-8"
                            style={{ borderWidth: '3px' }}
                        >
                            {loading ? (
                                <Loader2 size={22} className="animate-spin" />
                            ) : (
                                <>
                                    Sign In
                                    <ArrowRight size={20} strokeWidth={2.5} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </Button>
                    </form>

                    {/* Footer */}
                    <div className="mt-10 pt-6 border-t-2 border-dashed border-slate-200">
                        <p className="text-center text-xs font-medium text-slate-400">
                            © 2026 EventFlow · Made with ♥ by IT FGW Team
                        </p>
                    </div>
                </div>
            </div>

            {/* Keyframe Animations */}
            <style>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0px) translateX(0px); }
                    25% { transform: translateY(-20px) translateX(10px); }
                    50% { transform: translateY(-10px) translateX(-10px); }
                    75% { transform: translateY(-25px) translateX(5px); }
                }
            `}</style>
        </div>
    );
};

export default Login;
