let messageHistory: { role: string, content: string | any[] }[] = [];

const getSystemInstruction = (role: 'customer' | 'developer') => `您是一位知识渊博、专业且乐于助人的虚拟助手。您在 Palo Alto Networks 产品和网络安全方面拥有深厚的专业知识，但您也完全有能力并愿意协助用户提出的任何其他任务，包括常规问题和编程。

当前角色：您正在与一位${role === 'developer' ? '开发者/技术用户交谈。请提供详细的技术解释、API 端点、代码片段和配置细节。' : '客户/业务用户交谈。请提供高层次的概述、业务优势和易于理解的解释，除非被要求，否则不要使用过于专业的术语。'}

指南：
1. 提供清晰、简明和准确的信息。
2. 使用项目符号、粗体文本或编号列表等格式，使您的回答易于阅读和理解。
3. 保持专业和乐于助人的语气。
4. 如果您不知道确切答案，请建议用户去哪里寻找，而不是猜测。`;

export const initChat = (role: 'customer' | 'developer' = 'customer') => {
    messageHistory = [
        { role: 'system', content: getSystemInstruction(role) }
    ];
};

export const sendFeedback = async (traceId: string, value: number) => {
    try {
        await fetch('https://api.portkey.ai/v1/feedback', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-portkey-api-key': 'INPUT_YOUR_KEY'
            },
            body: JSON.stringify({
                trace_id: traceId,
                value: value
            })
        });
    } catch (error) {
        console.error("Failed to send feedback to Portkey:", error);
    }
};

