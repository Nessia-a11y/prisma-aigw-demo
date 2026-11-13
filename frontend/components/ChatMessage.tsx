import React from 'react';
import { User, ShieldAlert, AlertTriangle, ThumbsUp, ThumbsDown, CheckCircle2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Message, UserRole } from '../types';

interface ChatMessageProps {
    message: Message;
    role: UserRole;
    onFeedback?: (messageId: string, value: 'up' | 'down') => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, role, onFeedback }) => {
    const isUser = message.role === 'user';
    const isDev = role === 'developer';

    // 渲染独立的 Fallback 提示块
    if (message.isFallback) {
        return (
            <div className="flex w-full mb-4 justify-center">
                <div className="flex items-center space-x-2 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2.5 rounded-lg shadow-sm text-sm">
                    <AlertTriangle size={18} className="text-amber-500" />
                    <span className="font-medium">{message.text}</span>
                </div>
            </div>
        );
    }

    return (
        <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-[85%] md:max-w-[75%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                
                {/* Avatar */}
                <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center transition-colors duration-300 ${
                    isUser 
                        ? (isDev ? 'bg-zinc-200 ml-3' : 'bg-slate-200 ml-3') 
                        : (isDev ? 'bg-emerald-500 mr-3' : 'bg-[#FA582D] mr-3')
                }`}>
                    {isUser ? (
                        <User size={20} className={isDev ? 'text-zinc-600' : 'text-slate-600'} />
                    ) : (
                        <ShieldAlert size={20} className="text-white" />
                    )}
                </div>

                {/* Message Bubble */}
                <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                    <div className={`px-5 py-3.5 rounded-2xl shadow-sm transition-colors duration-300 ${
                        isUser 
                            ? (isDev ? 'bg-emerald-600 text-white rounded-tr-sm' : 'bg-slate-800 text-white rounded-tr-sm')
                            : message.isError 
                                ? 'bg-red-50 text-red-800 border border-red-200 rounded-tl-sm'
                                : (isDev ? 'bg-white text-zinc-800 border border-zinc-200 rounded-tl-sm' : 'bg-white text-slate-800 border border-slate-200 rounded-tl-sm')
                    }`}>
                        {message.isStreaming && message.text === '' ? (
                            <div className="flex space-x-1 items-center h-6">
                                <div className={`w-2 h-2 rounded-full animate-bounce ${isDev ? 'bg-zinc-400' : 'bg-slate-400'}`} style={{ animationDelay: '0ms' }}></div>
                                <div className={`w-2 h-2 rounded-full animate-bounce ${isDev ? 'bg-zinc-400' : 'bg-slate-400'}`} style={{ animationDelay: '150ms' }}></div>
                                <div className={`w-2 h-2 rounded-full animate-bounce ${isDev ? 'bg-zinc-400' : 'bg-slate-400'}`} style={{ animationDelay: '300ms' }}></div>
                            </div>
                        ) : (
                            <div className={`markdown-body text-[15px] leading-relaxed ${isUser ? 'text-white' : ''}`}>
                                {message.imageUrl && isUser && (
                                    <div className="mb-2">
                                        <img src={message.imageUrl} alt="Uploaded" className="max-w-full h-auto max-h-48 rounded-md shadow-sm border border-white/20" />
                                    </div>
                                )}
                                
                                {isUser ? (
                                    <p className="whitespace-pre-wrap m-0">{message.text}</p>
                                ) : (
                                    <ReactMarkdown>{message.text}</ReactMarkdown>
                                )}
                            </div>
                        )}

                        {/* Feedback Buttons */}
                        {!isUser && !message.isStreaming && message.traceId && !message.isError && !message.isFallback && (
                            <div className={`flex items-center space-x-2 mt-3 pt-2 border-t ${isDev ? 'border-zinc-200/60' : 'border-slate-200/60'}`}>
                                <button
                                    onClick={() => !message.feedback && onFeedback?.(message.id, 'up')}
                                    disabled={!!message.feedback}
                                    className={`p-1.5 rounded-md transition-colors ${
                                        message.feedback === 'up' 
                                            ? 'text-emerald-600 bg-emerald-50' 
                                            : (isDev ? 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100')
                                    }`}
                                    aria-label="赞"
                                >
                                    <ThumbsUp size={14} className={message.feedback === 'up' ? 'fill-current' : ''} />
                                </button>
                                <button
                                    onClick={() => !message.feedback && onFeedback?.(message.id, 'down')}
                                    disabled={!!message.feedback}
                                    className={`p-1.5 rounded-md transition-colors ${
                                        message.feedback === 'down' 
                                            ? 'text-red-600 bg-red-50' 
                                            : (isDev ? 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100')
                                    }`}
                                    aria-label="踩"
                                >
                                    <ThumbsDown size={14} className={message.feedback === 'down' ? 'fill-current' : ''} />
                                </button>
                                {message.feedback && (
                                    <span className="text-xs text-emerald-600 flex items-center ml-2 font-medium">
                                        <CheckCircle2 size={12} className="mr-1" />
                                        反馈已记录
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                    <span className={`text-xs mt-1 px-1 transition-colors duration-300 ${isDev ? 'text-zinc-400' : 'text-slate-400'}`}>
                        {isUser ? '您' : 'PANW 助手'}
                    </span>
                </div>
            </div>
        </div>
    );
};
