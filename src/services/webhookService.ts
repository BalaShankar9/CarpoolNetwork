import { supabase } from '../lib/supabase';
import crypto from 'crypto';

// Types
export type WebhookEvent =
    | 'ride.created'
    | 'ride.updated'
    | 'ride.cancelled'
    | 'ride.completed'
    | 'booking.created'
    | 'booking.confirmed'
    | 'booking.cancelled'
    | 'user.registered'
    | 'user.verified'
    | 'payment.completed'
    | 'payment.refunded'
    | 'message.sent';

export interface Webhook {
    id: string;
    userId: string;
    name: string;
    url: string;
    secret: string;
    events: WebhookEvent[];
    active: boolean;
    headers?: Record<string, string>;
    createdAt: Date;
    updatedAt: Date;
}

export interface WebhookDelivery {
    id: string;
    webhookId: string;
    event: WebhookEvent;
    payload: any;
    requestHeaders: Record<string, string>;
    responseStatus?: number;
    responseBody?: string;
    responseTime?: number;
    success: boolean;
    error?: string;
    attempts: number;
    createdAt: Date;
    deliveredAt?: Date;
}

export interface ApiKey {
    id: string;
    userId: string;
    name: string;
    keyHash: string;
    keyPrefix: string;
    scopes: ApiScope[];
    lastUsed?: Date;
    expiresAt?: Date;
    createdAt: Date;
    active: boolean;
}

export type ApiScope =
    | 'rides:read'
    | 'rides:write'
    | 'bookings:read'
    | 'bookings:write'
    | 'profile:read'
    | 'profile:write'
    | 'messages:read'
    | 'messages:write'
    | 'payments:read'
    | 'webhooks:manage';

export interface ApiUsage {
    userId: string;
    endpoint: string;
    method: string;
    statusCode: number;
    responseTime: number;
    timestamp: Date;
}

// Events Configuration
export const WEBHOOK_EVENTS: { event: WebhookEvent; name: string; description: string }[] = [
    { event: 'ride.created', name: 'Ride Created', description: 'When a new ride is posted' },
    { event: 'ride.updated', name: 'Ride Updated', description: 'When a ride is modified' },
    { event: 'ride.cancelled', name: 'Ride Cancelled', description: 'When a ride is cancelled' },
    { event: 'ride.completed', name: 'Ride Completed', description: 'When a ride is marked complete' },
    { event: 'booking.created', name: 'Booking Created', description: 'When someone books a seat' },
    { event: 'booking.confirmed', name: 'Booking Confirmed', description: 'When a booking is confirmed' },
    { event: 'booking.cancelled', name: 'Booking Cancelled', description: 'When a booking is cancelled' },
    { event: 'user.registered', name: 'User Registered', description: 'When a new user signs up' },
    { event: 'user.verified', name: 'User Verified', description: 'When a user is verified' },
    { event: 'payment.completed', name: 'Payment Completed', description: 'When a payment succeeds' },
    { event: 'payment.refunded', name: 'Payment Refunded', description: 'When a payment is refunded' },
    { event: 'message.sent', name: 'Message Sent', description: 'When a message is sent' },
];

// API Scopes Configuration
export const API_SCOPES: { scope: ApiScope; name: string; description: string }[] = [
    { scope: 'rides:read', name: 'Read Rides', description: 'View ride information' },
    { scope: 'rides:write', name: 'Write Rides', description: 'Create and update rides' },
    { scope: 'bookings:read', name: 'Read Bookings', description: 'View booking information' },
    { scope: 'bookings:write', name: 'Write Bookings', description: 'Create and cancel bookings' },
    { scope: 'profile:read', name: 'Read Profile', description: 'View user profile' },
    { scope: 'profile:write', name: 'Write Profile', description: 'Update user profile' },
    { scope: 'messages:read', name: 'Read Messages', description: 'View messages' },
    { scope: 'messages:write', name: 'Write Messages', description: 'Send messages' },
    { scope: 'payments:read', name: 'Read Payments', description: 'View payment history' },
    { scope: 'webhooks:manage', name: 'Manage Webhooks', description: 'Create and manage webhooks' },
];

