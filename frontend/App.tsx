import React, { useState, useRef, useEffect } from 'react';
import { ShieldAlert, ShieldCheck, RefreshCw, ChevronDown, ChevronUp, UserCircle, Code2 } from 'lucide-react';
import { Message, UserRole } from './types';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { SamplePrompts } from './components/SamplePrompts';
import { RoutingPrompts } from './components/RoutingPrompts';
import { sendMessageStream, initChat, sendFeedback } from './services/geminiService';

const getInitialMessage = (role: UserRole): Message => {
    const baseText = `您好！我是您的 Palo Alto Networks 虚拟助手。我可以帮助解答有关我们网络安全产品组合的问题，包括 **Strata**、**Idira** 和 **Cortex**。`;
    
    const tipText = role === 'developer' 
        ? `\n\n*💡 提示：尝试在问题中包含 **代码**、**写** 等关键词，体验不同的 AI 模型路由！*`
        : '';

    return {
        id: 'init-msg',
        role: 'model',
        text: `${baseText}${tipText}\n\n请问今天我能为您提供什么帮助？`,
        isStreaming: false
    };
};

export default function App() {
    const [role, setRole] = useState<UserRole>('customer');
    const [messages, setMessages] = useState<Message[]>([getInitialMessage('customer')]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [showSamples, setShowSamples] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Initialize chat on mount
    useEffect(() => {
        try {
            initChat(role);
        } catch (e) {
            console.error("Initialization error", e);
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'model',
                text: '错误：无法初始化 AI 服务。请确保 API 密钥配置正确。',
                isError: true
            }]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Update initial message when role changes if it's the only message
    useEffect(() => {
        if (messages.length === 1 && messages[0].id === 'init-msg') {
            setMessages([getInitialMessage(role)]);
        }
    }, [role, messages.length]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async (text: string, imageUrl?: string) => {
        if (!text.trim() && !imageUrl) return;

        const userMsgId = Date.now().toString();
        const modelMsgId = (Date.now() + 1).toString();

        // Add user message
        setMessages(prev => [...prev, { id: userMsgId, role: 'user', text, imageUrl }]);
        setIsProcessing(true);

        // Add placeholder for model text response
        setMessages(prev => [...prev, { id: modelMsgId, role: 'model', text: '', isStreaming: true }]);

        try {
            const stream = sendMessageStream(text, role, imageUrl);
            
            for await (const chunk of stream) {
                if (chunk.type === 'fallback') {
                    // 插入一个独立的 fallback 消息块
                    setMessages(prev => {
                        const newMessages = [...prev];
                        const placeholder = newMessages.pop(); // 暂时移除正在流式输出的占位符
                        newMessages.push({
                            id: Date.now().toString() + '-fallback',
                            role: 'model',
                            text: chunk.text,
                            isStreaming: false,
                            isFallback: true
                        });
                        if (placeholder) newMessages.push(placeholder); // 将占位符放回末尾
                        return newMessages;
                    });
                } else if (chunk.type === 'content') {
                    // 正常追加内容到当前流式消息块
                    setMessages(prev => {
                        const newMessages = [...prev];
                        const lastIndex = newMessages.length - 1;
                        const currentMsg = newMessages[lastIndex];
                        newMessages[lastIndex] = {
                            ...currentMsg,
                            text: currentMsg.text + (chunk.text || ''),
                            cacheHit: currentMsg.cacheHit || chunk.cacheHit, // 只要有一次 true 就保持 true
                            tokensSaved: chunk.tokensSaved || currentMsg.tokensSaved,
                            traceId: chunk.traceId || currentMsg.traceId
                        };
                        return newMessages;
                    });
                }
            }

            // Mark streaming as complete
            setMessages(prev => {
                const newMessages = [...prev];
                const lastIndex = newMessages.length - 1;
                if (newMessages[lastIndex].id === modelMsgId) {
                    newMessages[lastIndex] = { ...newMessages[lastIndex], isStreaming: false };
                }
                return newMessages;
            });

        } catch (error: any) {
            console.error("Chat error:", error);
            setMessages(prev => {
                const newMessages = [...prev];
                const lastIndex = newMessages.length - 1;
                if (newMessages[lastIndex].id === modelMsgId) {
                    newMessages[lastIndex] = { 
                        ...newMessages[lastIndex], 
                        text: "抱歉，处理您的请求时遇到错误。这可能是由于网络问题，或者提示词被我们的安全护栏拦截。", 
                        isStreaming: false,
                        isError: true
                    };
                }
                return newMessages;
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleFeedback = (messageId: string, value: 'up' | 'down') => {
        setMessages(prev => prev.map(msg => {
            if (msg.id === messageId && msg.traceId && !msg.feedback) {
                sendFeedback(msg.traceId, value === 'up' ? 1 : -1);
                return { ...msg, feedback: value };
            }
            return msg;
        }));
    };

    const isDev = role === 'developer';

    return (
        <div className={`flex flex-col h-full max-w-6xl mx-auto shadow-2xl sm:border-x transition-colors duration-300 ${isDev ? 'bg-zinc-50 sm:border-zinc-200' : 'bg-white sm:border-slate-200'}`}>
            {/* Header */}
            <header className={`text-white px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between shrink-0 z-10 shadow-md transition-colors duration-300 ${isDev ? 'bg-zinc-900' : 'bg-slate-900'}`}>
                <div className="flex items-center space-x-3 mb-3 sm:mb-0">
                    <div className={`p-2 rounded-lg transition-colors duration-300 ${isDev ? 'bg-emerald-500' : 'bg-[#FA582D]'}`}>
                        <ShieldAlert size={24} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-base sm:text-lg font-semibold tracking-wide">Palo Alto Networks</h1>
                        <p className={`text-[10px] sm:text-xs font-medium tracking-wider uppercase transition-colors duration-300 ${isDev ? 'text-zinc-400' : 'text-slate-400'}`}>产品助手</p>
                    </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto space-x-2 sm:space-x-4">
                    
                    {/* Role Selector */}
                    <div className={`flex p-0.5 rounded-lg border transition-colors duration-300 ${isDev ? 'bg-zinc-800 border-zinc-700' : 'bg-slate-800 border-slate-700'}`}>
                        <button
                            onClick={() => setRole('customer')}
                            className={`flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-3 py-1.5 text-[11px] sm:text-xs font-medium rounded-md transition-all duration-200 ${
                                !isDev 
                                    ? 'bg-slate-700 text-white shadow-sm' 
                                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50'
                            }`}
                        >
                            <UserCircle size={14} />
                            <span>客户</span>
                        </button>
                        <button
                            onClick={() => setRole('developer')}
                            className={`flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-3 py-1.5 text-[11px] sm:text-xs font-medium rounded-md transition-all duration-200 ${
                                isDev 
                                    ? 'bg-emerald-600 text-white shadow-sm' 
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                            }`}
                        >
                            <Code2 size={14} />
                            <span>开发者</span>
                        </button>
                    </div>

                    <div className={`flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-2.5 py-1.5 rounded-full border transition-colors duration-300 ${isDev ? 'bg-zinc-800 border-zinc-700' : 'bg-slate-800 border-slate-700'}`}>
                        <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
                        <span className="text-emerald-400/90 text-[10px] sm:text-xs font-medium tracking-wide whitespace-nowrap">Prisma AIGW 已启用</span>
                    </div>
                </div>
            </header>

            {/* Chat Area */}
            <main className={`flex-1 overflow-y-auto p-4 sm:p-6 scroll-smooth transition-colors duration-300 ${isDev ? 'bg-zinc-100/50' : 'bg-slate-50/50'}`}>
                <div className="max-w-4xl mx-auto">
                    {messages.map((msg) => (
                        <ChatMessage key={msg.id} message={msg} role={role} onFeedback={handleFeedback} />
                    ))}
                    <div ref={messagesEndRef} className="h-1" />
                </div>
            </main>

            {/* Input Area with Sample Prompts */}
            <div className={`border-t shrink-0 transition-all duration-300 ease-in-out ${isDev ? 'bg-zinc-50 border-zinc-200' : 'bg-white border-slate-200'}`}>
                <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 pt-3 flex justify-between items-center">
                    <button 
                        onClick={() => setShowSamples(!showSamples)}
                        className={`flex items-center space-x-1.5 text-xs font-medium transition-colors ${isDev ? 'text-zinc-500 hover:text-zinc-800' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        {showSamples ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                        <span>{showSamples ? '隐藏测试提示词' : '显示测试提示词'}</span>
                    </button>

                    {showSamples && (
                        <button 
                            onClick={() => setRefreshKey(prev => prev + 1)}
                            disabled={isProcessing}
                            className={`flex items-center space-x-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${isDev ? 'text-zinc-500 hover:text-zinc-800' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                            <RefreshCw size={14} />
                            <span>刷新示例</span>
                        </button>
                    )}
                </div>
                
                {showSamples && (
                    <div className="pb-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
                        {isDev && <RoutingPrompts onSelect={handleSendMessage} disabled={isProcessing} refreshKey={refreshKey} role={role} />}
                        <SamplePrompts onSelect={handleSendMessage} disabled={isProcessing} refreshKey={refreshKey} role={role} />
                    </div>
                )}
                
                <ChatInput onSendMessage={handleSendMessage} disabled={isProcessing} role={role} />
            </div>
        </div>
    );
}
