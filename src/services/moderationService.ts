import { supabase } from '@/lib/supabase';

export interface ContentReport {
    id: string;
    reporterId: string;
    reportedUserId?: string;
    reportedMessageId?: string;
    reportedRideId?: string;
    category: ReportCategory;
    description: string;
    evidence?: string[];
    status: ReportStatus;
    severity: 'low' | 'medium' | 'high' | 'critical';
    assignedTo?: string;
    resolution?: string;
    resolvedAt?: string;
    createdAt: string;
}

export type ReportCategory =
    | 'spam'
    | 'harassment'
    | 'inappropriate_content'
    | 'fraud'
    | 'fake_profile'
    | 'safety_concern'
    | 'no_show'
    | 'dangerous_driving'
    | 'other';

export type ReportStatus =
    | 'pending'
    | 'under_review'
    | 'action_taken'
    | 'dismissed'
    | 'escalated';

export interface UserWarning {
    id: string;
    userId: string;
    reportId?: string;
    type: WarningType;
    message: string;
    expiresAt?: string;
    acknowledged: boolean;
    strikeCount: number;
    createdAt: string;
}

export type WarningType =
    | 'verbal_warning'
    | 'written_warning'
    | 'temporary_restriction'
    | 'temporary_ban'
    | 'permanent_ban';

export interface ModerationAction {
    id: string;
    userId: string;
    moderatorId: string;
    action: 'warn' | 'restrict' | 'suspend' | 'ban' | 'unban' | 'dismiss';
    reason: string;
    duration?: number; // in days
    createdAt: string;
}

// Profanity filter word list (simplified - in production use a proper library)
const BLOCKED_WORDS = [
    // This would contain actual blocked words
    // Using placeholders for demo
    'badword1',
    'badword2',
];

const SPAM_PATTERNS = [
    /\b(free money|click here|win \$|lottery|prize)/gi,
    /(.)\1{5,}/g, // Repeated characters
    /\b\d{10,}\b/g, // Long numbers (potential phone spam)
    /(https?:\/\/[^\s]+){3,}/g, // Multiple URLs
];

class ModerationService {
    // ==================== CONTENT FILTERING ====================

    filterContent(content: string): { clean: string; flagged: boolean; issues: string[] } {
        let clean = content;
        const issues: string[] = [];
        let flagged = false;

        // Check for blocked words
        for (const word of BLOCKED_WORDS) {
            const regex = new RegExp(`\\b${word}\\b`, 'gi');
            if (regex.test(content)) {
                clean = clean.replace(regex, '***');
                issues.push('inappropriate_language');
                flagged = true;
            }
        }

        // Check for spam patterns
        for (const pattern of SPAM_PATTERNS) {
            if (pattern.test(content)) {
                issues.push('spam_detected');
                flagged = true;
                break;
            }
        }

        // Check for excessive caps (shouting)
        const capsRatio = (content.match(/[A-Z]/g)?.length || 0) / content.length;
        if (capsRatio > 0.7 && content.length > 10) {
            issues.push('excessive_caps');
            flagged = true;
        }

        return { clean, flagged, issues };
    }

    async checkContentSafety(content: string, userId: string): Promise<{
        allowed: boolean;
        filtered: string;
        warning?: string;
    }> {
        const { clean, flagged, issues } = this.filterContent(content);

        if (!flagged) {
            return { allowed: true, filtered: content };
        }

        // Log the flagged content
        await supabase.from('content_flags').insert({
            user_id: userId,
            original_content: content,
            filtered_content: clean,
            issues,
            auto_action: issues.includes('inappropriate_language') ? 'filtered' : 'flagged',
        });

        // Check user's warning count
        const warnings = await this.getUserWarnings(userId);
        const activeStrikes = warnings.filter(
            (w) => !w.expiresAt || new Date(w.expiresAt) > new Date()
        ).length;

        if (activeStrikes >= 3) {
            return {
                allowed: false,
                filtered: clean,
                warning: 'Your account has too many warnings. This message was blocked.',
            };
        }

        return {
            allowed: true,
            filtered: clean,
            warning: 'Some content was automatically filtered.',
        };
    }

