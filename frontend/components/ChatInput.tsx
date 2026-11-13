import React, { useState, useRef, useEffect } from 'react';
import { SendHorizontal, ImagePlus, X } from 'lucide-react';
import { UserRole } from '../types';

interface ChatInputProps {
    onSendMessage: (message: string, imageUrl?: string) => void;
    disabled: boolean;
    role: UserRole;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, disabled, role }) => {
    const [input, setInput] = useState('');
    const [selectedImage, setSelectedImage] = useState<string | undefined>();
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const isDev = role === 'developer';

    const handleSend = () => {
        if ((input.trim() || selectedImage) && !disabled) {
            onSendMessage(input.trim(), selectedImage);
            setInput('');
            setSelectedImage(undefined);
            // Reset height
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
            }
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setSelectedImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
        }
    }, [input]);

    const placeholderText = isDev 
        ? "请输入您的问题（提示：包含 '代码' 或 '写' 等关键词可触发不同模型）..." 
        : "请输入您的问题（注：当前角色只能使用 gemini-2.5-flash 模型）...";

    return (
        <div className={`p-4 sm:p-6 pt-3 sm:pt-4 transition-colors duration-300 ${isDev ? 'bg-zinc-50' : 'bg-white'}`}>
            {selectedImage && (
                <div className="mb-3 relative inline-block">
                    <img src={selectedImage} alt="Preview" className="h-20 w-20 object-cover rounded-lg border border-slate-200 shadow-sm" />
                    <button
                        onClick={() => setSelectedImage(undefined)}
                        className="absolute -top-2 -right-2 bg-white text-slate-500 hover:text-red-500 rounded-full p-0.5 shadow-md border border-slate-200"
                        aria-label="移除图片"
                    >
                        <X size={14} />
                    </button>
                </div>
            )}
            <div className={`max-w-4xl mx-auto relative flex items-end rounded-xl border transition-all shadow-sm overflow-hidden ${
                isDev 
                    ? 'bg-white border-zinc-300 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500' 
                    : 'bg-slate-50 border-slate-300 focus-within:border-slate-500 focus-within:ring-1 focus-within:ring-slate-500'
            }`}>
                {isDev && (
                    <>
                        <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            ref={fileInputRef} 
                            onChange={handleImageUpload} 
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={disabled}
                            className={`absolute left-2 bottom-2 p-2 rounded-lg transition-colors flex items-center justify-center ${
                                disabled ? 'text-slate-400 cursor-not-allowed' : 'text-zinc-500 hover:text-emerald-600 hover:bg-zinc-100'
                            }`}
                            aria-label="上传图片"
                        >
                            <ImagePlus size={20} />
                        </button>
                    </>
                )}
                <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholderText}
                    disabled={disabled}
                    className={`w-full max-h-[150px] py-3.5 pr-12 bg-transparent border-none focus:ring-0 resize-none text-[15px] ${
                        isDev ? 'pl-12 text-zinc-800 placeholder-zinc-400' : 'pl-4 text-slate-800 placeholder-slate-400'
                    }`}
                    rows={1}
                />
                <button
                    onClick={handleSend}
                    disabled={disabled || (!input.trim() && !selectedImage)}
                    className={`absolute right-2 bottom-2 p-2 rounded-lg transition-colors flex items-center justify-center ${
                        (input.trim() || selectedImage) && !disabled
                            ? (isDev ? 'bg-emerald-600 text-white hover:bg-emerald-500' : 'bg-slate-800 text-white hover:bg-slate-700')
                            : 'bg-transparent text-slate-400 cursor-not-allowed'
                    }`}
                    aria-label="发送消息"
                >
                    <SendHorizontal size={20} />
                </button>
            </div>
            <div className="text-center mt-2">
                <p className={`text-xs transition-colors duration-300 ${isDev ? 'text-zinc-400' : 'text-slate-400'}`}>
                    本助手专注于 Palo Alto Networks 产品，AI 生成内容可能存在误差，请注意甄别。
                </p>
            </div>
        </div>
    );
};
