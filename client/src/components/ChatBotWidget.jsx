import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Send, Loader2, Sparkles, AlertCircle, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const CUTE_GREETINGS = [
    "Ê cậu ơi, tớ chán quá, mở chat lên chơi hông? 🥺",
    "Trời rớt cục vàng kìa! À nhầm, tớ là EventFlow AI đây! ✨",
    "Ủa ai đang nhìn tớ thế nhỉ? Ngại ghê á 😳",
    "Bíp bíp! Đang quét xem có ai đẹp trai/xinh gái quanh đây không... 😍",
    "Sếp ơi sếp à, sếp cần tớ giúp gì hông? 🌸",
    "Trái tim tớ mong manh, cậu click nhẹ thôi nha! 💖",
    "Tớ có thể làm được mọi việc (kể cả làm nũng)! 😤",
    "Ét ô ét! Cứu tớ với, tớ bị kẹt ở góc màn hình! 🆘",
    "Trà sữa thêm trân châu, cậu thêm tớ vào giỏ hàng chưa? 🧋",
    "Thắp nhang muỗi tớ cũng biết, tạo sự kiện tớ cũng rành! Gọi tớ nha 😎"
];

const formatMarkdown = (text) => {
    if (!text) return { __html: '' };
    // Very simple parser for **bold**, *italic*, and - bullets
    let formatted = text
        .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-violet-700">$1</strong>')
        .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
        .replace(/^- (.*)$/gm, '<li class="ml-4 list-disc">$1</li>');
    
    // Wrap consecutive <li> tags in a <ul>
    formatted = formatted.replace(/(<li.*<\/li>(\n|$))+/g, '<ul class="my-1">$&</ul>');
    
    // Convert newlines to <br/> outside of <ul> (basic attempt)
    // To avoid converting newlines inside lists, we just do a simple replace
    formatted = formatted.replace(/\n/g, '<br/>');
    
    // Cleanup bad <br/> around ul
    formatted = formatted.replace(/<br\/>(?=<ul)/g, '').replace(/<\/ul><br\/>/g, '</ul>');
    
    return { __html: formatted };
};