    // ==================== REPORTS ====================

    async createReport(
        reporterId: string,
        data: {
            reportedUserId?: string;
            reportedMessageId?: string;
            reportedRideId?: string;
            category: ReportCategory;
            description: string;
            evidence?: string[];
        }
    ): Promise<ContentReport> {
        // Determine severity based on category
        const severityMap: Record<ReportCategory, ContentReport['severity']> = {
            spam: 'low',
            inappropriate_content: 'medium',
            harassment: 'high',
            fraud: 'high',
            fake_profile: 'medium',
            safety_concern: 'critical',
            no_show: 'low',
            dangerous_driving: 'critical',
            other: 'low',
        };

        const { data: report, error } = await supabase
            .from('content_reports')
            .insert({
                reporter_id: reporterId,
                reported_user_id: data.reportedUserId,
                reported_message_id: data.reportedMessageId,
                reported_ride_id: data.reportedRideId,
                category: data.category,
                description: data.description,
                evidence: data.evidence,
                status: 'pending',
                severity: severityMap[data.category],
            })
            .select()
            .single();

        if (error) throw error;

        // Auto-escalate critical reports
        if (severityMap[data.category] === 'critical') {
            await this.escalateReport(report.id);
        }

        // Notify admins
        await this.notifyModerators(report.id, data.category);

        return this.mapReport(report);
    }

    async getReport(reportId: string): Promise<ContentReport | null> {
        const { data, error } = await supabase
            .from('content_reports')
            .select('*')
            .eq('id', reportId)
            .single();

        if (error || !data) return null;
        return this.mapReport(data);
    }

    async getPendingReports(limit: number = 50): Promise<ContentReport[]> {
        const { data, error } = await supabase
            .from('content_reports')
            .select('*')
            .in('status', ['pending', 'under_review'])
            .order('severity', { ascending: false })
            .order('created_at', { ascending: true })
            .limit(limit);

        if (error) throw error;
        return data?.map(this.mapReport) || [];
    }

    async updateReportStatus(
        reportId: string,
        status: ReportStatus,
        resolution?: string,
        moderatorId?: string
    ): Promise<ContentReport> {
        const updates: Record<string, unknown> = {
            status,
            resolution,
        };

        if (status === 'under_review') {
            updates.assigned_to = moderatorId;
        }

        if (['action_taken', 'dismissed'].includes(status)) {
            updates.resolved_at = new Date().toISOString();
        }

        const { data, error } = await supabase
            .from('content_reports')
            .update(updates)
            .eq('id', reportId)
            .select()
            .single();

        if (error) throw error;
        return this.mapReport(data);
    }

    async escalateReport(reportId: string): Promise<void> {
        await supabase
            .from('content_reports')
            .update({
                status: 'escalated',
                severity: 'critical',
            })
            .eq('id', reportId);

        // Notify senior moderators
        const { data: admins } = await supabase
            .from('profiles')
            .select('id')
            .eq('role', 'admin');

        for (const admin of admins || []) {
            await supabase.from('notifications').insert({
                user_id: admin.id,
                type: 'escalated_report',
                title: '⚠️ Escalated Report',
                message: 'A report has been escalated and requires immediate attention.',
                data: { report_id: reportId },
                priority: 'critical',
            });
        }
    }

    private async notifyModerators(reportId: string, category: ReportCategory): Promise<void> {
        const { data: moderators } = await supabase
            .from('profiles')
            .select('id')
            .in('role', ['admin', 'moderator']);

        for (const mod of moderators || []) {
            await supabase.from('notifications').insert({
                user_id: mod.id,
                type: 'new_report',
                title: '📋 New Report',
                message: `A new ${category.replace('_', ' ')} report needs review.`,
                data: { report_id: reportId },
                priority: 'high',
            });
        }
    }

    // ==================== WARNINGS & STRIKES ====================

