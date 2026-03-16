import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import {
    TrendingUp, Calendar, Users, Activity, BarChart3, PieChart,
    ArrowUp, ArrowDown, Minus, FileText, Lightbulb, AlertTriangle,
    ChevronDown, Clock, Target, Award, Shield, Hammer, Mail, Phone
} from 'lucide-react';
import {
    XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart as RechartsPie, Pie, Cell, AreaChart, Area
} from 'recharts';

// Professional Report Color Palette
const DEPT_COLORS = {
    'Tuyển Sinh': { bg: 'bg-blue-500', light: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', hex: '#3b82f6' },
    'Đào Tạo': { bg: 'bg-violet-500', light: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-200', hex: '#8b5cf6' },
    'Công Tác Sinh Viên': { bg: 'bg-emerald-500', light: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', hex: '#10b981' },
    'Quan Hệ Doanh Nghiệp': { bg: 'bg-amber-500', light: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', hex: '#f59e0b' },
    'Hành Chính': { bg: 'bg-rose-500', light: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200', hex: '#f43f5e' },
    'Thư Viện': { bg: 'bg-cyan-500', light: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-200', hex: '#06b6d4' },
    'default': { bg: 'bg-slate-500', light: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', hex: '#64748b' },
};

const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#f43f5e', '#06b6d4', '#64748b'];

const TIME_PERIODS = [
    { value: 7, label: '7 ngày' },
    { value: 30, label: '30 ngày' },
    { value: 90, label: 'Quý này' },
    { value: 365, label: 'Năm nay' },
];

const DepartmentGalaxy = ({ events }) => {
    const [selectedDept, setSelectedDept] = useState(null);
    const [timePeriod, setTimePeriod] = useState(30);
    const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);

    // Standardized Section Wrapper
    const DashboardSection = ({ icon: Icon, title, subtitle, badge, gradient, children, className, height = "auto" }) => (
        <div className={cn(
            "bg-white rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden flex flex-col transition-all",
            className
        )} style={{ height }}>
            <div className={cn("p-4 border-b-2 border-dashed border-slate-200 flex items-center justify-between", gradient)}>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex-shrink-0 text-black">
                        <Icon size={18} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h2 className="font-black text-black text-sm md:text-base leading-tight uppercase tracking-tight">{title}</h2>
                        <p className="text-[10px] md:text-xs text-slate-500 font-bold tracking-tight opacity-70">{subtitle}</p>
                    </div>
                </div>
                {badge && <div className="flex-shrink-0">{badge}</div>}
            </div>
            <div className="p-3 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
                {children}
            </div>
        </div>
    );

    // Calculate all stats based on time period
    const {
        stats, totalEvents, eventsThisMonth, upcomingEvents, monthlyTrend,
        topDepartment, monthlyChartData, insights, heatmapData, pieData,
        securityStats, contactStats
    } = useMemo(() => {
        const counts = {};
        let total = 0;
        const today = new Date();
        const periodStart = new Date(today);
        periodStart.setDate(periodStart.getDate() - timePeriod);

        let thisMonth = 0;
        let upcoming = 0;
        const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        let lastMonth = 0;

        // Monthly chart data (last 6 months)
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthlyData = {};
        for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const key = months[d.getMonth()];
            monthlyData[key] = 0;
        }

        // Heatmap data (last 12 weeks)
        const heatmap = [];
        for (let week = 0; week < 12; week++) {
            const weekData = [];
            for (let day = 0; day < 7; day++) {
                const d = new Date(today);
                d.setDate(d.getDate() - (11 - week) * 7 - (6 - day));
                weekData.push({ date: d.toISOString().split('T')[0], count: 0, day });
            }
            heatmap.push(weekData);
        }

        // --- NEW: Security and Contact Data Extraction + Main Stats ---
        const todayStr = today.toISOString().split('T')[0];
        const sevenDaysFromNow = new Date(today);
        sevenDaysFromNow.setDate(today.getDate() + 7);

        const activeContractors = new Set();
        const securityWatchList = [];
        const contactList = [];

        events.forEach(event => {
            const eventDate = new Date(event.eventDate);
            const eventDateStr = eventDate.toISOString().split('T')[0];

            // 1. Basic Stats & Trend
            let dept = event.department || 'Other';
            dept = dept.replace('Phòng ', '').replace('Ban ', '');

            // Filter by time period
            if (eventDate >= periodStart || eventDate >= today) {
                counts[dept] = (counts[dept] || 0) + 1;
                total++;
            }

            // This month stats
            if (eventDate.getMonth() === today.getMonth() && eventDate.getFullYear() === today.getFullYear()) {
                thisMonth++;
            }
            if (eventDate.getMonth() === lastMonthDate.getMonth() && eventDate.getFullYear() === lastMonthDate.getFullYear()) {
                lastMonth++;
            }
            if (eventDate >= today) {
                upcoming++;
            }

            // Monthly chart
            const monthKey = months[eventDate.getMonth()];
            if (monthlyData.hasOwnProperty(monthKey)) {
                monthlyData[monthKey]++;
            }

            // 2. Heatmap
            heatmap.forEach(week => {
                week.forEach(day => {
                    if (day.date === eventDateStr) {
                        day.count++;
                    }
                });
            });

            // 3. Security Watch (Contractors)
            const isToday = eventDateStr === todayStr;
            const isUpcoming = eventDate >= today;

            if (isToday || isUpcoming) {
                const packages = event.contractorPackages || [];
                packages.forEach(pkg => {
                    if (pkg.contractorName) {
                        activeContractors.add(pkg.contractorName);
                        securityWatchList.push({
                            contractor: pkg.contractorName,
                            event: event.eventName,
                            date: event.eventDate,
                            isToday
                        });
                    }
                });
                // Legacy check
                if (event.contractorName && packages.length === 0) {
                    activeContractors.add(event.contractorName);
                    securityWatchList.push({
                        contractor: event.contractorName,
                        event: event.eventName,
                        date: event.eventDate,
                        isToday
                    });
                }
            }

            // 4. Contact List (Upcoming Events in next 7 days)
            if (eventDate >= today && eventDate <= sevenDaysFromNow) {
                contactList.push({
                    name: event.eventName,
                    registrant: event.registrantEmail || 'N/A',
                    dept,
                    date: event.eventDate,
                    time: `${event.startTime} - ${event.endTime}`
                });
            }
        });

        const securityStats = {
            totalToday: securityWatchList.filter(s => s.isToday).length,
            watchList: securityWatchList.sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 6)
        };

        const contactStats = contactList.sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 6);
        // ---------------------------------------------------

        const sortedDepts = Object.entries(counts)
            .map(([name, count]) => ({
                name,
                count,
                percent: total > 0 ? Math.round((count / total) * 100) : 0,
                color: DEPT_COLORS[name] || DEPT_COLORS.default
            }))
            .sort((a, b) => b.count - a.count);

        const trend = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : thisMonth > 0 ? 100 : 0;

        // Generate insights
        const generatedInsights = [];

        // Trend insight
        if (trend > 10) {
            generatedInsights.push({
                type: 'success',
                icon: TrendingUp,
                title: 'Tăng trưởng',
                text: `+${trend}%`,
                subtext: 'so với tháng trước',
                color: 'emerald'
            });
        } else if (trend < -10) {
            generatedInsights.push({
                type: 'warning',
                icon: AlertTriangle,
                title: 'Cảnh báo',
                text: `${trend}%`,
                subtext: 'so với tháng trước',
                color: 'amber'
            });
        } else {
            generatedInsights.push({
                type: 'neutral',
                icon: Activity,
                title: 'Ổn định',
                text: `${trend >= 0 ? '+' : ''}${trend}%`,
                subtext: 'so với tháng trước',
                color: 'slate'
            });
        }

        // Top department insight
        if (sortedDepts.length > 0) {
            generatedInsights.push({
                type: 'info',
                icon: Award,
                title: 'Top Performer',
                text: sortedDepts[0].name,
                subtext: `${sortedDepts[0].percent}% tổng sự kiện`,
                color: 'blue'
            });
        }

        // Average events per week insight
        const weeksInPeriod = Math.ceil(timePeriod / 7);
        const avgPerWeek = weeksInPeriod > 0 ? Math.round(total / weeksInPeriod * 10) / 10 : 0;
        generatedInsights.push({
            type: 'metric',
            icon: Target,
            title: 'Trung bình',
            text: `${avgPerWeek}`,
            subtext: 'sự kiện / tuần',
            color: 'violet'
        });

        // Convert monthly data to chart format
        const chartData = Object.entries(monthlyData).map(([month, count]) => ({
            month,
            events: count
        }));

        // Convert to pie data
        const pie = sortedDepts.slice(0, 6).map((d, i) => ({
            name: d.name,
            value: d.count,
            color: CHART_COLORS[i % CHART_COLORS.length]
        }));

        return {
            stats: sortedDepts,
            totalEvents: total,
            eventsThisMonth: thisMonth,
            upcomingEvents: upcoming,
            monthlyTrend: trend,
            topDepartment: sortedDepts[0],
            monthlyChartData: chartData,
            insights: generatedInsights,
            heatmapData: heatmap,
            pieData: pie,
            securityStats,
            contactStats
        };
    }, [events, timePeriod]);

    const TrendIcon = monthlyTrend > 0 ? ArrowUp : monthlyTrend < 0 ? ArrowDown : Minus;
    const trendColor = monthlyTrend > 0 ? 'text-emerald-500' : monthlyTrend < 0 ? 'text-rose-500' : 'text-slate-400';

    // Custom Tooltip for charts
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white px-3 py-2 rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <p className="font-black text-black">{label}</p>
                    <p className="text-sm text-slate-600">{payload[0].value} events</p>
                </div>
            );
        }
        return null;
    };

    // Color styles for insights
    const INSIGHT_COLORS = {
        emerald: { bg: 'bg-emerald-500', light: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
        amber: { bg: 'bg-amber-500', light: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
        blue: { bg: 'bg-blue-500', light: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
        violet: { bg: 'bg-violet-500', light: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
        slate: { bg: 'bg-slate-500', light: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' }
    };

    return (
        <div className="w-full animate-in fade-in duration-500">
            {/* Report Header with Time Selector */}
            <div className="mb-6 p-6 bg-white rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                            <BarChart3 className="text-white" size={28} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-black">Analytics Report</h1>
                            <p className="text-slate-500 font-bold text-sm">Event performance & department insights</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Time Period Selector */}
                        <div className="relative">
                            <button
                                onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
                                className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-bold text-sm hover:bg-slate-50 transition-colors cursor-pointer"
                            >
                                <Calendar size={16} />
                                {TIME_PERIODS.find(p => p.value === timePeriod)?.label}
                                <ChevronDown size={16} className={cn("transition-transform", showPeriodDropdown && "rotate-180")} />
                            </button>
                            <AnimatePresence>
                                {showPeriodDropdown && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="absolute right-0 mt-2 w-40 bg-white border-2 border-black rounded-lg shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] overflow-hidden z-50"
                                    >
                                        {TIME_PERIODS.map(period => (
                                            <button
                                                key={period.value}
                                                onClick={() => {
                                                    setTimePeriod(period.value);
                                                    setShowPeriodDropdown(false);
                                                }}
                                                className={cn(
                                                    "w-full px-4 py-2 text-left text-sm font-bold transition-colors cursor-pointer",
                                                    timePeriod === period.value
                                                        ? "bg-indigo-500 text-white"
                                                        : "hover:bg-slate-100"
                                                )}
                                            >
                                                {period.label}
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        <span className="flex items-center gap-2 px-3 py-1.5 bg-emerald-100 text-emerald-700 font-bold text-xs rounded-full border-2 border-emerald-300">
                            <Activity size={12} strokeWidth={3} className="animate-pulse" />
                            LIVE
                        </span>
                    </div>
                </div>
            </div>

            {/* AI Insights Box - Enhanced */}
            {insights.length > 0 && (
                <div className="mb-6 bg-white rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                    <div className="p-4 border-b-2 border-dashed border-slate-200 flex items-center gap-3 bg-gradient-to-r from-indigo-50 via-violet-50 to-fuchsia-50">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            <Lightbulb size={18} className="text-white" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h2 className="font-black text-black">AI Insights</h2>
                            <p className="text-xs text-slate-500 font-medium">Smart analysis & recommendations</p>
                        </div>
                    </div>
                    <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                        {insights.map((insight, idx) => {
                            const Icon = insight.icon;
                            const style = INSIGHT_COLORS[insight.color] || INSIGHT_COLORS.slate;
                            return (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className={cn(
                                        "p-4 rounded-xl border-2 transition-all hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:border-black cursor-pointer",
                                        style.light, style.border
                                    )}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={cn(
                                            "w-12 h-12 rounded-xl flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex-shrink-0",
                                            style.bg
                                        )}>
                                            <Icon size={22} strokeWidth={2.5} className="text-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">{insight.title}</p>
                                            <p className={cn("font-black text-2xl leading-tight", style.text)}>{insight.text}</p>
                                            {insight.subtext && (
                                                <p className="text-xs text-slate-500 font-bold mt-1 truncate">{insight.subtext}</p>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* KPI Cards Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {/* Total Events */}
                <div className="bg-white rounded-xl p-5 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] group hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            <FileText size={18} className="text-white" strokeWidth={2.5} />
                        </div>
                        <span className="text-xs font-black text-slate-400 uppercase">Total</span>
                    </div>
                    <div className="text-4xl font-black text-black">{totalEvents}</div>
                    <p className="text-xs font-bold text-slate-500 mt-1">All Events</p>
                </div>

                {/* This Month */}
                <div className="bg-white rounded-xl p-5 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] group hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            <Calendar size={18} className="text-white" strokeWidth={2.5} />
                        </div>
                        <div className={cn("flex items-center gap-1 text-xs font-black", trendColor)}>
                            <TrendIcon size={14} strokeWidth={3} />
                            {Math.abs(monthlyTrend)}%
                        </div>
                    </div>
                    <div className="text-4xl font-black text-black">{eventsThisMonth}</div>
                    <p className="text-xs font-bold text-slate-500 mt-1">This Month</p>
                </div>

                {/* Upcoming */}
                <div className="bg-white rounded-xl p-5 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] group hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            <TrendingUp size={18} className="text-white" strokeWidth={2.5} />
                        </div>
                        <span className="text-xs font-black text-emerald-500 uppercase">Active</span>
                    </div>
                    <div className="text-4xl font-black text-black">{upcomingEvents}</div>
                    <p className="text-xs font-bold text-slate-500 mt-1">Upcoming</p>
                </div>

                {/* Completion Rate */}
                <div className="bg-white rounded-xl p-5 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] group hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            <Award size={18} className="text-white" strokeWidth={2.5} />
                        </div>
                        <span className="text-xs font-black text-amber-500 uppercase">Done</span>
                    </div>
                    <div className="text-4xl font-black text-black">{totalEvents - upcomingEvents}</div>
                    <p className="text-xs font-bold text-slate-500 mt-1">Completed</p>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Line Chart - Trend */}
                <div className="bg-white rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                    <div className="p-4 border-b-2 border-dashed border-slate-200 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            <TrendingUp size={18} className="text-white" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h2 className="font-black text-black">Event Trend</h2>
                            <p className="text-xs text-slate-500 font-medium">Last 6 months</p>
                        </div>
                    </div>
                    <div className="p-4 h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={monthlyChartData}>
                                <defs>
                                    <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700 }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area
                                    type="monotone"
                                    dataKey="events"
                                    stroke="#6366f1"
                                    strokeWidth={3}
                                    fill="url(#colorEvents)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Pie/Donut Chart */}
                <div className="bg-white rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                    <div className="p-4 border-b-2 border-dashed border-slate-200 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            <PieChart size={18} className="text-white" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h2 className="font-black text-black">Department Share</h2>
                            <p className="text-xs text-slate-500 font-medium">Distribution by department</p>
                        </div>
                    </div>
                    <div className="p-4 h-[250px] flex items-center">
                        <ResponsiveContainer width="60%" height="100%">
                            <RechartsPie>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={80}
                                    dataKey="value"
                                    stroke="#000"
                                    strokeWidth={2}
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </RechartsPie>
                        </ResponsiveContainer>
                        <div className="flex-1 space-y-2">
                            {pieData.slice(0, 5).map((item, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <div
                                        className="w-3 h-3 rounded border-2 border-black"
                                        style={{ backgroundColor: item.color }}
                                    />
                                    <span className="text-xs font-bold text-slate-600 truncate flex-1">{item.name}</span>
                                    <span className="text-xs font-black text-black">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Dashboard Bottom Section - Perfectly Balanced 2x2 Bento Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">

                {/* 1. Monthly Calendar Heatmap (Top Left) */}
                <DashboardSection
                    icon={Calendar}
                    title="Monthly Heatmap"
                    subtitle="Activity performance this month"
                    gradient="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50"
                    className="h-full min-h-[420px]"
                    badge={
                        <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-2 py-1 rounded-lg border-2 border-black/5">
                            <span className="text-[9px] font-black text-slate-400">Low</span>
                            <div className="flex gap-0.5">
                                {[100, 200, 400, 600].map(v => (
                                    <div key={v} className={cn("w-2.5 h-2.5 rounded-sm border border-black/5", `bg-emerald-${v}`)}></div>
                                ))}
                            </div>
                            <span className="text-[9px] font-black text-slate-400">High</span>
                        </div>
                    }
                >
                    {(() => {
                        const today = new Date();
                        const year = today.getFullYear();
                        const month = today.getMonth();
                        const firstDay = new Date(year, month, 1);
                        const lastDay = new Date(year, month + 1, 0);
                        const daysInMonth = lastDay.getDate();
                        const startDayOfWeek = firstDay.getDay();

                        const eventCounts = {};
                        events.forEach(e => {
                            const d = new Date(e.eventDate);
                            if (d.getMonth() === month && d.getFullYear() === year) {
                                const day = d.getDate();
                                eventCounts[day] = (eventCounts[day] || 0) + 1;
                            }
                        });

                        const weeks = [];
                        let currentWeek = [];
                        for (let i = 0; i < (startDayOfWeek === 0 ? 6 : startDayOfWeek - 1); i++) currentWeek.push(null);
                        for (let day = 1; day <= daysInMonth; day++) {
                            currentWeek.push(day);
                            if (new Date(year, month, day).getDay() === 0 || day === daysInMonth) {
                                weeks.push(currentWeek);
                                currentWeek = [];
                            }
                        }
                        while (weeks[weeks.length - 1]?.length < 7) weeks[weeks.length - 1].push(null);

                        const dayHeaders = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
                        const monthName = today.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
                        let busiestDay = null, busiestCount = 0;
                        Object.entries(eventCounts).forEach(([day, count]) => {
                            if (count > busiestCount) { busiestCount = count; busiestDay = parseInt(day); }
                        });
                        const totalThisMonth = Object.values(eventCounts).reduce((a, b) => a + b, 0);

                        return (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 flex flex-col h-full justify-between">
                                <div className="flex items-center justify-between mb-4 px-1 bg-slate-50/50 p-2 rounded-lg border border-dashed border-slate-200">
                                    <h3 className="text-xs font-black text-black capitalize flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                        {monthName}
                                    </h3>
                                    <div className="flex items-center gap-3 text-[10px] tracking-tight">
                                        <span className="text-slate-500 font-bold bg-white px-2 py-0.5 rounded border border-slate-200">Total: <strong className="text-black">{totalThisMonth}</strong></span>
                                        {busiestDay && (
                                            <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                                                Peak: <strong className="text-emerald-900">{busiestDay}/{month + 1}</strong>
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <div className="grid grid-cols-7 gap-1 mb-2">
                                        {dayHeaders.map((d, i) => (
                                            <div key={i} className={cn("text-center text-[10px] font-black uppercase tracking-wider", d === 'CN' ? "text-rose-500" : "text-slate-400")}>{d}</div>
                                        ))}
                                    </div>
                                    <div className="space-y-1">
                                        {weeks.map((week, weekIdx) => (
                                            <div key={weekIdx} className="grid grid-cols-7 gap-1">
                                                {week.map((day, dayIdx) => {
                                                    if (day === null) return <div key={dayIdx} className="h-9"></div>;
                                                    const count = eventCounts[day] || 0;
                                                    const intensity = count === 0 ? 0 : count <= 1 ? 1 : count <= 2 ? 2 : 3;
                                                    const isToday = day === today.getDate(), isBusiest = day === busiestDay && count > 0;
                                                    const bgColors = ['bg-slate-50', 'bg-emerald-100', 'bg-emerald-300', 'bg-emerald-500'];
                                                    const textColors = ['text-slate-300', 'text-emerald-800', 'text-white', 'text-white'];
                                                    return (
                                                        <motion.div
                                                            key={dayIdx}
                                                            whileHover={{ scale: 1.05, y: -2 }}
                                                            className={cn(
                                                                "h-9 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all border shadow-sm relative overflow-hidden",
                                                                bgColors[intensity],
                                                                isToday ? "border-black ring-2 ring-black/5" : "border-black/5",
                                                                isBusiest && "ring-2 ring-amber-400/50 border-amber-400"
                                                            )}
                                                        >
                                                            <span className={cn("text-xs font-black", textColors[intensity], dayIdx === 6 && intensity === 0 && "text-rose-400")}>{day}</span>
                                                            {count > 0 && <span className={cn("text-[9px] font-black -mt-0.5 opacity-90", textColors[intensity])}>{count}</span>}
                                                            {isToday && <div className="absolute top-0 right-0 w-2 h-2 bg-black rounded-bl-lg"></div>}
                                                        </motion.div>
                                                    );
                                                })}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                </DashboardSection>

                {/* 2. Security Watch (Top Right) */}
                <DashboardSection
                    icon={Shield}
                    title="Security Watch"
                    subtitle="Vendor monitoring and safety"
                    gradient="bg-gradient-to-r from-rose-50 via-orange-50 to-rose-50"
                    className="h-full min-h-[420px]"
                    badge={
                        <div className="bg-rose-500 text-white px-3 py-1 rounded-full border-2 border-rose-600 shadow-sm text-[10px] font-black uppercase">
                            {securityStats.totalToday} Active
                        </div>
                    }
                >
                    <div className="h-full flex flex-col">
                        {securityStats.watchList.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center py-12 text-center opacity-60">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border-2 border-dashed border-slate-200">
                                    <Hammer size={32} className="text-slate-200" />
                                </div>
                                <p className="text-slate-400 font-black text-sm uppercase tracking-widest">No active contractors</p>
                            </div>
                        ) : (
                            <div className="space-y-3 flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-100">
                                {securityStats.watchList.map((item, idx) => (
                                    <div key={idx} className={cn(
                                        "flex items-center gap-3 p-3 rounded-xl border-2 transition-all",
                                        item.isToday ? "border-rose-200 bg-rose-50/50 shadow-sm" : "border-slate-100 bg-white"
                                    )}>
                                        <div className={cn(
                                            "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border-2 shadow-sm",
                                            item.isToday ? "bg-rose-500 border-rose-600 text-white" : "bg-slate-50 border-slate-200 text-slate-400"
                                        )}>
                                            <Hammer size={16} strokeWidth={2.5} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-black text-black text-xs truncate uppercase tracking-tight">{item.contractor}</h4>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                                                <p className="text-[10px] text-slate-400 font-bold truncate italic">{item.event}</p>
                                            </div>
                                        </div>
                                        <div className={cn(
                                            "text-[9px] font-black px-2 py-1 rounded-lg uppercase border-2",
                                            item.isToday ? "bg-rose-500 text-white border-rose-600" : "bg-slate-100 text-slate-400 border-slate-200"
                                        )}>
                                            {item.isToday ? "LIVE" : new Date(item.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="mt-4 pt-3 border-t-2 border-dashed border-slate-100 flex items-center justify-center">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full border border-slate-100">End of daily log</span>
                        </div>
                    </div>
                </DashboardSection>

                {/* 3. Upcoming Events (Bottom Left) */}
                <DashboardSection
                    icon={TrendingUp}
                    title="Upcoming Schedule"
                    subtitle="Strategic timeline view"
                    gradient="bg-gradient-to-r from-indigo-50 via-violet-50 to-indigo-50"
                    height="460px"
                >
                    {(() => {
                        const today = new Date();
                        const upcomingList = events
                            .filter(e => new Date(e.eventDate) >= today)
                            .sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate))
                            .slice(0, 10);

                        if (upcomingList.length === 0) {
                            return (
                                <div className="h-full flex flex-col items-center justify-center py-12 text-center opacity-60">
                                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border-2 border-dashed border-slate-200">
                                        <Calendar size={32} className="text-slate-200" />
                                    </div>
                                    <p className="text-slate-400 font-black text-sm uppercase tracking-widest">No upcoming events</p>
                                </div>
                            );
                        }

                        return (
                            <div className="space-y-3 pr-1">
                                {upcomingList.map((event, idx) => {
                                    const eventDate = new Date(event.eventDate);
                                    const daysUntil = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));
                                    const dept = (event.department || 'Other').replace('Phòng ', '').replace('Ban ', '');
                                    const deptColor = DEPT_COLORS[dept] || DEPT_COLORS.default;
                                    return (
                                        <motion.div
                                            key={event._id || idx}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className="flex items-center gap-3 p-3 rounded-xl border-2 border-slate-100 hover:border-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer group bg-white"
                                        >
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 p-[2px] flex-shrink-0 group-hover:rotate-3 transition-transform">
                                                <div className="w-full h-full bg-white rounded-[10px] flex flex-col items-center justify-center">
                                                    <span className="text-sm font-black text-black leading-none">{eventDate.getDate()}</span>
                                                    <span className="text-[9px] font-black text-indigo-500 uppercase leading-none mt-0.5">{eventDate.toLocaleDateString('vi-VN', { month: 'short' })}</span>
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-black text-black text-sm truncate uppercase tracking-tight group-hover:text-indigo-600 transition-colors">{event.eventName || 'Untitled'}</h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <div className={cn("px-2 py-0.5 rounded text-[8px] font-black uppercase text-white shadow-sm", deptColor.bg)}>
                                                        {dept}
                                                    </div>
                                                    <span className="text-[10px] text-slate-400 font-bold italic truncate">{event.location?.[0] || 'TBD'}</span>
                                                </div>
                                            </div>
                                            <div className={cn(
                                                "px-2 py-1 rounded-lg text-[10px] font-black uppercase flex-shrink-0 border-2",
                                                daysUntil === 0
                                                    ? "bg-rose-500 text-white border-rose-600 shadow-[2px_2px_0px_0px_rgba(225,29,72,0.3)]"
                                                    : daysUntil <= 3
                                                        ? "bg-amber-400 text-black border-amber-500 shadow-[2px_2px_0px_0px_rgba(245,158,11,0.3)]"
                                                        : "bg-slate-50 text-slate-400 border-slate-200"
                                            )}>
                                                {daysUntil === 0 ? 'Today' : `${daysUntil}D`}
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        );
                    })()}
                </DashboardSection>

                {/* 4. Instant Contact (Bottom Right) */}
                <DashboardSection
                    icon={Users}
                    title="Direct Support"
                    subtitle="Instant accountability list"
                    gradient="bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50"
                    height="460px"
                >
                    <div className="h-full flex flex-col">
                        <div className="space-y-3 flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-100">
                            {contactStats.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center py-12 text-center opacity-60">
                                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border-2 border-dashed border-slate-200">
                                        <Users size={32} className="text-slate-200" />
                                    </div>
                                    <p className="text-slate-400 font-black text-sm uppercase tracking-widest">No recent contacts</p>
                                </div>
                            ) : (
                                contactStats.map((contact, idx) => (
                                    <div key={idx} className="group p-3 rounded-xl border-2 border-slate-100 hover:border-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all bg-white cursor-pointer overflow-hidden relative">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100 uppercase tracking-tighter">{contact.dept}</span>
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                                                <Clock size={10} />
                                                {contact.time}
                                            </div>
                                        </div>
                                        <h4 className="font-black text-black text-sm truncate mb-2 uppercase tracking-tight group-hover:text-indigo-600 transition-colors">{contact.name}</h4>
                                        <div className="flex items-center justify-between border-t border-dashed border-slate-100 pt-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <div className="w-6 h-6 rounded bg-slate-50 flex items-center justify-center border border-slate-200">
                                                    <Mail size={12} className="text-slate-400" />
                                                </div>
                                                <span className="text-[10px] text-slate-500 truncate font-bold">{contact.registrant}</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <motion.button
                                                    whileHover={{ scale: 1.1, backgroundColor: '#000', color: '#fff' }}
                                                    className="w-8 h-8 rounded-lg bg-slate-50 border-2 border-slate-200 flex items-center justify-center text-slate-400 transition-all shadow-sm"
                                                >
                                                    <Phone size={12} strokeWidth={2.5} />
                                                </motion.button>
                                                <motion.button
                                                    whileHover={{ scale: 1.1, backgroundColor: '#4f46e5', color: '#fff', borderColor: '#4f46e5' }}
                                                    className="w-8 h-8 rounded-lg bg-indigo-50 border-2 border-indigo-100 flex items-center justify-center text-indigo-500 transition-all shadow-sm"
                                                >
                                                    <Mail size={12} strokeWidth={2.5} />
                                                </motion.button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="mt-4 pt-3 border-t-2 border-dashed border-slate-100 flex items-center justify-center">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full border border-slate-100">Contact availability verified</span>
                        </div>
                    </div>
                </DashboardSection>
            </div>
        </div>
    );
};

export default DepartmentGalaxy;
