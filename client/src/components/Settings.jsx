import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Bell, Shield, Box, Database, ChevronRight,
    Settings as SettingsIcon, Users, Sparkles, Zap
} from 'lucide-react';
import { cn } from '../lib/utils';

const Settings = () => {
    const navigate = useNavigate();

    const systemSections = [
        {
            title: 'Communication & Workflow',
            icon: Zap,
            iconColor: 'bg-cyan-500',
            items: [
                {
                    icon: Bell,
                    title: 'Notification Center',
                    description: 'Configure email templates, channels (Slack/Zalo), and alert rules.',
                    action: () => navigate('/settings/notifications'),
                    color: 'blue'
                },
                {
                    icon: Box,
                    title: 'Resource Manager',
                    description: 'Manage equipment inventory, facility assets, and availability.',
                    action: () => navigate('/settings/resources'),
                    color: 'emerald'
                }
            ]
        },
        {
            title: 'Security & Data',
            icon: Shield,
            iconColor: 'bg-violet-500',
            items: [
                {
                    icon: Users,
                    title: 'User Management',
                    description: 'Manage system users, roles (Admin/Manager), and access permissions.',
                    action: () => navigate('/settings/users'),
                    color: 'rose'
                },
                {
                    icon: Shield,
                    title: 'Audit Logs',
                    description: 'Track system activity, user actions, and security events.',
                    action: () => navigate('/settings/audit-logs'),
                    color: 'violet'
                },
                {
                    icon: Database,
                    title: 'Data Retention & Backup',
                    description: 'Manage data lifecycle, backups, and factory reset.',
                    action: () => navigate('/settings/data-retention'),
                    color: 'amber'
                }
            ]
        }
    ];

    const colorMap = {
        blue: { bg: 'bg-blue-500', light: 'bg-blue-100', text: 'text-blue-600' },
        emerald: { bg: 'bg-emerald-500', light: 'bg-emerald-100', text: 'text-emerald-600' },
        rose: { bg: 'bg-rose-500', light: 'bg-rose-100', text: 'text-rose-600' },
        violet: { bg: 'bg-violet-500', light: 'bg-violet-100', text: 'text-violet-600' },
        amber: { bg: 'bg-amber-500', light: 'bg-amber-100', text: 'text-amber-600' },
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
            {/* Page Header - Neubrutalism Style */}
            <div className="flex items-center gap-4 p-6 bg-white rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div className="p-3 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                    <SettingsIcon size={28} strokeWidth={2.5} className="text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-black tracking-tight flex items-center gap-2">
                        System Configuration
                        <Sparkles size={18} className="text-amber-500" />
                    </h1>
                    <p className="text-sm font-bold text-slate-500">Manage enterprise-level settings, workflows, and security protocols</p>
                </div>
                <div className="ml-auto hidden md:flex items-center gap-2">
                    <div className="px-3 py-1.5 bg-slate-100 rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        <span className="text-sm font-black text-slate-600">{systemSections.reduce((acc, s) => acc + s.items.length, 0)}</span>
                        <span className="text-xs font-bold text-slate-500 ml-1">Modules</span>
                    </div>
                </div>
            </div>

            {/* Sections */}
            <div className="space-y-8">
                {systemSections.map((section, idx) => (
                    <div key={idx} className="space-y-4">
                        {/* Section Header */}
                        <div className="flex items-center gap-3 p-3 bg-white rounded-lg border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                            <div className={cn("p-2 rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]", section.iconColor)}>
                                <section.icon size={16} strokeWidth={2.5} className="text-white" />
                            </div>
                            <h2 className="text-sm font-black text-black uppercase tracking-widest">
                                {section.title}
                            </h2>
                            <span className="px-2 py-0.5 bg-slate-100 rounded border border-black text-[10px] font-bold text-slate-600">
                                {section.items.length} items
                            </span>
                        </div>

                        {/* Items Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {section.items.map((item, itemIdx) => {
                                const theme = colorMap[item.color];
                                return (
                                    <button
                                        key={itemIdx}
                                        onClick={item.action}
                                        className="group w-full text-left p-5 bg-white rounded-xl border-2 border-slate-200 hover:border-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all duration-150 cursor-pointer"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-start gap-4">
                                                {/* Icon */}
                                                <div className={cn(
                                                    "p-3 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] group-hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] group-hover:translate-x-[-1px] group-hover:translate-y-[-1px] transition-all",
                                                    theme.bg
                                                )}>
                                                    <item.icon size={22} strokeWidth={2} className="text-white" />
                                                </div>

                                                {/* Content */}
                                                <div className="space-y-1">
                                                    <h3 className="text-base font-black text-black group-hover:text-violet-600 transition-colors">
                                                        {item.title}
                                                    </h3>
                                                    <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-xs">
                                                        {item.description}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Arrow */}
                                            <div className="w-9 h-9 rounded-lg bg-slate-100 border-2 border-slate-200 group-hover:border-black group-hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] group-hover:bg-white flex items-center justify-center text-slate-400 group-hover:text-black transition-all shrink-0">
                                                <ChevronRight size={18} strokeWidth={2.5} />
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer Decorative */}
            <div className="flex items-center justify-center gap-3 py-4">
                <div className="w-2 h-2 bg-violet-500 rounded-full border border-black"></div>
                <div className="w-2 h-2 bg-cyan-500 rounded-full border border-black"></div>
                <div className="w-2 h-2 bg-amber-500 rounded-full border border-black"></div>
            </div>
        </div>
    );
};

export default Settings;