const RobotAvatar = ({ isMini = false, isCloseMode = false }) => {
    return (
        <>
            <motion.div 
                animate={{ y: [0, -4, 0] }}
                transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                className={`relative flex flex-col items-center justify-start z-10 origin-center ${isMini ? 'scale-[0.6] mt-2' : 'w-full h-full pt-[14px]'}`}
            >
                <motion.div
                    variants={!isCloseMode ? { hover: { y: -6, transition: { duration: 0.4, type: "spring", bounce: 0.4 } } } : {}}
                    className="relative flex flex-col items-center justify-start w-full h-full"
                >
                    {/* Red X Badge for Close Mode */}
                    {isCloseMode && (
                        <motion.div 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute -top-4 -right-2 bg-rose-500 text-white rounded-full p-1 shadow-[0_0_10px_rgba(244,63,94,0.6)] border-2 border-white z-50 flex items-center justify-center"
                        >
                            <X size={16} strokeWidth={3} />
                        </motion.div>
                    )}

                    {/* ---- HOLOGRAPHIC HALO ---- */}
                    {/* Primary Halo */}
                    <motion.div 
                        initial={{ rotateX: 75 }}
                        animate={{ rotateZ: 360 }}
                        transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                        variants={!isCloseMode ? { hover: { scale: 1.15, opacity: 0.9, borderColor: "#a78bfa", boxShadow: "0 0 15px #a78bfa", transition: { duration: 0.3 } } } : {}}
                        className={`absolute top-1 w-[44px] h-[44px] rounded-full border-[1.5px] border-cyan-400 border-dashed opacity-60 shadow-[0_0_8px_#22d3ee] z-0 origin-center pointer-events-none`}
                    ></motion.div>
                    
                    {/* Secondary Halo (Hover only) */}
                    {!isCloseMode && (
                        <motion.div 
                            initial={{ rotateX: 75, opacity: 0, scale: 0.8 }}
                            animate={{ rotateZ: -360 }}
                            transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                            variants={{ hover: { opacity: 0.6, scale: 1.4, transition: { duration: 0.4 } } }}
                            className="absolute top-1 w-[44px] h-[44px] rounded-full border-[1px] border-cyan-300 border-dotted z-0 origin-center pointer-events-none shadow-[0_0_10px_#22d3ee]"
                        ></motion.div>
                    )}

                    {/* ---- HEAD ---- */}
                    <div className="relative w-[60px] h-[44px] z-20 flex flex-col items-center">
                        {/* Antennas (Tiny) */}
                        <motion.div variants={!isCloseMode ? { hover: { backgroundColor: "#22d3ee", boxShadow: "0 0 6px #22d3ee" } } : {}} className="absolute -top-[3px] left-[12px] w-[2px] h-2.5 bg-[#0055ff] rounded-full -rotate-12 z-0"></motion.div>
                        <motion.div variants={!isCloseMode ? { hover: { backgroundColor: "#22d3ee", boxShadow: "0 0 6px #22d3ee" } } : {}} className="absolute -top-[3px] right-[12px] w-[2px] h-2.5 bg-[#0055ff] rounded-full rotate-12 z-0"></motion.div>

                        {/* Ears */}
                        <div className="absolute -left-[4px] top-[12px] w-2.5 h-5 bg-gradient-to-r from-[#003882] to-[#0055ff] rounded-l-full z-0 flex items-center justify-end pr-[1px] shadow-[inset_1px_0_3px_rgba(0,0,0,0.3)]">
                            <motion.div variants={!isCloseMode ? { hover: { backgroundColor: "#fff" } } : {}} className="w-[3px] h-[12px] bg-cyan-300 rounded-full shadow-[0_0_4px_#22d3ee]"></motion.div>
                        </div>
                        <div className="absolute -right-[4px] top-[12px] w-2.5 h-5 bg-gradient-to-l from-[#003882] to-[#0055ff] rounded-r-full z-0 flex items-center justify-start pl-[1px] shadow-[inset_-1px_0_3px_rgba(0,0,0,0.3)]">
                            <motion.div variants={!isCloseMode ? { hover: { backgroundColor: "#fff" } } : {}} className="w-[3px] h-[12px] bg-cyan-300 rounded-full shadow-[0_0_4px_#22d3ee]"></motion.div>
                        </div>

                        {/* Helmet Main */}
                        <motion.div 
                            variants={!isCloseMode ? { hover: { rotateX: -10, rotateZ: 4, transition: { duration: 0.4, type: "spring" } } } : {}}
                            className="relative w-full h-full bg-gradient-to-b from-white to-slate-200 rounded-[20px] shadow-[inset_0_-3px_6px_rgba(148,163,184,0.8),0_3px_8px_rgba(0,0,0,0.2)] flex justify-center items-center p-[3px] z-10 border-[1px] border-white"
                        >
                            {/* Blue Visor */}
                            <div className="relative w-full h-[30px] bg-gradient-to-b from-[#003882] to-[#001736] rounded-[14px] shadow-[inset_0_3px_6px_rgba(0,0,0,0.6)] overflow-hidden flex items-center justify-center border-[1px] border-slate-800">
                                {/* Visor Glare Curve */}
                                <div className="absolute top-0 w-full h-[10px] bg-gradient-to-b from-white/20 to-transparent rounded-t-[14px] rounded-b-[40%]"></div>
                                <div className="absolute -left-2 top-0 w-6 h-10 bg-white/10 rotate-45 blur-[1px]"></div>
                                
                                {/* Premium Diagonal Shine Sweep (Professional Mode) */}
                                {!isCloseMode && (
                                    <motion.div 
                                        variants={{ hover: { left: ['-100%', '200%'], transition: { duration: 1.2, repeat: Infinity, repeatDelay: 1.5, ease: "easeInOut" } } }}
                                        className="absolute top-0 -left-full w-1/2 h-full bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-[30deg] z-10"
                                    ></motion.div>
                                )}

                                {/* Face Details */}
                                <div className="flex flex-col items-center justify-center relative z-10 mt-[2px] h-full">
                                    {/* Eyes Container */}
                                    <div className="flex gap-[10px] relative items-center justify-center h-[12px]">
                                        {/* Left Eye */}
                                        <motion.div 
                                            variants={!isCloseMode ? { hover: { scaleY: 1.2, scaleX: 1.1, backgroundColor: "#fff", boxShadow: "0 0 12px #22d3ee" } } : {}}
                                            animate={{ scaleY: [1, 1, 0.1, 1, 1] }} 
                                            transition={{ repeat: Infinity, duration: 4, times: [0, 0.9, 0.95, 0.98, 1] }}
                                            className="w-[8px] h-[10px] bg-cyan-400 rounded-full shadow-[0_0_8px_#22d3ee,inset_0_0_4px_rgba(255,255,255,0.8)]"
                                        />
                                        {/* Right Eye */}
                                        <motion.div 
                                            variants={!isCloseMode ? { hover: { scaleY: 1.2, scaleX: 1.1, backgroundColor: "#fff", boxShadow: "0 0 12px #22d3ee" } } : {}}
                                            animate={{ scaleY: [1, 1, 0.1, 1, 1] }} 
                                            transition={{ repeat: Infinity, duration: 4, times: [0, 0.9, 0.95, 0.98, 1] }}
                                            className="w-[8px] h-[10px] bg-cyan-400 rounded-full shadow-[0_0_8px_#22d3ee,inset_0_0_4px_rgba(255,255,255,0.8)]"
                                        />
                                    </div>
                                    
                                    {/* Smile */}
                                    <motion.div 
                                        variants={!isCloseMode ? { 
                                            hover: { height: 3.5, width: 10, borderRadius: '0 0 10px 10px', backgroundColor: 'transparent', y: 1 } 
                                        } : {}}
                                        initial={{ height: 2.5, width: 8, borderBottomWidth: 1.5, borderColor: '#22d3ee', borderRadius: '0 0 10px 10px', backgroundColor: 'transparent' }}
                                        className="mt-[2px]"
                                    />
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* ---- TORSO & ARMS WRAPPER ---- */}
                    <div className="relative w-full flex justify-center -mt-[3px] z-10">
                        {/* Left Arm (User's Left) - Cyberpunk Salute */}
                        <motion.div 
                            variants={!isCloseMode ? { hover: { rotate: 145, y: -2, x: 2, transition: { duration: 0.4, type: "spring", bounce: 0.5 } } } : {}}
                            initial={{ rotate: 30 }}
                            className="absolute top-[6px] left-[14px] w-[12px] origin-top z-0 flex flex-col items-center"
                        >
                            <div className="w-2.5 h-2.5 bg-slate-800 rounded-full z-0 shadow-inner"></div>
                            <div className="w-3.5 h-[14px] bg-gradient-to-b from-white to-slate-200 rounded-full shadow-[inset_-1px_-1px_3px_rgba(0,0,0,0.3)] z-10 -mt-[1px] flex flex-col justify-end p-[1px] border-[0.5px] border-slate-300">
                                <div className="w-full h-2 bg-slate-800 rounded-[3px] mt-[1px] flex justify-evenly overflow-hidden shadow-inner">
                                    <div className="w-[1px] h-full bg-slate-600"></div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Right Arm (User's Right) - Posed back */}
                        <motion.div 
                            variants={!isCloseMode ? { hover: { rotate: -40, transition: { duration: 0.4, type: "spring" } } } : {}}
                            initial={{ rotate: -20 }}
                            className="absolute top-[6px] right-[14px] w-[12px] origin-top z-0 flex flex-col items-center"
                        >
                            <div className="w-2.5 h-2.5 bg-slate-800 rounded-full z-0 shadow-inner"></div>
                            <div className="w-3.5 h-[14px] bg-gradient-to-b from-white to-slate-200 rounded-full shadow-[inset_1px_-1px_3px_rgba(0,0,0,0.3)] z-10 -mt-[1px] flex flex-col justify-end p-[1px] border-[0.5px] border-slate-300">
                                <div className="w-full h-2 bg-slate-800 rounded-[3px] mt-[1px] flex justify-evenly overflow-hidden shadow-inner">
                                    <div className="w-[1px] h-full bg-slate-600"></div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Torso */}
                        <div className="relative w-[44px] h-[40px] bg-gradient-to-b from-white to-slate-200 rounded-[14px] rounded-b-[20px] shadow-[inset_0_-4px_8px_rgba(148,163,184,0.8),0_4px_8px_rgba(0,0,0,0.2)] z-10 border-[1px] border-white flex flex-col items-center overflow-hidden pt-1.5">
                            <motion.span 
                                variants={!isCloseMode ? { hover: { textShadow: "0 0 10px #0055ff, 0 0 15px #22d3ee", color: "#22d3ee" } } : {}}
                                className="text-[14px] font-black text-[#0055ff] tracking-tighter leading-none shadow-sm transition-all duration-300"
                            >
                                AI
                            </motion.span>
                            <div className="absolute bottom-0 w-full h-[8px] bg-slate-800 flex justify-center items-center rounded-b-[20px] shadow-inner">
                                <motion.div 
                                    variants={!isCloseMode ? { hover: { width: 24, backgroundColor: "#fff", boxShadow: "0 0 10px #22d3ee" } } : {}}
                                    className="w-5 h-[2px] bg-cyan-400 rounded-full shadow-[0_0_8px_#22d3ee,0_0_4px_#22d3ee] transition-all duration-300"
                                ></motion.div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>

            {/* ---- GROUND GLOW (Outside robot) ---- */}
            {!isMini && (
                <motion.div 
                    animate={{ scale: [1, 0.7, 1], opacity: [0.6, 0.3, 0.6] }}
                    transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                    className="absolute bottom-1 w-[50px] h-[8px] bg-cyan-400 rounded-full blur-[6px] z-0"
                />
            )}
        </>
    );
};