    async issueWarning(
        userId: string,
        data: {
            type: WarningType;
            message: string;
            reportId?: string;
            durationDays?: number;
        }
    ): Promise<UserWarning> {
        // Get current strike count
        const currentWarnings = await this.getUserWarnings(userId);
        const activeStrikes = currentWarnings.filter(
            (w) => !w.expiresAt || new Date(w.expiresAt) > new Date()
        );

        const expiresAt = data.durationDays
            ? new Date(Date.now() + data.durationDays * 24 * 60 * 60 * 1000).toISOString()
            : undefined;

        const { data: warning, error } = await supabase
            .from('user_warnings')
            .insert({
                user_id: userId,
                report_id: data.reportId,
                type: data.type,
                message: data.message,
                expires_at: expiresAt,
                acknowledged: false,
                strike_count: activeStrikes.length + 1,
            })
            .select()
            .single();

        if (error) throw error;

        // Notify the user
        await supabase.from('notifications').insert({
            user_id: userId,
            type: 'warning_issued',
            title: '⚠️ Account Warning',
            message: data.message,
            data: { warning_id: warning.id },
            priority: 'high',
        });

        // Auto-escalate if too many strikes
        if (activeStrikes.length + 1 >= 5) {
            await this.suspendUser(userId, 'Automatic suspension due to multiple violations', 30);
        }

        return this.mapWarning(warning);
    }

    async getUserWarnings(userId: string): Promise<UserWarning[]> {
        const { data, error } = await supabase
            .from('user_warnings')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data?.map(this.mapWarning) || [];
    }

    async acknowledgeWarning(warningId: string): Promise<void> {
        await supabase
            .from('user_warnings')
            .update({ acknowledged: true })
            .eq('id', warningId);
    }

    async getActiveStrikeCount(userId: string): Promise<number> {
        const warnings = await this.getUserWarnings(userId);
        return warnings.filter((w) => !w.expiresAt || new Date(w.expiresAt) > new Date()).length;
    }

    // ==================== USER ACTIONS ====================

    async suspendUser(userId: string, reason: string, days: number): Promise<void> {
        const suspendedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

        await supabase
            .from('profiles')
            .update({
                status: 'suspended',
                suspended_until: suspendedUntil,
                suspension_reason: reason,
            })
            .eq('id', userId);

        // Log the action
        await supabase.from('moderation_actions').insert({
            user_id: userId,
            action: 'suspend',
            reason,
            duration: days,
        });

        // Notify user
        await supabase.from('notifications').insert({
            user_id: userId,
            type: 'account_suspended',
            title: '🚫 Account Suspended',
            message: `Your account has been suspended for ${days} days. Reason: ${reason}`,
            priority: 'critical',
        });
    }

    async banUser(userId: string, reason: string, permanent: boolean = false): Promise<void> {
        await supabase
            .from('profiles')
            .update({
                status: permanent ? 'banned' : 'suspended',
                banned_at: new Date().toISOString(),
                ban_reason: reason,
                is_permanent_ban: permanent,
            })
            .eq('id', userId);

        await supabase.from('moderation_actions').insert({
            user_id: userId,
            action: 'ban',
            reason,
            duration: permanent ? null : undefined,
        });
    }

    async unbanUser(userId: string, reason: string, moderatorId: string): Promise<void> {
        await supabase
            .from('profiles')
            .update({
                status: 'active',
                suspended_until: null,
                suspension_reason: null,
                banned_at: null,
                ban_reason: null,
                is_permanent_ban: false,
            })
            .eq('id', userId);

        await supabase.from('moderation_actions').insert({
            user_id: userId,
            moderator_id: moderatorId,
            action: 'unban',
            reason,
        });
    }

    async restrictUser(
        userId: string,
        restrictions: {
            canMessage: boolean;
            canCreateRides: boolean;
            canBook: boolean;
            canReview: boolean;
        },
        reason: string,
        days: number
    ): Promise<void> {
        const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

        await supabase.from('user_restrictions').insert({
            user_id: userId,
            can_message: restrictions.canMessage,
            can_create_rides: restrictions.canCreateRides,
            can_book: restrictions.canBook,
            can_review: restrictions.canReview,
            reason,
            expires_at: expiresAt,
        });

        await supabase.from('moderation_actions').insert({
            user_id: userId,
            action: 'restrict',
            reason,
            duration: days,
        });
    }

