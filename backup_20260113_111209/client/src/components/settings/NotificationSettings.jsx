import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Bell, Mail, MessageSquare, Check, X,
    Save, GripVertical, AlertCircle, RefreshCw, Send, Eye, Loader2
} from 'lucide-react';
import { Input } from '../ui/Input';
import { cn } from '../../lib/utils';
import { useToast } from '../Toast';

const NotificationSettings = () => {
    const navigate = useNavigate();
    const { addToast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Initial default state
    const [channels, setChannels] = useState({
        email: true,
        slack: false,
        zalo: false,
        sms: false
    });

    const [templates, setTemplates] = useState([]);

    const [previewTemplate, setPreviewTemplate] = useState(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Fetch settings on mount
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const response = await fetch('http://localhost:5000/api/settings');
                if (response.ok) {
                    const data = await response.json();
                    setChannels({
                        ...data.channels,
                        smtp: data.smtp
                    });
                    if (data.templates) setTemplates(data.templates);
                }
            } catch (error) {
                console.error('Failed to fetch settings:', error);
                addToast('Failed to load settings', 'error');
            } finally {
                setIsLoading(false);
            }
        };

        fetchSettings();
    }, []);

    // Save Settings
    const saveSettings = async () => {
        setIsSaving(true);
        try {
            const { smtp, ...cleanChannels } = channels;
            const settings = {
                channels: cleanChannels,
                templates,
                smtp: smtp
            };
            const response = await fetch('http://localhost:5000/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });

            if (response.ok) {
                addToast('Settings saved successfully', 'success');
                setHasUnsavedChanges(false);
            } else {
                throw new Error('Failed to save');
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            addToast('Failed to save settings', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleChannelChange = (key) => {
        setChannels(prev => ({ ...prev, [key]: !prev[key] }));
        setHasUnsavedChanges(true);
    };

    const handleTemplateToggle = (id) => {
        setTemplates(prev => prev.map(t => t.id === id ? { ...t, active: !t.active } : t));
        setHasUnsavedChanges(true);
    };

    const handleSubjectChange = (id, newSubject) => {
        setTemplates(prev => prev.map(t => t.id === id ? { ...t, subject: newSubject } : t));
        setHasUnsavedChanges(true);
    };

    const handleSendTest = (channel) => {
        addToast(`Test message sent via ${channel}`, 'success');
    };

    // Channel colors
    const channelColors = {
        email: { bg: 'bg-blue-500', light: 'bg-blue-100', text: 'text-blue-600' },
        slack: { bg: 'bg-violet-500', light: 'bg-violet-100', text: 'text-violet-600' },
        zalo: { bg: 'bg-emerald-500', light: 'bg-emerald-100', text: 'text-emerald-600' },
        sms: { bg: 'bg-orange-500', light: 'bg-orange-100', text: 'text-orange-600' },
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="animate-spin text-violet-500" size={40} />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto pb-20 animate-in fade-in duration-500">
            {/* Header - Neubrutalism */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 p-6 bg-white rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/settings')}
                        className="h-10 w-10 flex items-center justify-center bg-slate-100 text-slate-600 border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-slate-200 transition-colors cursor-pointer"
                    >
                        <ArrowLeft size={20} strokeWidth={2.5} />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            <Bell className="text-white" size={24} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-black">Notification Center</h1>
                            <p className="text-slate-500 font-bold text-sm">Configure how and when the system communicates.</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {hasUnsavedChanges && (
                        <span className="text-amber-600 text-sm font-black flex items-center gap-1 bg-amber-100 px-3 py-1.5 rounded-lg border-2 border-black">
                            <AlertCircle size={14} strokeWidth={2.5} /> Unsaved
                        </span>
                    )}
                    <button
                        onClick={saveSettings}
                        disabled={!hasUnsavedChanges || isSaving}
                        className={cn(
                            "flex items-center gap-2 px-5 py-2.5 font-bold border-2 border-black rounded-lg transition-colors cursor-pointer",
                            hasUnsavedChanges
                                ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:opacity-90"
                                : "bg-slate-200 text-slate-400 cursor-not-allowed"
                        )}
                    >
                        {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} strokeWidth={2.5} />}
                        Save Configuration
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Channels */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Delivery Channels Card */}
                    <div className="bg-white rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <div className="p-4 border-b-2 border-dashed border-slate-200 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                <MessageSquare size={18} strokeWidth={2.5} className="text-white" />
                            </div>
                            <h2 className="font-black text-black">Delivery Channels</h2>
                        </div>
                        <div className="p-3 space-y-2">
                            {Object.entries(channels).filter(([key]) => key !== 'smtp').map(([key, enabled]) => {
                                const theme = channelColors[key] || channelColors.email;
                                return (
                                    <div
                                        key={key}
                                        onClick={() => handleChannelChange(key)}
                                        className={cn(
                                            "flex items-center justify-between p-3 rounded-lg border-2 transition-colors cursor-pointer",
                                            enabled
                                                ? `${theme.light} border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]`
                                                : "bg-white border-slate-200 hover:border-black"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "w-10 h-10 rounded-lg flex items-center justify-center border-2 transition-colors",
                                                enabled
                                                    ? `${theme.bg} border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]`
                                                    : "bg-slate-100 border-slate-200"
                                            )}>
                                                {key === 'email' && <Mail size={18} strokeWidth={2.5} className={enabled ? 'text-white' : 'text-slate-500'} />}
                                                {key === 'slack' && <span className={cn("font-black text-lg", enabled ? 'text-white' : 'text-slate-500')}>#</span>}
                                                {key === 'zalo' && <span className={cn("font-black text-[10px] uppercase", enabled ? 'text-white' : 'text-slate-500')}>Zalo</span>}
                                                {key === 'sms' && <span className={cn("font-black text-[10px] uppercase", enabled ? 'text-white' : 'text-slate-500')}>SMS</span>}
                                            </div>
                                            <div>
                                                <p className="font-black text-black capitalize">{key}</p>
                                                <p className={cn("text-xs font-bold", enabled ? theme.text : 'text-slate-400')}>
                                                    {enabled ? 'Active' : 'Disabled'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {enabled && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleSendTest(key); }}
                                                    className="p-2 bg-white border-2 border-black rounded-lg shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:bg-slate-50 transition-colors"
                                                    title="Send Test"
                                                >
                                                    <Send size={12} strokeWidth={2.5} />
                                                </button>
                                            )}
                                            {/* Custom Toggle */}
                                            <div className={cn(
                                                "w-12 h-7 rounded-lg border-2 transition-colors relative",
                                                enabled ? `${theme.bg} border-black` : "bg-slate-200 border-slate-300"
                                            )}>
                                                <div className={cn(
                                                    "absolute top-0.5 w-5 h-5 rounded-md bg-white border-2 border-black transition-all duration-150",
                                                    enabled ? "left-[22px]" : "left-0.5"
                                                )}>
                                                    {enabled && <Check size={12} strokeWidth={3} className="absolute inset-0 m-auto text-black" />}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* SMTP Configuration Card */}
                    <div className="bg-white rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <div className="p-4 border-b-2 border-dashed border-slate-200 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                <AlertCircle size={18} strokeWidth={2.5} className="text-white" />
                            </div>
                            <h2 className="font-black text-black">SMTP Configuration</h2>
                        </div>
                        <div className="p-4 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2">
                                    <label className="block text-xs font-black text-black mb-1.5">SMTP Host</label>
                                    <Input
                                        value={channels.smtp?.host || 'smtp.gmail.com'}
                                        onChange={(e) => setChannels(prev => ({
                                            ...prev,
                                            smtp: { ...prev.smtp, host: e.target.value }
                                        })) || setHasUnsavedChanges(true)}
                                        placeholder="e.g. smtp.gmail.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-black mb-1.5">Port</label>
                                    <Input
                                        value={channels.smtp?.port || '587'}
                                        onChange={(e) => setChannels(prev => ({
                                            ...prev,
                                            smtp: { ...prev.smtp, port: e.target.value }
                                        })) || setHasUnsavedChanges(true)}
                                        placeholder="587"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-black mb-1.5">Secure</label>
                                    <select
                                        className="w-full h-11 px-3 rounded-lg border-2 border-slate-200 text-sm font-bold text-slate-700 hover:border-black focus:border-black focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] outline-none transition-colors cursor-pointer"
                                        value={channels.smtp?.secure ? 'true' : 'false'}
                                        onChange={(e) => setChannels(prev => ({
                                            ...prev,
                                            smtp: { ...prev.smtp, secure: e.target.value === 'true' }
                                        })) || setHasUnsavedChanges(true)}
                                    >
                                        <option value="false">TLS (False)</option>
                                        <option value="true">SSL (True)</option>
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-black text-black mb-1.5">Email User</label>
                                    <Input
                                        value={channels.smtp?.user || ''}
                                        onChange={(e) => setChannels(prev => ({
                                            ...prev,
                                            smtp: { ...prev.smtp, user: e.target.value }
                                        })) || setHasUnsavedChanges(true)}
                                        placeholder="user@example.com"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-black text-black mb-1.5">Password (App Password)</label>
                                    <Input
                                        type="password"
                                        value={channels.smtp?.pass || ''}
                                        onChange={(e) => setChannels(prev => ({
                                            ...prev,
                                            smtp: { ...prev.smtp, pass: e.target.value }
                                        })) || setHasUnsavedChanges(true)}
                                        placeholder={channels.smtp?.isConfigured ? '********' : 'Enter App Password'}
                                    />
                                    {channels.smtp?.isConfigured && (
                                        <p className="text-[10px] text-emerald-600 font-black mt-1.5 flex items-center gap-1 bg-emerald-100 px-2 py-1 rounded border border-emerald-200 w-fit">
                                            <Check size={10} strokeWidth={3} /> Configured securely
                                        </p>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => handleSendTest('email')}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-slate-700 font-bold border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-slate-50 transition-colors cursor-pointer"
                            >
                                <Send size={14} strokeWidth={2.5} /> Send Test Email
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Column: Templates */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <div className="p-4 border-b-2 border-dashed border-slate-200 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                    <Mail size={18} strokeWidth={2.5} className="text-white" />
                                </div>
                                <h2 className="font-black text-black">Email Templates</h2>
                            </div>
                        </div>
                        <div className="p-3 space-y-3">
                            {templates.map((template, idx) => {
                                const colors = ['violet', 'blue', 'emerald', 'orange'];
                                const color = colors[idx % colors.length];
                                const colorMap = {
                                    violet: { bg: 'bg-violet-500', light: 'bg-violet-100' },
                                    blue: { bg: 'bg-blue-500', light: 'bg-blue-100' },
                                    emerald: { bg: 'bg-emerald-500', light: 'bg-emerald-100' },
                                    orange: { bg: 'bg-orange-500', light: 'bg-orange-100' },
                                };
                                const theme = colorMap[color];

                                return (
                                    <div
                                        key={template.id}
                                        className={cn(
                                            "p-4 rounded-lg border-2 transition-colors",
                                            template.active
                                                ? `${theme.light} border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]`
                                                : "bg-slate-50 border-slate-200"
                                        )}
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="cursor-grab text-slate-400 hover:text-black">
                                                    <GripVertical size={16} strokeWidth={2.5} />
                                                </div>
                                                <div>
                                                    <h3 className="font-black text-black">{template.name}</h3>
                                                    <span className="text-[10px] font-black text-slate-500 bg-white px-2 py-0.5 rounded border-2 border-slate-200">
                                                        ID: {template.id}
                                                    </span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleTemplateToggle(template.id)}
                                                className={cn(
                                                    "text-xs font-black px-3 py-1.5 rounded-lg transition-colors border-2 cursor-pointer",
                                                    template.active
                                                        ? "bg-emerald-500 text-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                                        : "bg-slate-200 text-slate-500 border-slate-300 hover:border-black"
                                                )}
                                            >
                                                {template.active ? 'Active' : 'Inactive'}
                                            </button>
                                        </div>

                                        <div className="space-y-3 pl-7">
                                            <div>
                                                <label className="block text-xs font-black text-black mb-1.5">Subject Line</label>
                                                <Input
                                                    value={template.subject}
                                                    onChange={(e) => handleSubjectChange(template.id, e.target.value)}
                                                />
                                            </div>
                                            <div className="flex justify-end">
                                                <button
                                                    onClick={() => setPreviewTemplate(template)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-black text-blue-600 bg-blue-100 border-2 border-black rounded-lg shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:bg-blue-200 transition-colors cursor-pointer"
                                                >
                                                    <Eye size={12} strokeWidth={2.5} /> Preview Email
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="p-4 border-t-2 border-dashed border-slate-200 flex justify-center">
                            <button className="flex items-center gap-2 px-4 py-2.5 bg-white text-blue-600 font-black border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-blue-50 transition-colors cursor-pointer">
                                + Create New Template
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Preview Modal - Neubrutalism */}
            {previewTemplate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b-2 border-black flex justify-between items-center bg-gradient-to-r from-violet-100 to-fuchsia-100">
                            <h3 className="font-black text-black flex items-center gap-2">
                                <Eye size={18} strokeWidth={2.5} /> Email Preview
                            </h3>
                            <button
                                onClick={() => setPreviewTemplate(null)}
                                className="h-8 w-8 flex items-center justify-center bg-white border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                                <X size={16} strokeWidth={2.5} />
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="mb-6 pb-4 border-b-2 border-dashed border-slate-200">
                                <div className="text-xs font-black text-slate-500 uppercase mb-1">Subject</div>
                                <div className="text-lg font-black text-black">{previewTemplate.subject}</div>
                            </div>
                            <div className="bg-amber-100 border-2 border-black rounded-lg p-4 text-amber-800 text-sm font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                <strong>Note:</strong> Content body previews are generated dynamically based on event data. This preview only shows the subject configuration.
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t-2 border-black bg-slate-50 flex justify-end">
                            <button
                                onClick={() => setPreviewTemplate(null)}
                                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-bold border-2 border-black rounded-lg shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:opacity-90 transition-opacity cursor-pointer"
                            >
                                Close Preview
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationSettings;
