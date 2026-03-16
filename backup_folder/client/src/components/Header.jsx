import { Bell, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import NotificationDropdown from './ui/NotificationDropdown';

const Header = () => {
    const { user, logout } = useAuth();

    const displayName = user?.name || user?.email?.split('@')[0] || 'User';
    const initials = displayName.substring(0, 2).toUpperCase();
    const roleLabel = user?.role === 'admin' ? 'Super Admin' : user?.role === 'manager' ? 'Manager' : 'Team Member';

    return (
        <header className="h-20 bg-white sticky top-0 z-30 px-8 flex items-center justify-center print:hidden transition-all duration-150 border-b border-black/80">
            <div className="w-full max-w-7xl flex items-center justify-between">
                {/* Left: Welcome Message */}
                <div className="flex flex-col">
                    <h1 className="text-xl font-black text-black tracking-tight flex items-center gap-2">
                        Welcome back, {displayName}
                        <span className="inline-block animate-bounce">👋</span>
                    </h1>
                    <p className="text-xs text-slate-500 font-bold mt-0.5">Here's what's happening today</p>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-4">
                    {/* Notification Dropdown */}
                    <div className="border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] transition-all duration-150 bg-white">
                        <NotificationDropdown />
                    </div>

                    {/* User Profile */}
                    <div className="flex items-center gap-3 px-4 py-2 bg-white border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all duration-150 cursor-pointer">
                        {/* Avatar */}
                        <div className="relative">
                            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white font-black text-sm border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                {initials}
                            </div>
                            <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 bg-emerald-400 border-2 border-black rounded-full"></span>
                        </div>

                        {/* User Info */}
                        <div className="hidden lg:block text-left">
                            <p className="text-sm font-black text-black">{displayName}</p>
                            <p className="text-[10px] text-violet-600 font-bold uppercase tracking-widest flex items-center gap-1">
                                <Sparkles size={10} className="text-amber-500" />
                                {roleLabel}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
