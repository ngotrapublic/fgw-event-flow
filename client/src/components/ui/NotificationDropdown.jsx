import React, { useState } from 'react';
import { Bell, Check, Info, AlertTriangle, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { Button } from './Button';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';

const NotificationDropdown = () => {
    const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();

    const toggleOpen = () => setIsOpen(!isOpen);

    const getIcon = (type) => {
        switch (type) {
            case 'success': return <CheckCircle size={16} className="text-emerald-500" />;
            case 'warning': return <AlertTriangle size={16} className="text-amber-500" />;
            case 'error': return <XCircle size={16} className="text-red-500" />;
            case 'info': default: return <Info size={16} className="text-blue-500" />;
        }
    };

    const handleItemClick = (notif) => {
        markAsRead(notif.id);
        setIsOpen(false);

        // Navigate if eventId exists
        if (notif.data && notif.data.eventId) {
            navigate(`/?eventId=${notif.data.eventId}`);
        }
    };

    return (
        <div className="relative z-50">
            {/* Trigger Button */}
            <button
                onClick={toggleOpen}
                className="relative p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-700 outline-none"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full animate-pulse"></span>
                )}
            </button>

            {/* Dropdown Content */}
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
                    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                        <div className="flex items-center justify-between p-4 border-b border-slate-50 bg-slate-50/50 backdrop-blur-sm">
                            <h3 className="font-semibold text-slate-800 text-sm">Notifications</h3>
                            <div className="flex items-center gap-1">
                                {unreadCount > 0 && (
                                    <button
                                        onClick={markAllAsRead}
                                        className="text-[10px] text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 transition-colors"
                                        title="Mark all as read"
                                    >
                                        <Check size={12} /> Read All
                                    </button>
                                )}
                                {notifications.length > 0 && (
                                    <button
                                        onClick={clearAll}
                                        className="text-[10px] text-red-500 hover:text-red-600 font-medium flex items-center gap-1 px-2 py-1 rounded bg-red-50 hover:bg-red-100 transition-colors"
                                        title="Clear all notifications"
                                    >
                                        <Trash2 size={12} /> Clear
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center">
                                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Bell size={20} className="text-slate-300" />
                                    </div>
                                    <p className="text-sm text-slate-500">No notifications yet</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-50">
                                    {notifications.map((notif) => (
                                        <div
                                            key={notif.id}
                                            className={cn(
                                                "p-4 hover:bg-slate-50 transition-colors cursor-pointer group relative",
                                                !notif.isRead ? "bg-blue-50/30" : ""
                                            )}
                                            onClick={() => handleItemClick(notif)}
                                        >
                                            <div className="flex gap-3 items-start">
                                                <div className={cn(
                                                    "mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                                                    !notif.isRead ? "bg-white shadow-sm ring-1 ring-slate-100" : "bg-slate-50"
                                                )}>
                                                    {getIcon(notif.type)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2 mb-0.5">
                                                        <p className={cn("text-sm font-medium leading-none", !notif.isRead ? "text-slate-900" : "text-slate-700")}>
                                                            {notif.title}
                                                        </p>
                                                        {!notif.isRead && (
                                                            <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1"></div>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                                                        {notif.message}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 mt-2 font-medium">
                                                        {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default NotificationDropdown;
