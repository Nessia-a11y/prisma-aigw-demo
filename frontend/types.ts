export type UserRole = 'customer' | 'developer';

export interface Message {
    id: string;
    role: 'user' | 'model';
    text: string;
    isStreaming?: boolean;
    isError?: boolean;
    imageUrl?: string;
    isFallback?: boolean;
    cacheHit?: boolean;
    tokensSaved?: number;
    traceId?: string;
    feedback?: 'up' | 'down';
}