// Webhook & API Service
export const webhookService = {
    // ==================== WEBHOOKS ====================

    // Create a webhook
    async createWebhook(
        userId: string,
        name: string,
        url: string,
        events: WebhookEvent[],
        headers?: Record<string, string>
    ): Promise<Webhook | null> {
        const secret = this.generateSecret();

        const webhook: Webhook = {
            id: crypto.randomUUID(),
            userId,
            name,
            url,
            secret,
            events,
            active: true,
            headers,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        try {
            const { error } = await supabase.from('webhooks').insert({
                id: webhook.id,
                user_id: webhook.userId,
                name: webhook.name,
                url: webhook.url,
                secret: webhook.secret,
                events: webhook.events,
                active: webhook.active,
                headers: webhook.headers,
                created_at: webhook.createdAt.toISOString(),
                updated_at: webhook.updatedAt.toISOString(),
            });

            if (error) throw error;
            return webhook;
        } catch (error) {
            console.error('Failed to create webhook:', error);
            return null;
        }
    },

    // Update webhook
    async updateWebhook(
        webhookId: string,
        updates: Partial<Pick<Webhook, 'name' | 'url' | 'events' | 'active' | 'headers'>>
    ): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('webhooks')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', webhookId);

            return !error;
        } catch (error) {
            console.error('Failed to update webhook:', error);
            return false;
        }
    },

    // Delete webhook
    async deleteWebhook(webhookId: string): Promise<boolean> {
        try {
            const { error } = await supabase.from('webhooks').delete().eq('id', webhookId);
            return !error;
        } catch (error) {
            console.error('Failed to delete webhook:', error);
            return false;
        }
    },

    // Get user's webhooks
    async getWebhooks(userId: string): Promise<Webhook[]> {
        try {
            const { data, error } = await supabase
                .from('webhooks')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return (data || []).map((w) => ({
                id: w.id,
                userId: w.user_id,
                name: w.name,
                url: w.url,
                secret: w.secret,
                events: w.events,
                active: w.active,
                headers: w.headers,
                createdAt: new Date(w.created_at),
                updatedAt: new Date(w.updated_at),
            }));
        } catch (error) {
            console.error('Failed to get webhooks:', error);
            return [];
        }
    },

    // Regenerate webhook secret
    async regenerateSecret(webhookId: string): Promise<string | null> {
        const newSecret = this.generateSecret();

        try {
            const { error } = await supabase
                .from('webhooks')
                .update({ secret: newSecret, updated_at: new Date().toISOString() })
                .eq('id', webhookId);

            if (error) throw error;
            return newSecret;
        } catch (error) {
            console.error('Failed to regenerate secret:', error);
            return null;
        }
    },

    // Trigger webhook delivery
    async triggerWebhook(event: WebhookEvent, payload: any): Promise<void> {
        try {
            // Find all active webhooks subscribed to this event
            const { data: webhooks } = await supabase
                .from('webhooks')
                .select('*')
                .eq('active', true)
                .contains('events', [event]);

            if (!webhooks?.length) return;

            // Deliver to each webhook
            for (const webhook of webhooks) {
                await this.deliverWebhook(webhook, event, payload);
            }
        } catch (error) {
            console.error('Failed to trigger webhooks:', error);
        }
    },

    // Deliver webhook to endpoint
    async deliverWebhook(webhook: any, event: WebhookEvent, payload: any): Promise<void> {
        const deliveryId = crypto.randomUUID();
        const timestamp = Math.floor(Date.now() / 1000);
        const body = JSON.stringify({
            id: deliveryId,
            event,
            timestamp,
            data: payload,
        });

        // Create signature
        const signature = this.createSignature(body, webhook.secret);

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'X-Webhook-Event': event,
            'X-Webhook-Signature': signature,
            'X-Webhook-Timestamp': String(timestamp),
            'X-Webhook-Delivery-Id': deliveryId,
            ...(webhook.headers || {}),
        };

        const startTime = Date.now();
        let success = false;
        let responseStatus: number | undefined;
        let responseBody: string | undefined;
        let error: string | undefined;

        try {
            const response = await fetch(webhook.url, {
                method: 'POST',
                headers,
                body,
            });

            responseStatus = response.status;
            responseBody = await response.text().catch(() => '');
            success = response.ok;
        } catch (err: any) {
            error = err.message;
        }

        const responseTime = Date.now() - startTime;

        // Log delivery
        await supabase.from('webhook_deliveries').insert({
            id: deliveryId,
            webhook_id: webhook.id,
            event,
            payload,
            request_headers: headers,
            response_status: responseStatus,
            response_body: responseBody?.substring(0, 1000),
            response_time: responseTime,
            success,
            error,
            attempts: 1,
            created_at: new Date().toISOString(),
            delivered_at: success ? new Date().toISOString() : null,
        });
    },

    // Get webhook deliveries
    async getDeliveries(webhookId: string, limit: number = 50): Promise<WebhookDelivery[]> {
        try {
            const { data, error } = await supabase
                .from('webhook_deliveries')
                .select('*')
                .eq('webhook_id', webhookId)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;

            return (data || []).map((d) => ({
                id: d.id,
                webhookId: d.webhook_id,
                event: d.event,
                payload: d.payload,
                requestHeaders: d.request_headers,
                responseStatus: d.response_status,
                responseBody: d.response_body,
                responseTime: d.response_time,
                success: d.success,
                error: d.error,
                attempts: d.attempts,
                createdAt: new Date(d.created_at),
                deliveredAt: d.delivered_at ? new Date(d.delivered_at) : undefined,
            }));
        } catch (error) {
            console.error('Failed to get deliveries:', error);
            return [];
        }
    },

    // Test webhook
    async testWebhook(webhookId: string): Promise<WebhookDelivery | null> {
        try {
            const { data: webhook } = await supabase
                .from('webhooks')
                .select('*')
                .eq('id', webhookId)
                .single();

            if (!webhook) return null;

            const testPayload = {
                test: true,
                message: 'This is a test webhook delivery',
                timestamp: new Date().toISOString(),
            };

            await this.deliverWebhook(webhook, webhook.events[0] || 'ride.created', testPayload);

            // Get the delivery record
            const deliveries = await this.getDeliveries(webhookId, 1);
            return deliveries[0] || null;
        } catch (error) {
            console.error('Failed to test webhook:', error);
            return null;
        }
    },

    // ==================== API KEYS ====================

    // Create API key
    async createApiKey(
        userId: string,
        name: string,
        scopes: ApiScope[],
        expiresInDays?: number
    ): Promise<{ apiKey: ApiKey; plainTextKey: string } | null> {
        const plainTextKey = this.generateApiKey();
        const keyHash = await this.hashApiKey(plainTextKey);
        const keyPrefix = plainTextKey.substring(0, 8);

        const apiKey: ApiKey = {
            id: crypto.randomUUID(),
            userId,
            name,
            keyHash,
            keyPrefix,
            scopes,
            expiresAt: expiresInDays
                ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
                : undefined,
            createdAt: new Date(),
            active: true,
        };

        try {
            const { error } = await supabase.from('api_keys').insert({
                id: apiKey.id,
                user_id: apiKey.userId,
                name: apiKey.name,
                key_hash: apiKey.keyHash,
                key_prefix: apiKey.keyPrefix,
                scopes: apiKey.scopes,
                expires_at: apiKey.expiresAt?.toISOString(),
                created_at: apiKey.createdAt.toISOString(),
                active: apiKey.active,
            });

            if (error) throw error;

            return { apiKey, plainTextKey };
        } catch (error) {
            console.error('Failed to create API key:', error);
            return null;
        }
    },

    // Validate API key
    async validateApiKey(key: string): Promise<{ valid: boolean; userId?: string; scopes?: ApiScope[] }> {
        const keyHash = await this.hashApiKey(key);

        try {
            const { data, error } = await supabase
                .from('api_keys')
                .select('user_id, scopes, expires_at, active')
                .eq('key_hash', keyHash)
                .single();

            if (error || !data) {
                return { valid: false };
            }

            if (!data.active) {
                return { valid: false };
            }

            if (data.expires_at && new Date(data.expires_at) < new Date()) {
                return { valid: false };
            }

            // Update last used
            await supabase
                .from('api_keys')
                .update({ last_used: new Date().toISOString() })
                .eq('key_hash', keyHash);

            return {
                valid: true,
                userId: data.user_id,
                scopes: data.scopes,
            };
        } catch (error) {
            console.error('API key validation error:', error);
            return { valid: false };
        }
    },

    // Get user's API keys
    async getApiKeys(userId: string): Promise<ApiKey[]> {
        try {
            const { data, error } = await supabase
                .from('api_keys')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return (data || []).map((k) => ({
                id: k.id,
                userId: k.user_id,
                name: k.name,
                keyHash: k.key_hash,
                keyPrefix: k.key_prefix,
                scopes: k.scopes,
                lastUsed: k.last_used ? new Date(k.last_used) : undefined,
                expiresAt: k.expires_at ? new Date(k.expires_at) : undefined,
                createdAt: new Date(k.created_at),
                active: k.active,
            }));
        } catch (error) {
            console.error('Failed to get API keys:', error);
            return [];
        }
    },

    // Revoke API key
    async revokeApiKey(keyId: string): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('api_keys')
                .update({ active: false })
                .eq('id', keyId);

            return !error;
        } catch (error) {
            console.error('Failed to revoke API key:', error);
            return false;
        }
    },

    // Delete API key
    async deleteApiKey(keyId: string): Promise<boolean> {
        try {
            const { error } = await supabase.from('api_keys').delete().eq('id', keyId);
            return !error;
        } catch (error) {
            console.error('Failed to delete API key:', error);
            return false;
        }
    },

    // ==================== HELPERS ====================

    generateSecret(): string {
        return 'whsec_' + crypto.randomBytes(32).toString('hex');
    },

    generateApiKey(): string {
        return 'cpn_' + crypto.randomBytes(32).toString('hex');
    },

    createSignature(payload: string, secret: string): string {
        const hmac = crypto.createHmac('sha256', secret);
        hmac.update(payload);
        return 'sha256=' + hmac.digest('hex');
    },

    async hashApiKey(key: string): Promise<string> {
        const encoder = new TextEncoder();
        const data = encoder.encode(key);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    },

    verifySignature(payload: string, signature: string, secret: string): boolean {
        const expectedSignature = this.createSignature(payload, secret);
        return signature === expectedSignature;
    },
};
