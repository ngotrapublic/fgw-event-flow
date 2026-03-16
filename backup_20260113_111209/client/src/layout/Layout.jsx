import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import UserGuideModal from '../components/UserGuideModal';
import { Outlet } from 'react-router-dom';

const Layout = ({ children }) => {
    const location = useLocation();
    const [isGuideOpen, setIsGuideOpen] = useState(false);

    // Sidebar collapsed state with localStorage persistence
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        const saved = localStorage.getItem('sidebarCollapsed');
        return saved === 'true';
    });

    // Auto-show guide on first visit
    useEffect(() => {
        const hasSeenGuide = localStorage.getItem('hasSeenUserGuide_v1');
        if (!hasSeenGuide) {
            // Small delay for better UX
            const timer = setTimeout(() => setIsGuideOpen(true), 1000);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleCloseGuide = () => {
        setIsGuideOpen(false);
        localStorage.setItem('hasSeenUserGuide_v1', 'true');
    };

    const handleOpenGuide = () => {
        setIsGuideOpen(true);
    };

    const handleToggleSidebar = () => {
        setSidebarCollapsed(prev => {
            const newValue = !prev;
            localStorage.setItem('sidebarCollapsed', String(newValue));
            return newValue;
        });
    };

    return (
        <div className="flex min-h-screen font-sans">
            <Sidebar
                onOpenGuide={handleOpenGuide}
                collapsed={sidebarCollapsed}
                onToggle={handleToggleSidebar}
            />

            <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'ml-20' : 'ml-72'}`}>
                <Header />

                <main className="flex-1 p-8 print:ml-0 print:p-0">
                    <div className="max-w-7xl mx-auto min-h-[calc(100vh-8rem)]">
                        {children || <Outlet />}
                    </div>
                </main>
            </div>

            <UserGuideModal isOpen={isGuideOpen} onClose={handleCloseGuide} />
        </div>
    );
};

export default Layout;
