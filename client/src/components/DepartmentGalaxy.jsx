import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import {
    TrendingUp, Calendar, Users, Activity, BarChart3, PieChart,
    ArrowUp, ArrowDown, Minus, Clock, Shield, Hammer, Phone, MapPin,
    ArrowRight, Zap
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
    { value: '7days', label: '7 ngày' },
    { value: 'month', label: 'Tháng này' },
    { value: 'quarter', label: 'Quý này' },
    { value: 'year', label: 'Năm nay' },
];

// Helper function to get date range based on period
const getDateRange = (period) => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const quarter = Math.floor(month / 3);

    switch (period) {
        case '7days': {
            const start7 = new Date(today);
            start7.setDate(start7.getDate() - 3);
            const end7 = new Date(today);
            end7.setDate(end7.getDate() + 3);
            return { startDate: start7, endDate: end7 };
        }
        case 'month':
            return {
                startDate: new Date(year, month, 1),
                endDate: new Date(year, month + 1, 0)
            };
        case 'quarter': {
            const quarterStart = quarter * 3;
            return {
                startDate: new Date(year, quarterStart, 1),
                endDate: new Date(year, quarterStart + 3, 0)
            };
        }
        case 'year':
            return {
                startDate: new Date(year, 0, 1),
                endDate: new Date(year, 11, 31)
            };
        default:
            return {
                startDate: new Date(year, 0, 1),
                endDate: new Date(year, 11, 31)
            };
    }
};

