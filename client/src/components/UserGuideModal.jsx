import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, BookOpen, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { USER_GUIDE_DATA } from '../data/userGuideData';
import { useAuth } from '../context/AuthContext';

const UserGuideModal = ({ isOpen, onClose }) => {
    const { user } = useAuth();
    const role = user?.role || 'user';
    const guideItems = USER_GUIDE_DATA[role] || USER_GUIDE_DATA['user'];

    const [currentIndex, setCurrentIndex] = useState(0);

    if (!isOpen) return null;

    const currentItem = guideItems[currentIndex];
    const Icon = currentItem.icon;

    // Color themes for each step
    const stepColors = ['violet', 'blue', 'emerald', 'orange', 'fuchsia', 'cyan'];
    const currentColor = stepColors[currentIndex % stepColors.length];
    const colorMap = {
        violet: { bg: 'bg-violet-500', light: 'bg-violet-100', text: 'text-violet-600' },
        blue: { bg: 'bg-blue-500', light: 'bg-blue-100', text: 'text-blue-600' },
        emerald: { bg: 'bg-emerald-500', light: 'bg-emerald-100', text: 'text-emerald-600' },
        orange: { bg: 'bg-orange-500', light: 'bg-orange-100', text: 'text-orange-600' },
        fuchsia: { bg: 'bg-fuchsia-500', light: 'bg-fuchsia-100', text: 'text-fuchsia-600' },
        cyan: { bg: 'bg-cyan-500', light: 'bg-cyan-100', text: 'text-cyan-600' },
    };
    const theme = colorMap[currentColor];

    const handleNext = () => {
        if (currentIndex < guideItems.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            onClose();
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                    >
                        {/* Modal - Neubrutalism Style */}
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-2xl w-full max-w-lg overflow-hidden relative"
                        >
                            {/* Decorative Shapes */}
                            <div className="absolute top-4 right-16 w-6 h-6 bg-yellow-400 rounded-full border-2 border-black" />
                            <div className="absolute top-8 right-8 w-4 h-4 bg-cyan-400 rounded border-2 border-black rotate-12" />

                            {/* Header */}
                            <div className="px-6 py-4 border-b-2 border-dashed border-slate-200 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                        <BookOpen size={18} strokeWidth={2.5} className="text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-black flex items-center gap-2">
                                            User Guide
                                            <Sparkles size={14} className="text-amber-500" />
                                        </h3>
                                        <p className="text-xs font-bold text-slate-500">
                                            Step {currentIndex + 1} of {guideItems.length}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="h-9 w-9 flex items-center justify-center bg-slate-100 text-slate-600 border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all cursor-pointer"
                                >
                                    <X size={16} strokeWidth={2.5} />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-6">
                                {/* Step Indicator */}
                                <div className="flex gap-2 mb-6 justify-center">
                                    {guideItems.map((_, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setCurrentIndex(idx)}
                                            className={cn(
                                                "h-2 rounded-full transition-all duration-150 border-2 cursor-pointer",
                                                idx === currentIndex
                                                    ? "w-8 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] " + theme.bg
                                                    : "w-2 border-slate-300 bg-slate-200 hover:border-black"
                                            )}
                                        />
                                    ))}
                                </div>

                                {/* Slide Content */}
                                <div className="text-center space-y-5 min-h-[220px] flex flex-col items-center justify-center">
                                    {/* Icon */}
                                    <div className={cn(
                                        "w-20 h-20 rounded-xl flex items-center justify-center border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                                        theme.bg
                                    )}>
                                        <Icon size={40} strokeWidth={2} className="text-white" />
                                    </div>

                                    {/* Title */}
                                    <h2 className="text-xl font-black text-black">
                                        {currentItem.title}
                                    </h2>

                                    {/* Description */}
                                    <div className="text-slate-600 leading-relaxed font-medium text-left w-full">
                                        {currentItem.description.includes('(') ? (
                                            <div className="space-y-3">
                                                {/* Header text */}
                                                <p className="text-center mb-4 text-sm font-bold text-slate-500">
                                                    {currentItem.description.split(/\(\d+\)/)[0]}
                                                </p>

                                                {/* List Items */}
                                                <ul className="space-y-2">
                                                    {currentItem.description.split(/\(\d+\)/).slice(1).map((item, idx) => (
                                                        <li
                                                            key={idx}
                                                            className="flex gap-3 items-start bg-white p-3 rounded-lg border-2 border-slate-200 hover:border-black hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all cursor-pointer"
                                                        >
                                                            <span className={cn(
                                                                "flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black text-white border-2 border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]",
                                                                theme.bg
                                                            )}>
                                                                {idx + 1}
                                                            </span>
                                                            <span className="text-sm text-slate-700 font-medium">{item.trim()}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ) : (
                                            <p className="text-center text-sm font-bold text-slate-500 bg-slate-50 p-4 rounded-lg border-2 border-dashed border-slate-200">
                                                {currentItem.description}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Navigation */}
                                <div className="flex items-center justify-between mt-6 pt-4 border-t-2 border-dashed border-slate-200">
                                    <button
                                        onClick={handlePrev}
                                        className={cn(
                                            "flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-2 rounded-lg transition-all cursor-pointer",
                                            currentIndex === 0
                                                ? "invisible"
                                                : "bg-white text-slate-600 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px]"
                                        )}
                                    >
                                        <ChevronLeft size={16} strokeWidth={2.5} /> Back
                                    </button>

                                    <button
                                        onClick={handleNext}
                                        className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-lg font-bold border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] transition-all cursor-pointer"
                                    >
                                        {currentIndex === guideItems.length - 1 ? 'Get Started' : 'Next'}
                                        {currentIndex !== guideItems.length - 1 && <ChevronRight size={16} strokeWidth={2.5} />}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default UserGuideModal;