    async getUserRestrictions(userId: string): Promise<{
        canMessage: boolean;
        canCreateRides: boolean;
        canBook: boolean;
        canReview: boolean;
    }> {
        const { data } = await supabase
            .from('user_restrictions')
            .select('*')
            .eq('user_id', userId)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (!data) {
            return {
                canMessage: true,
                canCreateRides: true,
                canBook: true,
                canReview: true,
            };
        }

        return {
            canMessage: data.can_message,
            canCreateRides: data.can_create_rides,
            canBook: data.can_book,
            canReview: data.can_review,
        };
    }

    // ==================== MODERATION QUEUE ====================

    async getModerationQueue(filters?: {
        status?: ReportStatus;
        category?: ReportCategory;
        severity?: string;
    }): Promise<ContentReport[]> {
        let query = supabase
            .from('content_reports')
            .select('*, reporter:profiles!reporter_id(full_name), reported:profiles!reported_user_id(full_name)')
            .order('severity', { ascending: false })
            .order('created_at', { ascending: true });

        if (filters?.status) {
            query = query.eq('status', filters.status);
        }
        if (filters?.category) {
            query = query.eq('category', filters.category);
        }
        if (filters?.severity) {
            query = query.eq('severity', filters.severity);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data?.map(this.mapReport) || [];
    }

    async getModerationStats(): Promise<{
        pending: number;
        resolved: number;
        escalated: number;
        avgResolutionTime: number;
    }> {
        const { data: reports } = await supabase
            .from('content_reports')
            .select('status, created_at, resolved_at');

        if (!reports) {
            return { pending: 0, resolved: 0, escalated: 0, avgResolutionTime: 0 };
        }

        const pending = reports.filter((r) => r.status === 'pending').length;
        const resolved = reports.filter((r) =>
            ['action_taken', 'dismissed'].includes(r.status)
        ).length;
        const escalated = reports.filter((r) => r.status === 'escalated').length;

        // Calculate average resolution time
        const resolvedReports = reports.filter((r) => r.resolved_at);
        const totalTime = resolvedReports.reduce((sum, r) => {
            return sum + (new Date(r.resolved_at).getTime() - new Date(r.created_at).getTime());
        }, 0);
        const avgResolutionTime = resolvedReports.length > 0
            ? totalTime / resolvedReports.length / (1000 * 60 * 60) // hours
            : 0;

        return { pending, resolved, escalated, avgResolutionTime };
    }

    // ==================== MAPPERS ====================

    private mapReport(data: Record<string, unknown>): ContentReport {
        return {
            id: data.id as string,
            reporterId: data.reporter_id as string,
            reportedUserId: data.reported_user_id as string | undefined,
            reportedMessageId: data.reported_message_id as string | undefined,
            reportedRideId: data.reported_ride_id as string | undefined,
            category: data.category as ReportCategory,
            description: data.description as string,
            evidence: data.evidence as string[] | undefined,
            status: data.status as ReportStatus,
            severity: data.severity as ContentReport['severity'],
            assignedTo: data.assigned_to as string | undefined,
            resolution: data.resolution as string | undefined,
            resolvedAt: data.resolved_at as string | undefined,
            createdAt: data.created_at as string,
        };
    }

    private mapWarning(data: Record<string, unknown>): UserWarning {
        return {
            id: data.id as string,
            userId: data.user_id as string,
            reportId: data.report_id as string | undefined,
            type: data.type as WarningType,
            message: data.message as string,
            expiresAt: data.expires_at as string | undefined,
            acknowledged: data.acknowledged as boolean,
            strikeCount: data.strike_count as number,
            createdAt: data.created_at as string,
        };
    }
}

export const moderationService = new ModerationService();