const ChatBotWidget = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

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
            // Initial greeting
            setMessages([{
                id: Date.now(),
                role: 'model',
                text: 'Xin chào! 👋 Tôi là trợ lý EventFlow AI. Tôi có thể giúp bạn tạo lịch sự kiện hoặc xem các báo cáo thống kê nhanh. Bạn cần hỗ trợ gì hôm nay?',
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
            // Format history for Gemini API: { role: 'user' | 'model', parts: [{ text }] }
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
        // We will pass the draft data via history state to the /register page
        navigate('/register', { state: { aiDraft: draftData } });
        setIsOpen(false);
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95, filter: 'blur(10px)' }}
                        animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, y: 20, scale: 0.95, filter: 'blur(10px)' }}
                        transition={{ duration: 0.3, type: "spring", bounce: 0.4 }}
                        className="bg-white/90 backdrop-blur-xl border-2 border-slate-800 rounded-[24px] shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] w-80 sm:w-96 h-[550px] mb-4 flex flex-col overflow-hidden ring-1 ring-white/50"
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-violet-600 bg-[length:200%_auto] animate-[gradient_4s_linear_infinite] text-white p-4 flex items-center justify-between border-b-2 border-slate-800 shrink-0 relative overflow-hidden">
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
                            <div className="flex items-center gap-2 relative z-10">
                                <motion.div animate={{ rotate: [0, -10, 10, -10, 10, 0] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}>
                                    <Sparkles size={20} className="text-violet-200" />
                                </motion.div>
                                <span className="font-black tracking-wide">EventFlow AI</span>
                            </div>
                            <button 
                                onClick={() => setIsOpen(false)}
                                className="p-1 hover:bg-white/20 rounded-md transition-colors relative z-10"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 relative">
                            {messages.map((msg) => (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    key={msg.id} 
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`max-w-[85%] rounded-[20px] px-4 py-3 border-2 ${
                                        msg.role === 'user' 
                                            ? 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white border-slate-900 rounded-tr-[4px] shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]' 
                                            : msg.type === 'error'
                                                ? 'bg-red-50 text-red-700 border-red-200 rounded-tl-[4px]'
                                                : 'bg-white/80 backdrop-blur-sm text-slate-800 border-slate-200 rounded-tl-[4px] shadow-sm'
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
                                            <div className="mt-4 pt-1">
                                                <div 
                                                    className="relative group rounded-xl p-[2px] overflow-hidden transition-all duration-300 hover:scale-[1.02] cursor-pointer" 
                                                    onClick={() => handleOpenDraftForm(msg.draftData)}
                                                >
                                                    <div className="absolute inset-0 bg-[conic-gradient(from_0deg_at_50%_50%,#8b5cf6_0%,#d946ef_25%,#06b6d4_50%,#d946ef_75%,#8b5cf6_100%)] opacity-70 group-hover:opacity-100 transition-opacity animate-[spin_4s_linear_infinite]"></div>
                                                    <div className="relative z-10 bg-white rounded-lg p-3 flex flex-col gap-1 border border-transparent group-hover:border-white/50">
                                                        <div className="text-[10px] font-black text-violet-500 uppercase tracking-widest mb-1 flex items-center justify-between">
                                                            <span>Bản Nháp Sự Kiện</span>
                                                            <ExternalLink size={12} />
                                                        </div>
                                                        <div className="text-sm font-black text-slate-800 leading-tight">{msg.draftData.eventName}</div>
                                                        <div className="text-xs font-bold text-slate-500 mt-1">
                                                            📅 {msg.draftData.eventDate} | ⏰ {msg.draftData.startTime}
                                                        </div>
                                                        <div className="absolute top-0 right-0 w-12 h-full bg-gradient-to-r from-transparent via-white/50 to-transparent -skew-x-12 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                            {isLoading && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
                                    <div className="bg-white/80 backdrop-blur-sm border-2 border-slate-200 rounded-2xl rounded-tl-[4px] px-4 py-3 flex gap-1.5 items-center shadow-sm">
                                        <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} className="w-2 h-2 rounded-full bg-violet-400" />
                                        <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-2 h-2 rounded-full bg-violet-500" />
                                        <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-2 h-2 rounded-full bg-fuchsia-500" />
                                    </div>
                                </motion.div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <form onSubmit={handleSend} className="p-3 bg-white border-t-2 border-black shrink-0">
                            <div className="relative flex items-center">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Nhập yêu cầu..."
                                    className="w-full pl-4 pr-12 py-3 bg-slate-100 border-2 border-transparent focus:border-black focus:bg-white rounded-xl outline-none font-medium text-sm transition-all"
                                    disabled={isLoading}
                                />
                                <button
                                    type="submit"
                                    disabled={!input.trim() || isLoading}
                                    className="absolute right-2 p-2 bg-violet-600 text-white rounded-lg disabled:opacity-50 disabled:bg-slate-400 hover:bg-violet-700 transition-colors"
                                >
                                    <Send size={16} className={isLoading ? "opacity-0" : "opacity-100"} />
                                    {isLoading && <Loader2 size={16} className="absolute top-2 left-2 animate-spin" />}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toggle Button Container */}
            <div className="relative flex flex-col items-end gap-3">
                {/* Cute Floating Greeting Bubble */}
                <AnimatePresence>
                    {!isOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.8, rotate: -5 }}
                            animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
                            exit={{ opacity: 0, y: 10, scale: 0.8 }}
                            transition={{ delay: 2, duration: 0.4, type: "spring" }}
                            className="bg-white text-slate-800 px-4 py-2 rounded-2xl rounded-br-sm border-2 border-slate-800 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] text-sm font-bold flex items-center gap-2 cursor-pointer origin-bottom-right"
                            onClick={() => setIsOpen(true)}
                        >
                            <span>{randomGreeting}</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                <motion.div className="relative">
                    <motion.button
                        whileHover="hover"
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsOpen(!isOpen)}
                        className={`relative z-10 flex flex-col items-center justify-center transition-all overflow-visible ${
                            isOpen 
                                ? 'w-16 h-16 bg-white/80 backdrop-blur-md rounded-full shadow-lg border-2 border-slate-200 cursor-pointer hover:bg-rose-50' 
                                : 'w-[76px] h-[100px] cursor-pointer bg-transparent border-none outline-none'
                        }`}
                    >
                        {isOpen ? (
                            <RobotAvatar isMini={true} isCloseMode={true} />
                        ) : (
                            <RobotAvatar isMini={false} />
                        )}
                    </motion.button>
                </motion.div>
            </div>
        </div>
    );
};

export default ChatBotWidget;
