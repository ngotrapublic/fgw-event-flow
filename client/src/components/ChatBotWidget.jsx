import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, animate } from 'framer-motion';
import { X, Send, Loader2, Sparkles, AlertCircle, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const CUTE_GREETINGS = [
    "Chào bạn! Cần tạo sự kiện hay tìm phòng họp không? 🦁✨",
    "Tớ là linh vật Greenwich AI đây! Bấm vào đây chat với tớ nhé! 🎓",
    "Hôm nay có sự kiện gì hot không ta? Hỏi tớ ngay nè! 📅",
    "Bíp bíp! Sư tử Greenwich sẵn sàng nhận lệnh từ bạn! 🚀",
    "Tớ có thể giúp bạn tạo nháp sự kiện siêu nhanh trong 5 giây! ⚡",
    "Cần kiểm tra hội trường hay thiết bị âm thanh? Nhắn tớ nha! 🎤",
    "Greenwich AI đã sẵn sàng! Bạn cần hỗ trợ gì hôm nay? 💖"
];

const formatMarkdown = (text) => {
    if (!text) return { __html: '' };
    let formatted = text
        .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-[#003882]">$1</strong>')
        .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
        .replace(/^- (.*)$/gm, '<li class="ml-4 list-disc">$1</li>');
    
    formatted = formatted.replace(/(<li.*<\/li>(\n|$))+/g, '<ul class="my-1">$&</ul>');
    formatted = formatted.replace(/\n/g, '<br/>');
    formatted = formatted.replace(/<br\/>(?=<ul)/g, '').replace(/<\/ul><br\/>/g, '</ul>');
    
    return { __html: formatted };
};

const MascotAvatar = ({ 
    isMini = false, 
    isCloseMode = false, 
    isHovered = false, 
    isDragging = false,
    isLeftHalf = false 
}) => {
    if (isMini && isCloseMode) {
        return (
            <div className="relative flex items-center justify-center w-full h-full">
                <div className="relative w-11 h-11 rounded-full overflow-hidden border-2 border-slate-800 bg-white shadow-md">
                    <img 
                        src="/assets/greenwich-mascot.png" 
                        alt="Greenwich Mascot" 
                        className="w-full h-full object-cover object-top scale-125 translate-y-1 pointer-events-none"
                    />
                </div>
                <div className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white rounded-full p-1 shadow-md border-2 border-white flex items-center justify-center">
                    <X size={14} strokeWidth={3} />
                </div>
            </div>
        );
    }

    // Seamless Organic Character Motion Timeline (Hands, legs 100% attached to clothes)
    // - Fixed scale (no zoom, feet 100% visible on ground at all times)
    // - Ambient Aurora Glow (Breathing royal blue & Greenwich gold aura)
    // - Ground Hologram Pedestal (High-tech energy rings and dynamic contact shadow)
    // - Pendulum hip sway & 3D perspective shoulder turn (rotateY)
    // - Organic squash & stretch elasticity (scaleY / scaleX)
    const animTimes = [0, 0.09, 0.18, 0.27, 0.36, 0.45, 0.54, 0.63, 0.72, 0.81, 0.90, 1.0];
    const baseTorsoTurn = isLeftHalf ? 6 : -4;

    return (
        <div className="relative flex flex-col items-center justify-end select-none">
            {/* Ambient Aurora Glow (Hào quang ánh sáng công nghệ Greenwich) */}
            <div className="absolute -inset-6 flex items-center justify-center pointer-events-none -z-10">
                {/* Outer Breathing Aurora */}
                <motion.div
                    animate={isHovered ? {
                        scale: [1.15, 1.35, 1.15],
                        opacity: [0.65, 0.9, 0.65]
                    } : isDragging ? {
                        scale: 1.25,
                        opacity: 0.85
                    } : {
                        scale: [0.95, 1.12, 0.95],
                        opacity: [0.35, 0.6, 0.35]
                    }}
                    transition={{
                        repeat: Infinity,
                        duration: isHovered ? 1.4 : 3.6,
                        ease: "easeInOut"
                    }}
                    className="w-32 h-32 rounded-full bg-gradient-to-tr from-[#003882]/40 via-[#F58220]/35 to-transparent blur-xl"
                />
                
                {/* Inner Warm Gold Energy Core */}
                <motion.div
                    animate={isHovered ? {
                        scale: [1.1, 1.25, 1.1],
                        opacity: [0.75, 0.95, 0.75]
                    } : {
                        scale: [0.9, 1.05, 0.9],
                        opacity: [0.35, 0.6, 0.35]
                    }}
                    transition={{
                        repeat: Infinity,
                        duration: isHovered ? 1.2 : 2.8,
                        ease: "easeInOut",
                        delay: 0.2
                    }}
                    className="absolute w-20 h-20 rounded-full bg-gradient-to-br from-[#F58220]/35 via-amber-300/30 to-[#003882]/25 blur-lg"
                />
            </div>

            {/* Hover Magic Sparkles */}
            <AnimatePresence>
                {isHovered && (
                    <>
                        <motion.div 
                            initial={{ opacity: 0, scale: 0, y: 5 }}
                            animate={{ opacity: 1, scale: [1, 1.3, 1], rotate: [0, 20, -15, 0] }}
                            exit={{ opacity: 0, scale: 0 }}
                            transition={{ repeat: Infinity, duration: 1.0 }}
                            className="absolute -top-2 left-2 text-amber-400 text-sm pointer-events-none z-30 drop-shadow-sm"
                        >
                            ✨
                        </motion.div>
                        <motion.div 
                            initial={{ opacity: 0, scale: 0, y: 5 }}
                            animate={{ opacity: 1, scale: [1, 1.2, 1], rotate: [0, -15, 20, 0] }}
                            exit={{ opacity: 0, scale: 0 }}
                            transition={{ repeat: Infinity, duration: 1.2, delay: 0.2 }}
                            className="absolute top-3 right-0 text-amber-400 text-xs pointer-events-none z-30 drop-shadow-sm"
                        >
                            ⭐
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Cute Waving Greeting Badge */}
            <motion.div
                animate={isHovered ? {
                    opacity: 1,
                    scale: 1.1,
                    y: -4
                } : {
                    opacity: [0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0],
                    scale: [0, 0, 0, 0, 0, 1.15, 1.0, 1.1, 0, 0, 0, 0],
                    y: [5, 5, 5, 5, 5, -3, 0, -2, 5, 5, 5, 5]
                }}
                transition={isHovered ? {
                    duration: 0.2
                } : {
                    repeat: Infinity,
                    duration: 6.8,
                    ease: "easeInOut",
                    times: animTimes
                }}
                className={`absolute -top-3 ${isLeftHalf ? 'left-0' : 'right-0'} z-30 pointer-events-none`}
            >
                <div className="bg-white/95 backdrop-blur-sm border-2 border-amber-400 text-amber-600 rounded-full px-2.5 py-0.5 shadow-lg flex items-center gap-1">
                    <motion.span 
                        animate={{ rotate: [0, 25, -15, 25, 0] }} 
                        transition={{ repeat: Infinity, duration: 0.6, ease: "easeInOut" }}
                        className="text-sm inline-block origin-bottom-right"
                    >
                        👋
                    </motion.span>
                    <span className="text-[11px] text-slate-800 font-black tracking-tight">
                        {isHovered ? "Chat với tớ nhé!" : "Chào bạn!"}
                    </span>
                </div>
            </motion.div>

            {/* Seamless Living Character (100% intact image: hands, legs, clothes attached) */}
            <motion.div
                animate={isHovered ? {
                    x: 2,
                    y: [-4, -8, -4],
                    rotate: [3, 6, 3],
                    rotateY: baseTorsoTurn + 8,
                    skewX: 1.5,
                    scaleY: [1.02, 1.05, 1.02],
                    scaleX: [0.99, 0.97, 0.99]
                } : {
                    // Stride sway and weight shifting (x translation)
                    x: [0, -4, 0, 4, 0, 2, 4, 2, 0, -3, 0, 0],
                    // Footstep cadence & cheerful bounce (y translation)
                    y: [0, 2, -5, 2, -5, 0, -6, 1, -5, 2, -4, 0],
                    // Natural spine sway & greeting tilt
                    rotate: [0, -2.5, 0, 2.5, 0, 3.5, 4.5, 2.5, 4.0, -2.5, 0, 0],
                    // 3D Perspective torso twist (shoulders turning naturally towards screen center)
                    rotateY: [baseTorsoTurn, baseTorsoTurn - 6, baseTorsoTurn, baseTorsoTurn + 6, baseTorsoTurn, baseTorsoTurn + 4, baseTorsoTurn + 6, baseTorsoTurn + 2, baseTorsoTurn + 5, baseTorsoTurn - 6, baseTorsoTurn, baseTorsoTurn],
                    // Organic waist shear / flexibility
                    skewX: [0, -2.0, 0, 2.0, 0, 2.2, 3.0, 1.5, 2.2, -2.0, 0, 0],
                    // Squash & Stretch: vertical elasticity of knees & spine
                    scaleY: [1.0, 0.97, 1.03, 0.97, 1.03, 1.0, 1.04, 0.97, 1.03, 0.97, 1.02, 1.0],
                    // Volume preservation: horizontal compensation
                    scaleX: [1.0, 1.02, 0.98, 1.02, 0.98, 1.0, 0.97, 1.02, 0.98, 1.02, 0.99, 1.0]
                }}
                transition={isHovered ? {
                    repeat: Infinity,
                    duration: 1.2,
                    ease: "easeInOut"
                } : {
                    repeat: Infinity,
                    duration: 6.8,
                    ease: "easeInOut",
                    times: animTimes
                }}
                className="relative z-10 origin-bottom cursor-pointer drop-shadow-[0_14px_22px_rgba(0,56,130,0.32)]"
            >
                <img 
                    src="/assets/greenwich-mascot.png" 
                    alt="Greenwich Lion Mascot" 
                    className="w-[86px] sm:w-[92px] h-auto object-contain pointer-events-none"
                    draggable="false"
                />
            </motion.div>

            {/* High-Tech Holographic Energy Pedestal & Ground Contact Shadow */}
            <div className="relative flex flex-col items-center justify-center -mt-1 pointer-events-none z-0">
                {/* Holographic Rotating Concentric Ring */}
                <motion.div
                    animate={{
                        rotate: 360,
                        scale: isHovered ? [1.05, 1.18, 1.05] : [0.95, 1.05, 0.95]
                    }}
                    transition={{
                        rotate: { repeat: Infinity, duration: 10, ease: "linear" },
                        scale: { repeat: Infinity, duration: 2.5, ease: "easeInOut" }
                    }}
                    className="absolute -top-1 w-20 h-5 rounded-[100%] border border-amber-400/50 border-dashed opacity-80"
                />

                {/* Outer Tech Pulse Ring */}
                <motion.div
                    animate={{
                        rotate: -360,
                        scale: isHovered ? [1.12, 1.25, 1.12] : [1.0, 1.08, 1.0],
                        opacity: isHovered ? 0.7 : 0.4
                    }}
                    transition={{
                        rotate: { repeat: Infinity, duration: 16, ease: "linear" },
                        scale: { repeat: Infinity, duration: 3, ease: "easeInOut" }
                    }}
                    className="absolute -top-1.5 w-24 h-6 rounded-[100%] border border-[#003882]/40 border-dotted"
                />

                {/* Hologram Core Glow Beam */}
                <motion.div
                    animate={{
                        opacity: isHovered ? [0.65, 0.9, 0.65] : [0.35, 0.55, 0.35],
                        scaleX: isHovered ? 1.15 : 1.0
                    }}
                    transition={{ repeat: Infinity, duration: 2.0, ease: "easeInOut" }}
                    className="absolute -top-0.5 w-16 h-3 rounded-[100%] bg-gradient-to-r from-[#003882]/40 via-amber-400/60 to-[#003882]/40 blur-[2px]"
                />

                {/* Dynamic Organic Ground Shadow */}
                <motion.div 
                    animate={isHovered ? {
                        scaleX: [1.05, 0.9, 1.05],
                        opacity: [0.4, 0.25, 0.4]
                    } : { 
                        scaleX: [1.0, 1.15, 0.85, 1.15, 0.85, 1.0, 0.85, 1.15, 0.90, 1.15, 0.90, 1.0],
                        opacity: [0.35, 0.45, 0.22, 0.45, 0.22, 0.35, 0.20, 0.48, 0.25, 0.45, 0.25, 0.35] 
                    }}
                    transition={isHovered ? {
                        repeat: Infinity,
                        duration: 1.2,
                        ease: "easeInOut"
                    } : { 
                        repeat: Infinity, 
                        duration: 6.8, 
                        ease: "easeInOut",
                        times: animTimes
                    }}
                    className="w-16 h-2.5 bg-blue-950/45 rounded-full blur-[3px]"
                />
            </div>
        </div>
    );
};

const ChatBotWidget = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const messagesEndRef = useRef(null);
    const dragConstraintsRef = useRef(null);
    const widgetRef = useRef(null);
    const isDraggingRef = useRef(false);
    const [isTopHalf, setIsTopHalf] = useState(false);
    const [isLeftHalf, setIsLeftHalf] = useState(false);

    // Motion values for smooth magnetic edge snapping
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    // Helper to calculate safe left docking position avoiding sidebar collision
    const getSafeLeft = () => {
        const sidebar = document.querySelector('aside');
        if (sidebar) {
            const rect = sidebar.getBoundingClientRect();
            if (rect.width > 0 && rect.right > 0 && rect.left >= 0 && rect.right < window.innerWidth / 2) {
                return rect.right + 20; // 20px comfortable spacing beside the dashboard sidebar
            }
        }
        return window.innerWidth < 640 ? 16 : 24;
    };

    const handleDragStart = () => {
        isDraggingRef.current = true;
        setIsDragging(true);
        setIsHovered(false);
    };

    const handleDrag = (event, info) => {
        if (info && info.point) {
            const safeLeft = getSafeLeft();
            const rightMargin = window.innerWidth < 640 ? 16 : 24;
            const distToLeft = Math.abs(info.point.x - safeLeft);
            const distToRight = Math.abs(window.innerWidth - rightMargin - info.point.x);
            const currentToLeft = distToLeft < distToRight;
            if (currentToLeft !== isLeftHalf) {
                setIsLeftHalf(currentToLeft);
            }
        }
    };

    const handleDragEnd = (event, info) => {
        setTimeout(() => {
            isDraggingRef.current = false;
            setIsDragging(false);
        }, 150);

        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const currentPointX = info?.point?.x ?? windowWidth;
        const currentPointY = info?.point?.y ?? windowHeight;

        const safeLeft = getSafeLeft();
        const rightMargin = windowWidth < 640 ? 16 : 24;
        const distToLeft = Math.abs(currentPointX - safeLeft);
        const distToRight = Math.abs(windowWidth - rightMargin - currentPointX);
        const toLeft = distToLeft < distToRight;
        const toTop = currentPointY < windowHeight / 2;

        setIsLeftHalf(toLeft);
        setIsTopHalf(toTop);

        const chatWidth = windowWidth < 640 ? Math.min(320, windowWidth - (rightMargin * 2)) : 384;
        const currentWidth = isOpen ? chatWidth : 100;
        
        // Exact formula so the left edge lands cleanly at safeLeft (outside sidebar)
        const targetX = toLeft ? (safeLeft + currentWidth + rightMargin - windowWidth) : 0;

        // Apple AssistiveTouch-style spring snap physics
        animate(x, targetX, {
            type: "spring",
            stiffness: 380,
            damping: 26,
            restDelta: 0.5
        });

        // Viewport bounds safe clamping for Y (so mascot and header/bottom never overlap or clip)
        const elementHeight = isOpen ? 580 : 150;
        const safeTop = 32;
        const minY = -(windowHeight - rightMargin - safeTop - elementHeight);
        const maxY = 0;
        const currentY = y.get();

        if (currentY < minY) {
            animate(y, minY, { type: "spring", stiffness: 350, damping: 26 });
        } else if (currentY > maxY) {
            animate(y, maxY, { type: "spring", stiffness: 350, damping: 26 });
        }
    };

    // Re-dock smoothly when chat opens/closes or window/sidebar resizes while docked to the left edge
    useEffect(() => {
        const updatePosition = () => {
            if (isLeftHalf) {
                const windowWidth = window.innerWidth;
                const rightMargin = windowWidth < 640 ? 16 : 24;
                const chatWidth = windowWidth < 640 ? Math.min(320, windowWidth - (rightMargin * 2)) : 384;
                const currentWidth = isOpen ? chatWidth : 100;
                const safeLeft = getSafeLeft();
                const targetX = safeLeft + currentWidth + rightMargin - windowWidth;
                animate(x, targetX, {
                    type: "spring",
                    stiffness: 380,
                    damping: 28
                });
            }
        };

        updatePosition();
        window.addEventListener('resize', updatePosition);

        // Auto-adjust when sidebar expands/collapses
        const sidebar = document.querySelector('aside');
        let observer;
        if (sidebar && window.ResizeObserver) {
            observer = new ResizeObserver(() => {
                updatePosition();
            });
            observer.observe(sidebar);
        }

        return () => {
            window.removeEventListener('resize', updatePosition);
            if (observer) observer.disconnect();
        };
    }, [isOpen, isLeftHalf]);

    // Only show if user is logged in
    if (!user) return null;

    // Pick a random greeting every time the widget closes
    const [randomGreeting, setRandomGreeting] = useState(CUTE_GREETINGS[0]);
    useEffect(() => {
        if (!isOpen) {
            setRandomGreeting(CUTE_GREETINGS[Math.floor(Math.random() * CUTE_GREETINGS.length)]);
        }
    }, [isOpen]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen && messages.length === 0) {
            setMessages([{
                id: Date.now(),
                role: 'model',
                text: 'Xin chào! 🦁👋 Tôi là linh vật Greenwich AI. Tôi có thể giúp bạn tạo bản nháp sự kiện siêu tốc hoặc tra cứu nhanh lịch trình, phòng trống, thiết bị. Bạn cần hỗ trợ gì hôm nay?',
                type: 'text'
            }]);
        }
    }, [isOpen, messages.length]);

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    const handleSend = async (e) => {
        if (e) e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = {
            id: Date.now(),
            role: 'user',
            text: input.trim(),
            type: 'text'
        };

        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInput('');
        setIsLoading(true);

        try {
            const history = messages.filter(m => m.type === 'text' || m.role === 'user').map(m => ({
                role: m.role,
                parts: [{ text: m.text }]
            }));

            const response = await api.post('/ai/chat', {
                message: userMessage.text,
                history,
                department: user.department || ''
            });

            const aiResponse = response.data;

            setMessages(prev => [...prev, {
                id: Date.now(),
                role: 'model',
                text: aiResponse.reply || (aiResponse.type === 'draft_event' ? 'Tôi đã chuẩn bị xong thông tin sự kiện.' : 'Tôi đã xử lý xong yêu cầu.'),
                type: aiResponse.type,
                draftData: aiResponse.draftData
            }]);

        } catch (error) {
            console.error('Chat error:', error);
            const errMsg = error.response?.data?.error || 'Đã có lỗi kết nối đến máy chủ AI.';
            setMessages(prev => [...prev, {
                id: Date.now(),
                role: 'model',
                text: errMsg,
                type: 'error'
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenDraftForm = (draftData) => {
        navigate('/register', { state: { aiDraft: draftData } });
        setIsOpen(false);
    };

    return (
        <div ref={dragConstraintsRef} className="fixed inset-0 pointer-events-none z-50">
            {/* Magnetic Edge Docking Aura (Guideline during drag) */}
            <AnimatePresence>
                {isDragging && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        style={isLeftHalf ? { left: `${Math.max(0, getSafeLeft() - 8)}px` } : { right: '0px' }}
                        className="fixed top-0 w-1.5 h-full bg-gradient-to-b from-transparent via-[#F58220]/60 to-transparent pointer-events-none z-40 blur-[2px]"
                    />
                )}
            </AnimatePresence>

            <motion.div
                ref={widgetRef}
                drag
                dragConstraints={dragConstraintsRef}
                dragElastic={0.08}
                dragMomentum={false}
                style={{ x, y }}
                onDragStart={handleDragStart}
                onDrag={handleDrag}
                onDragEnd={handleDragEnd}
                whileDrag={{ scale: 1.05 }}
                className={`pointer-events-auto absolute bottom-6 right-6 flex ${
                    isTopHalf ? 'flex-col-reverse' : 'flex-col'
                } ${isLeftHalf ? 'items-start' : 'items-end'} select-none`}
            >
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: isTopHalf ? -20 : 20, scale: 0.95, filter: 'blur(10px)' }}
                            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                            exit={{ opacity: 0, y: isTopHalf ? -20 : 20, scale: 0.95, filter: 'blur(10px)' }}
                            transition={{ duration: 0.3, type: "spring", bounce: 0.4 }}
                            className={`bg-white/95 backdrop-blur-xl border-2 border-slate-800 rounded-[24px] shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] w-80 sm:w-96 h-[550px] ${
                                isTopHalf ? 'mt-3' : 'mb-3'
                            } flex flex-col overflow-hidden ring-1 ring-white/50`}
                        >
                        {/* Header - Greenwich Signature Colors */}
                        <div className="bg-gradient-to-r from-[#002d6b] via-[#003882] to-[#004bb5] text-white p-3.5 flex items-center justify-between border-b-2 border-slate-800 shrink-0 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                            
                            <div className="flex items-center gap-2.5 relative z-10">
                                <div className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-amber-400 bg-white shadow-sm shrink-0">
                                    <img 
                                        src="/assets/greenwich-mascot.png" 
                                        alt="Greenwich Mascot" 
                                        className="w-full h-full object-cover object-top scale-125 translate-y-0.5"
                                    />
                                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white ring-1 ring-emerald-400 animate-pulse"></span>
                                </div>
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-extrabold text-sm tracking-wide text-white">Greenwich AI</span>
                                        <span className="px-1.5 py-0.5 bg-amber-400 text-slate-900 text-[9px] font-black rounded uppercase tracking-wider">Mascot</span>
                                    </div>
                                    <span className="text-[11px] text-blue-200 font-medium">Trợ lý sự kiện thông minh</span>
                                </div>
                            </div>

                            <button 
                                onClick={() => setIsOpen(false)}
                                className="p-1.5 hover:bg-white/20 text-white rounded-lg transition-colors relative z-10"
                                title="Đóng chat"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/60 relative">
                            {messages.map((msg) => (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    key={msg.id} 
                                    className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    {msg.role === 'model' && (
                                        <div className="w-7 h-7 rounded-full overflow-hidden border border-blue-200 bg-white shadow-xs shrink-0 mb-1">
                                            <img 
                                                src="/assets/greenwich-mascot.png" 
                                                alt="AI Avatar" 
                                                className="w-full h-full object-cover object-top scale-125 translate-y-0.5"
                                            />
                                        </div>
                                    )}

                                    <div className={`max-w-[85%] rounded-[20px] px-4 py-3 border-2 ${
                                        msg.role === 'user' 
                                            ? 'bg-gradient-to-br from-[#003882] to-[#0055ff] text-white border-slate-900 rounded-tr-[4px] shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]' 
                                            : msg.type === 'error'
                                                ? 'bg-red-50 text-red-700 border-red-200 rounded-tl-[4px]'
                                                : 'bg-white/90 backdrop-blur-sm text-slate-800 border-slate-200 rounded-tl-[4px] shadow-sm'
                                    }`}>
                                        {msg.type === 'error' && <AlertCircle size={16} className="inline mr-2 -mt-1" />}
                                        
                                        {msg.role === 'user' ? (
                                            <div className="text-sm font-medium whitespace-pre-wrap leading-relaxed">
                                                {msg.text}
                                            </div>
                                        ) : (
                                            <div 
                                                className="text-sm font-medium leading-relaxed"
                                                dangerouslySetInnerHTML={formatMarkdown(msg.text)}
                                            />
                                        )}
                                        
                                        {msg.type === 'draft_event' && msg.draftData && (
                                            <div className="mt-3 pt-1">
                                                <div 
                                                    className="relative group rounded-xl p-[2px] overflow-hidden transition-all duration-300 hover:scale-[1.02] cursor-pointer" 
                                                    onClick={() => handleOpenDraftForm(msg.draftData)}
                                                >
                                                    <div className="absolute inset-0 bg-gradient-to-r from-[#003882] via-amber-400 to-[#0055ff] opacity-80 group-hover:opacity-100 transition-opacity animate-[spin_4s_linear_infinite]"></div>
                                                    <div className="relative z-10 bg-white rounded-lg p-3 flex flex-col gap-1 border border-transparent group-hover:border-white/50">
                                                        <div className="text-[10px] font-black text-[#003882] uppercase tracking-widest mb-0.5 flex items-center justify-between">
                                                            <span className="flex items-center gap-1">🦁 Bản Nháp Sự Kiện</span>
                                                            <ExternalLink size={12} className="text-[#003882]" />
                                                        </div>
                                                        <div className="text-sm font-black text-slate-800 leading-tight">{msg.draftData.eventName}</div>
                                                        <div className="text-xs font-bold text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                                                            <span>📅 {msg.draftData.eventDate}</span>
                                                            <span>⏰ {msg.draftData.startTime}</span>
                                                            {msg.draftData.department && (
                                                                <span className="px-1.5 py-0.5 bg-blue-50 text-[#003882] rounded text-[10px] font-semibold">
                                                                    {msg.draftData.department}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="mt-1 text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                                                            👉 Bấm để mở form điền sẵn và lưu ngay
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                            {isLoading && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-end gap-2 justify-start">
                                    {/* Thinking Mascot Avatar with lightbulb pulse */}
                                    <motion.div 
                                        animate={{ 
                                            rotate: [-3, 3, -3],
                                            y: [0, -2, 0]
                                        }} 
                                        transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
                                        className="w-8 h-8 rounded-full overflow-hidden border-2 border-amber-400 bg-white shadow-sm shrink-0 mb-1 relative"
                                    >
                                        <img 
                                            src="/assets/greenwich-mascot.png" 
                                            alt="AI Thinking" 
                                            className="w-full h-full object-cover object-top scale-125 translate-y-0.5"
                                        />
                                        {/* Thinking Sparkle Badge */}
                                        <motion.div 
                                            animate={{ scale: [1, 1.25, 1], opacity: [0.8, 1, 0.8] }}
                                            transition={{ repeat: Infinity, duration: 1.2 }}
                                            className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-amber-400 text-slate-900 rounded-full flex items-center justify-center text-[9px] shadow-xs"
                                        >
                                            💡
                                        </motion.div>
                                    </motion.div>
                                    <div className="bg-white/95 backdrop-blur-sm border-2 border-slate-200 rounded-2xl rounded-tl-[4px] px-3.5 py-2.5 flex flex-col gap-1 shadow-sm">
                                        <div className="flex gap-1.5 items-center">
                                            <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} className="w-2 h-2 rounded-full bg-[#003882]" />
                                            <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-2 h-2 rounded-full bg-[#F58220]" />
                                            <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-2 h-2 rounded-full bg-blue-500" />
                                            <span className="text-[11px] font-bold text-slate-600 ml-1">Đang suy nghĩ & tra cứu... ⚡</span>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <form onSubmit={handleSend} className="p-3 bg-white border-t-2 border-slate-800 shrink-0">
                            <div className="relative flex items-center">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Nhập yêu cầu (VD: Tạo sự kiện họp lúc 8h sáng mai)..."
                                    className="w-full pl-4 pr-12 py-3 bg-slate-100 border-2 border-transparent focus:border-[#003882] focus:bg-white rounded-xl outline-none font-medium text-sm transition-all text-slate-800"
                                    disabled={isLoading}
                                />
                                <button
                                    type="submit"
                                    disabled={!input.trim() || isLoading}
                                    className="absolute right-2 p-2 bg-[#003882] text-white rounded-lg disabled:opacity-50 disabled:bg-slate-300 hover:bg-[#002d6b] transition-colors shadow-sm"
                                    title="Gửi yêu cầu"
                                >
                                    <Send size={16} className={isLoading ? "opacity-0" : "opacity-100"} />
                                    {isLoading && <Loader2 size={16} className="absolute top-2 left-2 animate-spin text-white" />}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toggle Button Container */}
            <div className="relative">
                {/* Cute Floating Greeting Bubble - positioned absolute so it NEVER alters container width */}
                <AnimatePresence>
                    {!isOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: isTopHalf ? -8 : 8, scale: 0.85 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: isTopHalf ? -8 : 8, scale: 0.85 }}
                            transition={{ delay: 1.2, duration: 0.35, type: "spring" }}
                            className={`absolute ${
                                isTopHalf ? 'top-[105%]' : 'bottom-[105%]'
                            } ${
                                isLeftHalf ? 'left-0 origin-bottom-left' : 'right-0 origin-bottom-right'
                            } z-30 bg-white text-slate-800 px-3.5 py-2 rounded-2xl ${
                                isLeftHalf 
                                    ? (isTopHalf ? 'rounded-tl-sm' : 'rounded-bl-sm') 
                                    : (isTopHalf ? 'rounded-tr-sm' : 'rounded-br-sm')
                            } border-2 border-slate-800 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] text-xs sm:text-sm font-bold flex items-center gap-1.5 cursor-pointer w-max max-w-[260px] text-left leading-snug pointer-events-auto select-none`}
                            onClick={() => {
                                if (isDraggingRef.current) return;
                                setIsOpen(true);
                            }}
                        >
                            <span>{isHovered ? "Chào bạn nha! Chat với tớ nè! 🦁✨" : randomGreeting}</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                <motion.div className="relative">
                    <motion.button
                        onMouseEnter={() => {
                            if (!isDraggingRef.current) setIsHovered(true);
                        }}
                        onMouseLeave={() => setIsHovered(false)}
                        whileTap={{ scale: 0.92, y: 3 }}
                        onClick={() => {
                            if (isDraggingRef.current) return;
                            setIsOpen(!isOpen);
                            setIsHovered(false);
                        }}
                        className={`relative z-10 flex flex-col items-center justify-end transition-all overflow-visible cursor-grab active:cursor-grabbing ${
                            isOpen 
                                ? 'w-14 h-14 bg-white/95 backdrop-blur-md rounded-full shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] border-2 border-slate-800 hover:bg-rose-50 flex items-center justify-center' 
                                : 'w-[100px] h-[142px] bg-transparent border-none outline-none'
                        }`}
                        title={isOpen ? "Đóng chat" : "Nhấp để chat • Nắm và kéo để di chuyển khắp màn hình 🦁✨"}
                    >
                        {isOpen ? (
                            <MascotAvatar isMini={true} isCloseMode={true} />
                        ) : (
                            <MascotAvatar 
                                isMini={false} 
                                isHovered={isHovered} 
                                isDragging={isDragging}
                                isLeftHalf={isLeftHalf}
                            />
                        )}
                    </motion.button>
                </motion.div>
            </div>
        </motion.div>
    </div>
    );
};

export default ChatBotWidget;