const DepartmentGalaxy = () => {
    const [selectedDept, setSelectedDept] = useState(null);
    const [timePeriod, setTimePeriod] = useState('year');
    const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Analytics data from API
    const [analyticsData, setAnalyticsData] = useState({
        stats: [], totalEvents: 0, eventsThisMonth: 0, upcomingEvents: 0, eventsToday: 0,
        monthlyTrend: 0, topDepartment: null, monthlyChartData: [],
        insights: [], heatmapData: [], pieData: [],
        securityStats: { totalToday: 0, watchList: [] }, contactStats: [],
        equipmentUsage: [], locationsUsage: [], // NEW
        hourlyDistribution: [], deptContacts: [] // NEW
    });

    const [bentoTabs, setBentoTabs] = useState({
        bento1: 'heatmap',
        bento2: 'security',
        bento3: 'schedule',
        bento4: 'contact'
    });

    const [selectedDetail, setSelectedDetail] = useState(null); // For Side Drawer / Modal drill-down

    const fetchAnalytics = useCallback(async () => {
        try {
            setIsLoading(true);
            const { startDate: startDateObj, endDate: endDateObj } = getDateRange(timePeriod);
            const startDate = startDateObj.toISOString().split('T')[0];
            const endDate = endDateObj.toISOString().split('T')[0];

            const { default: api } = await import('../services/api');
            const response = await api.get(`/analytics/summary?startDate=${startDate}&endDate=${endDate}`);
            const data = response.data;

            // Transform API response to component format
            const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#f43f5e', '#06b6d4', '#64748b'];

            const pieData = (data.byDepartment || []).slice(0, 6).map((d, i) => ({
                name: d.name,
                value: d.count,
                color: CHART_COLORS[i % CHART_COLORS.length]
            }));

            setAnalyticsData({
                stats: data.byDepartment || [],
                totalEvents: data.totalEvents,
                eventsThisMonth: data.eventsThisMonth,
                upcomingEvents: data.upcomingEvents,
                eventsToday: data.eventsToday || 0,
                eventsNextWeek: data.eventsNextWeek || 0,
                monthlyTrend: data.monthlyTrend,
                topDepartment: data.topDepartment,
                monthlyChartData: (data.trendData || []).slice(-6).map(d => ({ month: d.date.slice(5, 10), events: d.count })),
                heatmapData: data.heatmapData || [],
                pieData,
                securityStats: data.securityStats || { totalToday: 0, watchList: [] },
                contactStats: data.contactStats || [],
                topLocation: data.topLocation || null, // NEW
                equipmentUsage: data.equipmentUsage || [], // NEW
                locationsUsage: data.byLocation || [], // NEW
                hourlyDistribution: data.hourlyDistribution || [], // NEW
                deptContacts: data.deptContacts || [] // NEW
            });
        } catch (error) {
            console.error('[Analytics] Fetch error:', error);
        } finally {
            setIsLoading(false);
        }
    }, [timePeriod]);

    useEffect(() => {
        fetchAnalytics();
    }, [fetchAnalytics]);

    // Set default bento tabs (single mode - no more strategic/operational toggle)
    useEffect(() => {
        setBentoTabs({
            bento1: 'locations', // Location Saturation
            bento2: 'security',  // Security Watch
            bento3: 'schedule',  // Timeline (no hourly peaks)
            bento4: 'locations'  // Location Usage (replaces Recent Activity)
        });
    }, []);

    const { stats, totalEvents, eventsThisMonth, upcomingEvents, eventsToday, monthlyTrend, topDepartment, topLocation, monthlyChartData, heatmapData, pieData, securityStats, contactStats, equipmentUsage, locationsUsage, hourlyDistribution, deptContacts } = analyticsData;

    // KPI cards — sourced directly from backend (not from limited contactStats)
    const todayEvents = eventsToday;
    const nextWeekEvents = analyticsData.eventsNextWeek || 0;

    // [NEW] Fixed Insights: Địa điểm HOT, Phòng ban dẫn đầu, Tổng quan hôm nay
    const insights = React.useMemo(() => {
        const list = [];

        // 1. Địa điểm HOT
        const hotLocation = locationsUsage[0];
        if (hotLocation) {
            list.push({
                type: 'location',
                icon: MapPin,
                title: 'Địa điểm HOT',
                text: hotLocation.name,
                subtext: `${hotLocation.count} sự kiện được tổ chức`,
                color: 'violet'
            });
        } else {
            list.push({
                type: 'location',
                icon: MapPin,
                title: 'Địa điểm HOT',
                text: 'Chưa có dữ liệu',
                subtext: 'Thêm sự kiện để xem',
                color: 'slate'
            });
        }

        // 2. Phòng ban dẫn đầu
        if (topDepartment) {
            list.push({
                type: 'info',
                icon: Users,
                title: 'Phòng ban dẫn đầu',
                text: topDepartment.name,
                subtext: `${topDepartment.percent}% tổng sự kiện`,
                color: 'blue'
            });
        } else {
            list.push({
                type: 'info',
                icon: Users,
                title: 'Phòng ban dẫn đầu',
                text: 'Chưa có dữ liệu',
                subtext: 'Thêm sự kiện để xem',
                color: 'slate'
            });
        }

        // 3. Tổng quan hôm nay (uses server-side todayEvents, not contactStats)
        list.push({
            type: 'today',
            icon: Calendar,
            title: 'Tổng quan hôm nay',
            text: `${todayEvents} sự kiện`,
            subtext: todayEvents > 0 ? 'Đang diễn ra hôm nay' : 'Không có sự kiện hôm nay',
            color: todayEvents > 0 ? 'emerald' : 'slate'
        });

        return list;
    }, [locationsUsage, topDepartment, todayEvents]);
    // Standardized Section Wrapper - Refactored for Tabs
    const DashboardSection = ({ icon: Icon, title, subtitle, badge, gradient, children, className, height = "auto", tabs = [], activeTab, onTabChange }) => (
        <div className={cn(
            "bg-white rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden flex flex-col transition-all",
            className
        )} style={{ height }}>
            <div className={cn("p-4 border-b-2 border-dashed border-slate-200 flex flex-col gap-3", gradient)}>
                <div className="flex items-center justify-between">
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

                {/* Tabs UI */}
                {tabs.length > 0 && (
                    <div className="flex bg-black/5 p-1 rounded-xl border border-black/5">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => onTabChange(tab.id)}
                                className={cn(
                                    "flex-1 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                                    activeTab === tab.id
                                        ? "bg-black text-white shadow-sm"
                                        : "text-slate-500 hover:text-black hover:bg-black/5"
                                )}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            <div className="p-3 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab || 'default'}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                        className="h-full"
                    >
                        {children}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );

    // Derived values for UI
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
                        <div className="flex bg-slate-100 p-1 rounded-xl border-2 border-black/5">
                            {TIME_PERIODS.map(p => (
                                <button
                                    key={p.value}
                                    onClick={() => setTimePeriod(p.value)}
                                    className={cn(
                                        "px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                                        timePeriod === p.value
                                            ? "bg-black text-white shadow-sm"
                                            : "text-slate-400 hover:text-black hover:bg-white"
                                    )}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                        <span className="flex items-center gap-2 px-3 py-1.5 bg-emerald-100 text-emerald-700 font-bold text-xs rounded-full border-2 border-emerald-300">
                            <Activity size={12} strokeWidth={3} className="animate-pulse" />
                            LIVE
                        </span>
                    </div>
                </div>
            </div>

            {/* AI Insights / Operation Briefing Box - Enhanced */}
            {insights.length > 0 && (
                <div className="mb-6 bg-white rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                    <div className={cn(
                        "p-4 border-b-2 border-dashed border-slate-200 flex items-center gap-3 transition-all",
                        "bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50"
                    )}>
                        <div className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
                            "bg-gradient-to-br from-amber-500 to-orange-500"
                        )}>
                            <Zap size={18} className="text-white" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h2 className="font-black text-black">Điểm tin Vận hành</h2>
                            <p className="text-xs text-slate-500 font-medium">
                                Cập nhật nhanh các thông số an ninh & lịch trình hôm nay
                            </p>
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
                                        <div className="flex-1 min-w-0" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
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
            )
            }

            {/* KPI Cards Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {/* Today Events */}
                <div
                    onClick={() => setSelectedDetail({ type: 'kpi', label: 'Today', value: todayEvents, sub: 'Số sự kiện đang diễn ra trong ngày hôm nay', color: 'indigo' })}
                    className="bg-white rounded-xl p-5 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] group hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer"
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] group-hover:rotate-3 transition-transform">
                            <Clock size={18} className="text-white" strokeWidth={2.5} />
                        </div>
                        <span className="text-xs font-black text-indigo-500 uppercase">Live</span>
                    </div>
                    <div className="text-4xl font-black text-black">{todayEvents}</div>
                    <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-tighter">Hôm nay</p>
                </div>

                {/* This Month */}
                <div
                    onClick={() => setSelectedDetail({ type: 'kpi', label: 'Month Activity', value: eventsThisMonth, sub: `Đang tăng trưởng ${monthlyTrend}% so với trước`, color: 'blue' })}
                    className="bg-white rounded-xl p-5 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] group hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer"
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] group-hover:-rotate-3 transition-transform">
                            <Calendar size={18} className="text-white" strokeWidth={2.5} />
                        </div>
                        <div className={cn("flex items-center gap-1 text-xs font-black", trendColor)}>
                            <TrendIcon size={14} strokeWidth={3} />
                            {Math.abs(monthlyTrend)}%
                        </div>
                    </div>
                    <div className="text-4xl font-black text-black">{eventsThisMonth}</div>
                    <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-tighter">Trong tháng này</p>
                </div>

                {/* Upcoming */}
                <div
                    onClick={() => setSelectedDetail({ type: 'kpi', label: 'Upcoming', value: upcomingEvents, sub: 'Những đầu việc đang được chuẩn bị hoặc đang diễn ra', color: 'emerald' })}
                    className="bg-white rounded-xl p-5 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] group hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer"
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] group-hover:scale-110 transition-transform">
                            <TrendingUp size={18} className="text-white" strokeWidth={2.5} />
                        </div>
                        <span className="text-xs font-black text-emerald-500 uppercase">Hoạt động</span>
                    </div>
                    <div className="text-4xl font-black text-black">{upcomingEvents}</div>
                    <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-tighter">Đang & Sắp tới</p>
                </div>

                {/* Next Week */}
                <div
                    onClick={() => setSelectedDetail({ type: 'kpi', label: 'Next Week', value: nextWeekEvents, sub: 'Số sự kiện đã lên lịch cho tuần tới', color: 'amber' })}
                    className="bg-white rounded-xl p-5 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] group hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer"
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] group-hover:skew-x-3 transition-transform">
                            <Calendar size={18} className="text-white" strokeWidth={2.5} />
                        </div>
                        <span className="text-xs font-black text-amber-500 uppercase">Kế hoạch</span>
                    </div>
                    <div className="text-4xl font-black text-black">{nextWeekEvents}</div>
                    <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-tighter">Tuần sau</p>
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
                    <div className="p-4 h-[300px] min-h-[300px]">
                        <ResponsiveContainer width="100%" height="100%" minHeight={300}>
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

                {/* Pie/Donut Chart - Enhanced Design */}
                <div className="bg-white rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                    <div className="p-4 border-b-2 border-dashed border-slate-200 flex items-center gap-3 bg-gradient-to-r from-violet-50 via-fuchsia-50 to-violet-50">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            <PieChart size={18} className="text-white" strokeWidth={2.5} />
                        </div>
                        <div style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
                            <h2 className="font-black text-black">Phân bổ Phòng ban</h2>
                            <p className="text-xs text-slate-500 font-medium">Click vào phòng ban để xem chi tiết</p>
                        </div>
                    </div>
                    <div className="p-4">
                        {/* Chart with center stat */}
                        <div className="relative h-[200px] flex items-center justify-center mb-4">
                            <ResponsiveContainer width="100%" height="100%" minHeight={200}>
                                <RechartsPie>
                                    <defs>
                                        {pieData.map((entry, index) => (
                                            <linearGradient key={`gradient-${index}`} id={`pieGradient-${index}`} x1="0" y1="0" x2="1" y2="1">
                                                <stop offset="0%" stopColor={entry.color} stopOpacity={1} />
                                                <stop offset="100%" stopColor={entry.color} stopOpacity={0.7} />
                                            </linearGradient>
                                        ))}
                                    </defs>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={55}
                                        outerRadius={85}
                                        paddingAngle={3}
                                        dataKey="value"
                                        stroke="#000"
                                        strokeWidth={2}
                                        onClick={(data) => {
                                            const dept = deptContacts.find(d => d.dept === data.name) || {};
                                            setSelectedDetail({
                                                type: 'department',
                                                label: data.name,
                                                value: data.value,
                                                sub: `${Math.round((data.value / totalEvents) * 100)}% tổng sự kiện`,
                                                color: 'violet',
                                                extra: {
                                                    lead: dept.lead || 'Chưa cập nhật',
                                                    phone: dept.phone || 'N/A',
                                                    email: dept.email || 'N/A'
                                                }
                                            });
                                        }}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={`url(#pieGradient-${index})`}
                                                className="hover:opacity-80 transition-opacity"
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#000',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontFamily: "'Be Vietnam Pro', sans-serif",
                                            fontWeight: 'bold'
                                        }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                </RechartsPie>
                            </ResponsiveContainer>
                            {/* Center stat */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="text-center">
                                    <p className="text-3xl font-black text-black">{pieData.length}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phòng ban</p>
                                </div>
                            </div>
                        </div>

                        {/* Horizontal Legend */}
                        <div className="flex flex-wrap gap-2 justify-center" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
                            {pieData.slice(0, 5).map((item, idx) => {
                                const dept = deptContacts.find(d => d.dept === item.name) || {};
                                const percent = Math.round((item.value / totalEvents) * 100);
                                return (
                                    <motion.div
                                        key={idx}
                                        whileHover={{ scale: 1.05, y: -2 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="flex items-center gap-2 cursor-pointer bg-slate-50 hover:bg-white px-3 py-2 rounded-lg border-2 border-transparent hover:border-black hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                                        onClick={() => setSelectedDetail({
                                            type: 'department',
                                            label: item.name,
                                            value: item.value,
                                            sub: `${percent}% tổng sự kiện`,
                                            color: 'violet',
                                            extra: {
                                                lead: dept.lead || 'Chưa cập nhật',
                                                phone: dept.phone || 'N/A',
                                                email: dept.email || 'N/A'
                                            }
                                        })}
                                    >
                                        <div
                                            className="w-3 h-3 rounded-full border-2 border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                                            style={{ backgroundColor: item.color }}
                                        />
                                        <span className="text-xs font-bold text-slate-700 truncate max-w-[80px]">{item.name}</span>
                                        <span className="text-xs font-black text-black bg-white px-1.5 py-0.5 rounded border border-black">{percent}%</span>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Dashboard Bottom Section - Perfectly Balanced 2x2 Bento Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">

                {/* 1. Monthly Calendar Heatmap (Top Left) */}
                <DashboardSection
                    icon={Calendar}
                    title="Monthly Activity"
                    subtitle="Lịch tháng này"
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

                        // Build eventCounts from heatmapData (from analytics API)
                        const eventCounts = {};
                        (heatmapData || []).forEach(item => {
                            const d = new Date(item.date);
                            if (d.getMonth() === month && d.getFullYear() === year) {
                                const day = d.getDate();
                                eventCounts[day] = item.count || 0;
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
                                                            onClick={() => count > 0 && setSelectedDetail({ type: 'day', day, month, year, data: heatmapData.find(d => new Date(d.date).getDate() === day) })}
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

                {/* 2. Security Watch (Top Right) - Tabbed */}
                <DashboardSection
                    icon={Shield}
                    title="Security Watch"
                    subtitle="Contractor monitoring"
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

                {/* 3. Upcoming Timeline (Bottom Left) */}
                <DashboardSection
                    icon={TrendingUp}
                    title="Lịch sắp tới"
                    subtitle="Các sự kiện trong 7 ngày tới"
                    gradient="bg-gradient-to-r from-indigo-50 via-violet-50 to-indigo-50"
                    height="460px"
                >
                    {(() => {
                        const upcomingList = contactStats || [];
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

                        const today = new Date();
                        return (
                            <div className="space-y-3 pr-1">
                                {upcomingList.slice(0, 10).map((event, idx) => {
                                    const eventDate = new Date(event.eventDate);
                                    const daysUntil = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));
                                    const dept = (event.department || 'Other').replace('Phòng ', '').replace('Ban ', '');
                                    const deptColor = DEPT_COLORS[dept] || DEPT_COLORS.default;
                                    return (
                                        <motion.div
                                            key={event.id || idx}
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
                                                    <span className="text-[10px] text-slate-400 font-bold italic truncate">{event.location || 'TBD'}</span>
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

                {/* 4. Location Usage (Bottom Right) */}
                <DashboardSection
                    icon={MapPin}
                    title="Thống kê Địa điểm"
                    subtitle="Các vị trí được sử dụng nhiều nhất"
                    gradient="bg-gradient-to-r from-violet-50 via-purple-50 to-violet-50"
                    height="460px"
                    badge={
                        <div className="bg-violet-500 text-white px-3 py-1 rounded-full border-2 border-violet-600 shadow-sm text-[10px] font-black uppercase">
                            {locationsUsage.length} Locations
                        </div>
                    }
                >
                    <div className="h-full flex flex-col">
                        {locationsUsage.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center py-12 text-center opacity-60">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border-2 border-dashed border-slate-200">
                                    <MapPin size={32} className="text-slate-200" />
                                </div>
                                <p className="text-slate-400 font-black text-sm uppercase tracking-widest">No location data</p>
                            </div>
                        ) : (
                            <div className="space-y-3 flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-100">
                                {locationsUsage.slice(0, 8).map((loc, idx) => {
                                    const maxCount = Math.max(...locationsUsage.map(l => l.count));
                                    const percentage = maxCount > 0 ? (loc.count / maxCount) * 100 : 0;
                                    const LOCATION_COLORS = [
                                        'from-violet-500 to-purple-500',
                                        'from-blue-500 to-indigo-500',
                                        'from-emerald-500 to-teal-500',
                                        'from-amber-500 to-orange-500',
                                        'from-rose-500 to-pink-500',
                                        'from-cyan-500 to-blue-500',
                                        'from-fuchsia-500 to-purple-500',
                                        'from-lime-500 to-green-500'
                                    ];
                                    const colorClass = LOCATION_COLORS[idx % LOCATION_COLORS.length];

                                    return (
                                        <motion.div
                                            key={idx}
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            onClick={() => setSelectedDetail({ type: 'location', label: loc.name, value: loc.count, sub: `${loc.percent}% tổng sự kiện`, color: 'violet' })}
                                            className="p-3 rounded-xl border-2 border-slate-100 bg-white hover:border-black hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer"
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className={cn("w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center border-2 border-black shadow-sm", colorClass)}>
                                                        <MapPin size={14} className="text-white" />
                                                    </div>
                                                    <span className="text-xs font-black text-black uppercase tracking-tight">{loc.name}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black text-slate-400">{loc.percent}%</span>
                                                    <span className="text-sm font-black text-black bg-violet-100 px-2 py-0.5 rounded border border-violet-200">{loc.count}</span>
                                                </div>
                                            </div>
                                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${percentage}%` }}
                                                    transition={{ delay: idx * 0.1, duration: 0.5 }}
                                                    className={cn("h-full rounded-full bg-gradient-to-r", colorClass)}
                                                />
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                        <div className="mt-4 pt-3 border-t-2 border-dashed border-slate-100 flex items-center justify-center">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full border border-slate-100">Top locations by usage</span>
                        </div>
                    </div>
                </DashboardSection>
            </div>
            {/* Side Detail Modal (Drill-down Drawer) NEW */}
            <AnimatePresence>
                {selectedDetail && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedDetail(null)}
                            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[100]"
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white border-l-4 border-black z-[101] shadow-[-10px_0px_30px_rgba(0,0,0,0.2)] flex flex-col"
                        >
                            <div className="p-6 border-b-2 border-dashed border-slate-200 bg-slate-50">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-12 h-12 rounded-xl bg-black flex items-center justify-center text-white shadow-[3px_3px_0px_0px_rgba(99,102,241,1)]">
                                        <Activity size={24} />
                                    </div>
                                    <button
                                        onClick={() => setSelectedDetail(null)}
                                        className="w-10 h-10 rounded-full border-2 border-black flex items-center justify-center hover:bg-black hover:text-white transition-colors"
                                    >
                                        <ArrowRight size={20} />
                                    </button>
                                </div>
                                <h3 className="text-2xl font-black text-black uppercase tracking-tight">Detail View</h3>
                                <p className="text-sm font-bold text-slate-500 uppercase">Analysis for selected item</p>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {selectedDetail.type === 'day' && (
                                    <div className="space-y-4">
                                        <div className="p-4 rounded-xl border-2 border-black bg-emerald-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                            <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">Selected Date</p>
                                            <p className="text-xl font-black text-black">
                                                {selectedDetail.day}/{selectedDetail.month + 1}/{selectedDetail.year}
                                            </p>
                                            <p className="text-sm font-bold text-emerald-700 mt-1">
                                                {selectedDetail.data?.count || 0} events scheduled.
                                            </p>
                                        </div>

                                        <div className="space-y-2">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Note</p>
                                            <div className="p-4 rounded-xl border-2 border-dashed border-slate-200 bg-white">
                                                <p className="text-xs text-slate-500 font-bold leading-relaxed italic">
                                                    "Detailed event list drill-down is available in the main Event Dashboard. This view focuses on aggregate metrics and operational capacity."
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {selectedDetail.type === 'kpi' && (
                                    <div className="space-y-4">
                                        <div className={cn(
                                            "p-6 rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                                            `bg-${selectedDetail.color}-50`
                                        )}>
                                            <p className={cn("text-[10px] font-black uppercase mb-1", `text-${selectedDetail.color}-600`)}>{selectedDetail.label}</p>
                                            <p className="text-5xl font-black text-black">{selectedDetail.value}</p>
                                            <p className="text-sm font-bold text-slate-600 mt-2">{selectedDetail.sub}</p>
                                        </div>

                                        <div className="p-4 rounded-xl border-2 border-black bg-white">
                                            <h4 className="font-black text-black text-xs uppercase mb-3 px-1">Quick Actions</h4>
                                            <div className="grid grid-cols-2 gap-2">
                                                <button className="p-3 bg-slate-50 rounded-lg border-2 border-slate-100 font-black text-[10px] uppercase hover:border-black transition-all">Export CSV</button>
                                                <button className="p-3 bg-slate-50 rounded-lg border-2 border-slate-100 font-black text-[10px] uppercase hover:border-black transition-all">Print Report</button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {selectedDetail.type === 'department' && (
                                    <div className="space-y-4" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
                                        <div className="p-6 rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-violet-50">
                                            <p className="text-[10px] font-black uppercase mb-1 text-violet-600">Phòng ban</p>
                                            <p className="text-3xl font-black text-black">{selectedDetail.label}</p>
                                            <p className="text-sm font-bold text-slate-600 mt-2">{selectedDetail.sub}</p>
                                        </div>

                                        <div className="p-4 rounded-xl border-2 border-black bg-white">
                                            <h4 className="font-black text-black text-xs uppercase mb-4 px-1">Thống kê</h4>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="p-3 bg-violet-50 rounded-lg border border-violet-100">
                                                    <p className="text-[10px] font-black text-violet-500 uppercase">Tổng sự kiện</p>
                                                    <p className="text-2xl font-black text-black">{selectedDetail.value}</p>
                                                </div>
                                                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                                                    <p className="text-[10px] font-black text-blue-500 uppercase">Tỷ trọng</p>
                                                    <p className="text-2xl font-black text-black">{selectedDetail.sub?.split('%')[0]}%</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-4 rounded-xl border-2 border-black bg-white">
                                            <h4 className="font-black text-black text-xs uppercase mb-4 px-1">Thông tin liên hệ</h4>
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center border-2 border-black">
                                                        <Users size={16} className="text-white" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase">Trưởng phòng</p>
                                                        <p className="text-sm font-black text-black">{selectedDetail.extra?.lead}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center border-2 border-black">
                                                        <Phone size={16} className="text-white" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase">Điện thoại</p>
                                                        <p className="text-sm font-black text-black">{selectedDetail.extra?.phone}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="p-6 bg-slate-50 border-t-2 border-dashed border-slate-200">
                                <button
                                    onClick={() => setSelectedDetail(null)}
                                    className="w-full py-4 bg-black text-white font-black uppercase tracking-widest rounded-xl shadow-[4px_4px_0px_0px_rgba(99,102,241,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
                                >
                                    Close Analysis
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div >
    );
};

export default DepartmentGalaxy;