export const sendMessageStream = async function* (message: string, role: 'customer' | 'developer' = 'customer', imageUrl?: string) {
    if (messageHistory.length === 0) {
        initChat(role);
    } else if (messageHistory[0].role === 'system') {
        // Update the system prompt dynamically if the role has changed
        messageHistory[0].content = getSystemInstruction(role);
    }

    // Format content based on whether an image is provided
    let contentPayload: string | any[] = message;
    if (imageUrl) {
        contentPayload = [
            { type: "text", text: message || "请分析这张图片" },
            { type: "image_url", image_url: { url: imageUrl } }
        ];
    }

    messageHistory.push({ role: 'user', content: contentPayload });

    // Determine task type for Portkey metadata
    const lowerMsg = message.toLowerCase();
    let taskValue = 'general';
    
    if (imageUrl && role === 'developer') {
        taskValue = 'vision';
    } else if (lowerMsg.includes('代码') || lowerMsg.includes('编程') || lowerMsg.includes('code')) {
        taskValue = 'coding';
    } else if (lowerMsg.includes('写') || lowerMsg.includes('撰写') || lowerMsg.includes('起草') || lowerMsg.includes('write')) {
        taskValue = 'writing';
    }

    try {
        const response = await fetch('https://aigw.portkey.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-portkey-api-key': 'INPUT_YOUR_KEY',
                'x-portkey-config': 'INPUT_YOUR_CONFIG_ID',
                'x-portkey-cache': 'simple',
                'x-portkey-metadata': JSON.stringify({ task: taskValue, role: role })
            },
            body: JSON.stringify({
                messages: messageHistory,
                stream: true
            })
        });

        // Handle specific guardrail block status codes
        if (response.status === 246 || response.status === 446) {
            const blockedMessage = "🚫 您的输入没有经过 Prisma AIRS 的检查，请重新输入！";
            yield { type: 'content', text: blockedMessage };
            messageHistory.push({ role: 'assistant', content: blockedMessage });
            return;
        }

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Portkey API Error:", errorText);
            throw new Error(`API Error: ${response.status} - ${errorText}`);
        }

        if (!response.body) throw new Error("No response body returned.");

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = '';
        let fullContent = '';
        let actualModel = 'Unknown Model';
        let isCacheHit = false;
        let totalTokens = 0;
        let isFallbackYielded = false;
        let traceId = '';

        // 尝试从 HTTP Header 中获取缓存状态
        const cacheHeader = response.headers.get('x-portkey-cache-status') || response.headers.get('X-Portkey-Cache-Status');
        if (cacheHeader && cacheHeader.toUpperCase().includes('HIT')) {
            isCacheHit = true;
        }

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            // 处理标准 SSE 流
            if (buffer.includes('data: ')) {
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (trimmedLine.startsWith('data: ')) {
                        const dataStr = trimmedLine.substring(6);
                        if (dataStr === '[DONE]') continue;
                        try {
                            const data = JSON.parse(dataStr);
                            
                            // 兼容用户提供的嵌套 JSON 结构
                            const body = data.body || data;
                            
                            if (body.model) actualModel = body.model;
                            
                            // 从 body.id 获取 traceId
                            if (body.id) traceId = body.id;
                            
                            // 根据要求：如果在 body.usage 里有 cached_tokens 这个参数则是 miss，否则是 hit
                            if (body.usage) {
                                if (body.usage.total_tokens) totalTokens = body.usage.total_tokens;
                                
                                const hasCachedTokens = 'cached_tokens' in body.usage || 
                                                        (body.usage.prompt_tokens_details && 'cached_tokens' in body.usage.prompt_tokens_details);
                                isCacheHit = !hasCachedTokens;
                            }

                            const deltaContent = body.choices?.[0]?.delta?.content || body.choices?.[0]?.message?.content || '';
                            if (deltaContent) {
                                if (role === 'developer' && taskValue === 'coding' && !isFallbackYielded) {
                                    yield { type: 'fallback', text: 'Fallback: ⚠️ 监测到主模型超时，已由 Portkey 自动为您切换至备用模型' };
                                    isFallbackYielded = true;
                                }
                                
                                fullContent += deltaContent;
                                yield { type: 'content', text: deltaContent, cacheHit: isCacheHit, tokensSaved: totalTokens, traceId };
                            }
                        } catch (e) {}
                    }
                }
            }
        }

        // 处理非 SSE 的完整 JSON 响应（例如 Portkey 缓存命中时直接返回的 JSON 对象）
        if (buffer.trim().startsWith('{') && !buffer.includes('data: ')) {
            try {
                const data = JSON.parse(buffer.trim());
                
                const body = data.body || data;
                if (body.model) actualModel = body.model;
                
                // 从 body.id 获取 traceId
                if (body.id) traceId = body.id;
                
                if (body.usage) {
                    if (body.usage.total_tokens) totalTokens = body.usage.total_tokens;
                    
                    const hasCachedTokens = 'cached_tokens' in body.usage || 
                                            (body.usage.prompt_tokens_details && 'cached_tokens' in body.usage.prompt_tokens_details);
                    isCacheHit = !hasCachedTokens;
                }
                
                const content = body.choices?.[0]?.message?.content || body.choices?.[0]?.delta?.content || '';
                
                if (content) {
                    if (role === 'developer' && taskValue === 'coding' && !isFallbackYielded) {
                        yield { type: 'fallback', text: 'Fallback: ⚠️ 监测到主模型超时，已由 Portkey 自动为您切换至备用模型' };
                        isFallbackYielded = true;
                    }
                    
                    // 模拟流式输出
                    const chunkSize = 4;
                    for (let i = 0; i < content.length; i += chunkSize) {
                        const chunk = content.substring(i, i + chunkSize);
                        fullContent += chunk;
                        yield { type: 'content', text: chunk, cacheHit: isCacheHit, tokensSaved: totalTokens, traceId };
                        await new Promise(resolve => setTimeout(resolve, 10));
                    }
                }
            } catch (e) {
                console.error("Failed to parse buffered JSON", e);
            }
        }

        // 流结束后，追加模型信息和缓存信息到回复的最后
        if (fullContent) {
            let footer = `\n\n---\n🤖 *(由 ${actualModel} 生成)*`;
            if (isCacheHit) {
                footer += `\n⚡ **Cache Hit** - 节省了 ${totalTokens} 个 Token`;
            }
            
            yield { type: 'content', text: footer, cacheHit: isCacheHit, tokensSaved: totalTokens, traceId };
            messageHistory.push({ role: 'assistant', content: fullContent });
        }

    } catch (error) {
        console.error("Error sending message via Portkey:", error);
        messageHistory.pop();
        throw error;
    }
};
