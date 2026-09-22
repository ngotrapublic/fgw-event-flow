import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

const MascotAvatar = ({ isMini = false, isCloseMode = false }) => {
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

    return (
        <div className="relative flex flex-col items-center justify-end select-none">
            {/* Mascot Character with Floating Animation */}
            <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                whileHover={{ scale: 1.07, y: -8, transition: { duration: 0.25, type: "spring", stiffness: 300 } }}
                className="relative z-10 origin-bottom cursor-pointer drop-shadow-[0_12px_18px_rgba(0,56,130,0.28)]"
            >
                <img 
                    src="/assets/greenwich-mascot.png" 
                    alt="Greenwich Lion Mascot" 
                    className="w-[86px] sm:w-[92px] h-auto object-contain pointer-events-none"
                    draggable="false"
                />
            </motion.div>

            {/* Dynamic Ground Shadow */}
            <motion.div 
                animate={{ scale: [1, 0.75, 1], opacity: [0.35, 0.18, 0.35] }}
                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                className="w-16 h-2.5 bg-blue-950/40 rounded-full blur-[3px] -mt-1 z-0"
            />
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
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95, filter: 'blur(10px)' }}
                        animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, y: 20, scale: 0.95, filter: 'blur(10px)' }}
                        transition={{ duration: 0.3, type: "spring", bounce: 0.4 }}
                        className="bg-white/95 backdrop-blur-xl border-2 border-slate-800 rounded-[24px] shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] w-80 sm:w-96 h-[550px] mb-4 flex flex-col overflow-hidden ring-1 ring-white/50"
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
                                    <div className="w-7 h-7 rounded-full overflow-hidden border border-blue-200 bg-white shadow-xs shrink-0 mb-1">
                                        <img 
                                            src="/assets/greenwich-mascot.png" 
                                            alt="AI" 
                                            className="w-full h-full object-cover object-top scale-125 translate-y-0.5"
                                        />
                                    </div>
                                    <div className="bg-white/90 backdrop-blur-sm border-2 border-slate-200 rounded-2xl rounded-tl-[4px] px-4 py-3 flex gap-1.5 items-center shadow-sm">
                                        <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} className="w-2 h-2 rounded-full bg-blue-500" />
                                        <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-2 h-2 rounded-full bg-amber-500" />
                                        <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-2 h-2 rounded-full bg-blue-700" />
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
            <div className="relative flex flex-col items-end gap-2">
                {/* Cute Floating Greeting Bubble */}
                <AnimatePresence>
                    {!isOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.8, rotate: -3 }}
                            animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
                            exit={{ opacity: 0, y: 10, scale: 0.8 }}
                            transition={{ delay: 1.5, duration: 0.4, type: "spring" }}
                            className="bg-white text-slate-800 px-3.5 py-2 rounded-2xl rounded-br-sm border-2 border-slate-800 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] text-xs sm:text-sm font-bold flex items-center gap-1.5 cursor-pointer origin-bottom-right max-w-[260px] text-left leading-snug"
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
                        className={`relative z-10 flex flex-col items-center justify-end transition-all overflow-visible ${
                            isOpen 
                                ? 'w-14 h-14 bg-white/95 backdrop-blur-md rounded-full shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] border-2 border-slate-800 cursor-pointer hover:bg-rose-50 flex items-center justify-center' 
                                : 'w-[96px] h-[135px] cursor-pointer bg-transparent border-none outline-none'
                        }`}
                        title={isOpen ? "Đóng chat" : "Chat với Greenwich AI"}
                    >
                        {isOpen ? (
                            <MascotAvatar isMini={true} isCloseMode={true} />
                        ) : (
                            <MascotAvatar isMini={false} />
                        )}
                    </motion.button>
                </motion.div>
            </div>
        </div>
    );
};

export default ChatBotWidget;
