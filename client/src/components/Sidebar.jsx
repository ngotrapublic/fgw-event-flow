import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Calendar, PlusCircle, LayoutDashboard, Settings, LogOut, Users, MapPin, ChevronRight, ChevronLeft, HelpCircle, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';

const SIDEBAR_ITEMS = [
    {
        section: 'Overview',
        items: [
            { icon: LayoutDashboard, label: 'Dashboard', to: '/', color: 'blue' },
            { icon: PlusCircle, label: 'Register Event', to: '/register', color: 'emerald' }
        ]
    },
    {
        section: 'Management',
        items: [
            { icon: Users, label: 'Departments', to: '/departments', color: 'violet' },
            { icon: MapPin, label: 'Locations', to: '/locations', color: 'orange' }
        ]
    },
    {
        section: 'System',
        items: [
            { icon: Settings, label: 'Settings', to: '/settings', color: 'slate' }
        ]
    }
];

const colorMap = {
    blue: { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-500', activeBg: 'bg-blue-500' },
    emerald: { bg: 'bg-emerald-100', text: 'text-emerald-600', border: 'border-emerald-500', activeBg: 'bg-emerald-500' },
    violet: { bg: 'bg-violet-100', text: 'text-violet-600', border: 'border-violet-500', activeBg: 'bg-violet-500' },
    orange: { bg: 'bg-orange-100', text: 'text-orange-600', border: 'border-orange-500', activeBg: 'bg-orange-500' },
    slate: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-500', activeBg: 'bg-slate-500' },
};

const SidebarItem = ({ icon: Icon, label, to, active, color, collapsed }) => {
    const theme = colorMap[color] || colorMap.slate;

    return (
        <Link
            to={to}
            title={collapsed ? label : undefined}
            className={cn(
                "group relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-150 font-bold text-sm cursor-pointer",
                active
                    ? "bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] translate-x-[-2px] translate-y-[-2px]"
                    : "bg-white/50 border-2 border-transparent hover:border-black hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px]",
                collapsed && "justify-center px-2"
            )}
        >
            {/* Active Indicator Bar */}
            {active && (
                <div className={cn("absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 rounded-r-full", theme.activeBg)} />
            )}

            {/* Icon Container */}
            <div className={cn(
                "p-2 rounded-lg transition-all duration-150 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
                active
                    ? cn(theme.activeBg, "text-white")
                    : cn(theme.bg, theme.text, "group-hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]")
            )}>
                <Icon size={18} strokeWidth={2.5} />
            </div>

            {/* Label - Hidden when collapsed */}
            {!collapsed && (
                <>
                    <span className={cn(
                        "relative z-10 flex-1 transition-colors duration-150",
                        active ? "text-black" : "text-slate-600 group-hover:text-black"
                    )}>
                        {label}
                    </span>

                    {/* Active Arrow */}
                    {active && (
                        <ChevronRight size={18} strokeWidth={2.5} className="text-slate-400" />
                    )}
                </>
            )}
        </Link>
    );
};

const Sidebar = ({ onOpenGuide, collapsed = false, onToggle }) => {
    const location = useLocation();
    const { logout, user } = useAuth();

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error('Logout failed', error);
        }
    };

    // Filter items based on role
    const isAdmin = user?.role === 'admin';
    const isManager = user?.role === 'manager';

    const filteredItems = SIDEBAR_ITEMS.map(section => {
        if (section.section === 'System' && !isAdmin) return null;
        if (section.section === 'Management' && (!isAdmin && !isManager)) return null;
        return section;
    }).filter(Boolean);

    return (
        <aside className={cn(
            "fixed h-full z-50 flex flex-col print:hidden transition-all duration-300",
            collapsed ? "w-20" : "w-72"
        )}>
            {/* Background - Clean White with subtle pattern */}
            <div className="absolute inset-0 bg-gradient-to-b from-slate-50 to-white border-r border-black/80"></div>

            {/* Decorative Shapes */}
            <div className="absolute top-20 -left-4 w-8 h-8 bg-yellow-400 rounded-full border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] opacity-60"></div>
            <div className="absolute bottom-40 -left-2 w-6 h-6 bg-cyan-400 rotate-45 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] opacity-40"></div>

            {/* Edge Toggle Button - Neubrutalism Style */}
            <button
                onClick={onToggle}
                className={cn(
                    "absolute top-1/2 -translate-y-1/2 -right-4 z-50 cursor-pointer",
                    "w-8 h-8 flex items-center justify-center",
                    "bg-white",
                    "border-2 border-black rounded-lg",
                    "shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]",
                    "text-black",
                    "transition-all duration-150 ease-out",
                    "hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px]",
                    "hover:bg-violet-50",
                    "active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px]",
                    "group"
                )}
                title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
                <ChevronLeft
                    size={18}
                    strokeWidth={2.5}
                    className={cn(
                        "transition-transform duration-300 ease-out",
                        collapsed && "rotate-180"
                    )}
                />
            </button>

            {/* Header */}
            <div className={cn("relative z-10 pt-8 pb-6", collapsed ? "px-3" : "px-6")}>
                <div className={cn("flex items-center mb-1", collapsed ? "justify-center" : "gap-3")}>
                    {/* Logo */}
                    <div className="relative">
                        <div className="p-3 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-2xl border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] text-white">
                            <Calendar size={24} strokeWidth={2.5} />
                        </div>
                    </div>
                    {!collapsed && (
                        <div>
                            <h1 className="text-2xl font-black tracking-tight text-black">EventFlow</h1>
                            <p className="text-[10px] font-bold text-violet-600 uppercase tracking-widest mt-0.5 flex items-center gap-1">
                                <Sparkles size={10} className="text-amber-500" />
                                Enterprise
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <nav className={cn("relative z-10 flex-1 py-2 space-y-1 overflow-y-auto custom-scrollbar", collapsed ? "px-2" : "px-4")}>
                {filteredItems.map((section, idx) => (
                    <div key={idx} className="mb-6">
                        {!collapsed && (
                            <div className="px-3 mb-3 flex items-center gap-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    {section.section}
                                </span>
                                <div className="flex-1 h-[2px] bg-slate-200 rounded-full"></div>
                            </div>
                        )}
                        <div className="space-y-2">
                            {section.items.map((item) => (
                                <SidebarItem
                                    key={item.to}
                                    {...item}
                                    active={location.pathname === item.to}
                                    collapsed={collapsed}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Bottom Actions - Help & Logout */}
            <div className={cn("relative z-10 p-4 mt-auto pt-4 border-t-2 border-dashed border-slate-200 flex flex-col gap-2", collapsed && "items-center")}>
                {/* User Guide Button */}
                <button
                    onClick={onOpenGuide}
                    title={collapsed ? "User Guide" : undefined}
                    className={cn(
                        "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-150 font-bold text-sm text-slate-600 hover:text-black bg-white/50 hover:bg-white border-2 border-transparent hover:border-black hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] cursor-pointer",
                        collapsed && "justify-center px-2"
                    )}
                >
                    <div className="p-2 rounded-lg bg-amber-100 text-amber-600 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        <HelpCircle size={18} strokeWidth={2.5} />
                    </div>
                    {!collapsed && "User Guide"}
                </button>

                {/* Sign Out Button */}
                <button
                    onClick={handleLogout}
                    title={collapsed ? "Sign Out" : undefined}
                    className={cn(
                        "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-150 font-bold text-sm text-slate-600 hover:text-rose-600 bg-white/50 hover:bg-rose-50 border-2 border-transparent hover:border-black hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] cursor-pointer",
                        collapsed && "justify-center px-2"
                    )}
                >
                    <div className="p-2 rounded-lg bg-slate-100 text-slate-500 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] group-hover:bg-rose-100 group-hover:text-rose-500">
                        <LogOut size={18} strokeWidth={2.5} />
                    </div>
                    {!collapsed && "Sign Out"}
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
