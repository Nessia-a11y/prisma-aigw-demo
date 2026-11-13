import React, { useMemo } from 'react';
import { Network } from 'lucide-react';
import { UserRole } from '../types';

interface RoutingPromptsProps {
    onSelect: (prompt: string) => void;
    disabled: boolean;
    refreshKey: number;
    role: UserRole;
}

const CODING_PROMPTS = [
    "您能提供一个与 PAN-OS API 交互的 Python 代码片段吗？",
    "向我展示自动化 Cortex XDR 代理部署的编程步骤。",
    "我需要一些代码来在 Prisma Access 中创建新的安全策略。",
    "部署 VM-Series 防火墙的 Terraform 代码是什么？"
];

const WRITING_PROMPTS = [
    "写一份简短的执行摘要，解释零信任架构的好处。",
    "请撰写一封给 IT 团队的关于即将进行的 Prisma Cloud 迁移的电子邮件。",
    "写一篇关于 XDR 在现代 SOC 中重要性的博客文章介绍。",
    "我需要帮助起草一份针对恶意软件爆发的事件响应报告模板。"
];

const GENERAL_PROMPTS = [
    "Strata 和 Prisma 之间有什么区别？",
    "App-ID 在 Palo Alto Networks 防火墙中是如何工作的？",
    "用简单的术语解释 SASE 的概念。",
    "Cortex XSIAM 的主要功能是什么？"
];

export const RoutingPrompts: React.FC<RoutingPromptsProps> = ({ onSelect, disabled, refreshKey, role }) => {
    const isDev = role === 'developer';
    
    const prompts = useMemo(() => {
        const pickRandom = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
        return [
            { label: "编程任务", text: pickRandom(CODING_PROMPTS) },
            { label: "写作任务", text: pickRandom(WRITING_PROMPTS) },
            { label: "常规查询", text: pickRandom(GENERAL_PROMPTS) }
        ];
    }, [refreshKey]);

    return (
        <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 pt-1">
            <div className={`flex items-center space-x-2 mb-3 transition-colors duration-300 ${isDev ? 'text-emerald-600' : 'text-indigo-600'}`}>
                <Network size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">条件路由测试</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                {prompts.map((prompt, idx) => (
                    <button
                        key={idx}
                        onClick={() => onSelect(prompt.text)}
                        disabled={disabled}
                        className={`text-left p-3 rounded-xl border transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm group ${
                            isDev 
                                ? 'border-zinc-200 bg-white hover:bg-zinc-100 hover:border-emerald-300' 
                                : 'border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                    >
                        <div className={`font-semibold text-sm mb-1 transition-colors ${
                            isDev ? 'text-zinc-800 group-hover:text-emerald-600' : 'text-slate-800 group-hover:text-indigo-700'
                        }`}>
                            {prompt.label}
                        </div>
                        <div className={`text-xs line-clamp-2 transition-colors ${isDev ? 'text-zinc-500' : 'text-slate-500'}`}>
                            {prompt.text}
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};
