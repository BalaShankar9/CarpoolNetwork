import { supabase } from '@/lib/supabase';

export interface Dispute {
  id: string;
  rideId: string;
  createdBy: string;
  againstUserId: string;
  type: DisputeType;
  status: DisputeStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  description: string;
  evidence: DisputeEvidence[];
  resolution?: DisputeResolution;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

export type DisputeType =
  | 'payment'
  | 'no_show'
  | 'safety'
  | 'behavior'
  | 'property_damage'
  | 'route_issue'
  | 'cancellation'
  | 'other';

export type DisputeStatus =
  | 'open'
  | 'under_review'
  | 'awaiting_response'
  | 'mediation'
  | 'resolved'
  | 'closed';

export interface DisputeEvidence {
  id: string;
  disputeId: string;
  type: 'screenshot' | 'message' | 'ride_data' | 'document' | 'other';
  url?: string;
  content?: string;
  description: string;
  submittedBy: string;
  createdAt: string;
}

export interface DisputeResolution {
  id: string;
  disputeId: string;
  outcome: 'favor_creator' | 'favor_other' | 'mutual' | 'no_action' | 'both_warned';
  summary: string;
  actions: ResolutionAction[];
  creditAmount?: number;
  refundAmount?: number;
  resolvedBy: string;
  createdAt: string;
}

export interface ResolutionAction {
  type: 'warning' | 'suspension' | 'ban' | 'credit' | 'refund' | 'restriction';
  targetUserId: string;
  details: string;
}

export interface DisputeMessage {
  id: string;
  disputeId: string;
  senderId: string;
  senderType: 'user' | 'moderator' | 'system';
  content: string;
  attachments?: string[];
  createdAt: string;
}

class DisputeService {
  // ==================== CREATE DISPUTE ====================

  async createDispute(
    creatorId: string,
    data: {
      rideId: string;
      againstUserId: string;
      type: DisputeType;
      description: string;
      evidence?: Array<{ type: DisputeEvidence['type']; url?: string; content?: string; description: string }>;
    }
  ): Promise<Dispute> {
    // Determine priority based on type
    const priorityMap: Record<DisputeType, Dispute['priority']> = {
      safety: 'urgent',
      property_damage: 'high',
      behavior: 'high',
      payment: 'medium',
      no_show: 'medium',
      route_issue: 'low',
      cancellation: 'low',
      other: 'low',
    };

    const { data: dispute, error } = await supabase
      .from('disputes')
      .insert({
        ride_id: data.rideId,
        created_by: creatorId,
        against_user_id: data.againstUserId,
        type: data.type,
        status: 'open',
        priority: priorityMap[data.type],
        description: data.description,
      })
      .select()
      .single();

    if (error) throw error;

    // Add evidence if provided
    if (data.evidence && data.evidence.length > 0) {
      for (const ev of data.evidence) {
        await this.addEvidence(dispute.id, creatorId, ev);
      }
    }

    // Notify the other party
    await this.notifyDisputeCreated(dispute.id, data.againstUserId, data.type);

    // Notify moderators for high priority
    if (['urgent', 'high'].includes(priorityMap[data.type])) {
      await this.notifyModerators(dispute.id, data.type);
    }

    return this.mapDispute(dispute);
  }

  // ==================== EVIDENCE ====================

  async addEvidence(
    disputeId: string,
    submittedBy: string,
    evidence: {
      type: DisputeEvidence['type'];
      url?: string;
      content?: string;
      description: string;
    }
  ): Promise<DisputeEvidence> {
    const { data, error } = await supabase
      .from('dispute_evidence')
      .insert({
        dispute_id: disputeId,
        submitted_by: submittedBy,
        type: evidence.type,
        url: evidence.url,
        content: evidence.content,
        description: evidence.description,
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapEvidence(data);
  }

  async getDisputeEvidence(disputeId: string): Promise<DisputeEvidence[]> {
    const { data, error } = await supabase
      .from('dispute_evidence')
      .select('*')
      .eq('dispute_id', disputeId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data?.map(this.mapEvidence) || [];
  }

  // ==================== MESSAGING ====================

  async sendMessage(
    disputeId: string,
    senderId: string,
    senderType: DisputeMessage['senderType'],
    content: string,
    attachments?: string[]
  ): Promise<DisputeMessage> {
    const { data, error } = await supabase
      .from('dispute_messages')
      .insert({
        dispute_id: disputeId,
        sender_id: senderId,
        sender_type: senderType,
        content,
        attachments,
      })
      .select()
      .single();

    if (error) throw error;

    // Update dispute status if needed
    if (senderType === 'moderator') {
      await supabase
        .from('disputes')
        .update({ status: 'under_review', updated_at: new Date().toISOString() })
        .eq('id', disputeId);
    }

    return this.mapMessage(data);
  }

  async getDisputeMessages(disputeId: string): Promise<DisputeMessage[]> {
    const { data, error } = await supabase
      .from('dispute_messages')
      .select('*')
      .eq('dispute_id', disputeId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data?.map(this.mapMessage) || [];
  }

  // ==================== STATUS UPDATES ====================

  async updateStatus(
    disputeId: string,
    status: DisputeStatus,
    moderatorId?: string
  ): Promise<Dispute> {
    const updates: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (moderatorId && status === 'under_review') {
      updates.assigned_to = moderatorId;
    }

    const { data, error } = await supabase
      .from('disputes')
      .update(updates)
      .eq('id', disputeId)
      .select()
      .single();

    if (error) throw error;

    // Add system message
    await this.sendMessage(disputeId, 'system', 'system', `Dispute status changed to: ${status.replace('_', ' ')}`);

    // Notify parties
    const dispute = this.mapDispute(data);
    await this.notifyStatusChange(dispute);

    return dispute;
  }

  // ==================== RESOLUTION ====================

  async resolveDispute(
    disputeId: string,
    moderatorId: string,
    resolution: {
      outcome: DisputeResolution['outcome'];
      summary: string;
      actions: ResolutionAction[];
      creditAmount?: number;
      refundAmount?: number;
    }
  ): Promise<DisputeResolution> {
    // Create resolution record
    const { data: resolutionData, error: resError } = await supabase
      .from('dispute_resolutions')
      .insert({
        dispute_id: disputeId,
        resolved_by: moderatorId,
        outcome: resolution.outcome,
        summary: resolution.summary,
        actions: resolution.actions,
        credit_amount: resolution.creditAmount,
        refund_amount: resolution.refundAmount,
      })
      .select()
      .single();

    if (resError) throw resError;

    // Update dispute status
    await supabase
      .from('disputes')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', disputeId);

    // Execute resolution actions
    await this.executeResolutionActions(disputeId, resolution.actions);

    // Handle credits/refunds
    if (resolution.creditAmount || resolution.refundAmount) {
      await this.processCompensation(disputeId, resolution.creditAmount, resolution.refundAmount);
    }

    // Add system message
    await this.sendMessage(
      disputeId,
      'system',
      'system',
      `Dispute resolved: ${resolution.summary}`
    );

    return this.mapResolution(resolutionData);
  }

  private async executeResolutionActions(
    disputeId: string,
    actions: ResolutionAction[]
  ): Promise<void> {
    for (const action of actions) {
      switch (action.type) {
        case 'warning':
          await supabase.from('user_warnings').insert({
            user_id: action.targetUserId,
            type: 'written_warning',
            message: action.details,
            dispute_id: disputeId,
          });
          break;

        case 'suspension':
          await supabase.from('profiles').update({
            status: 'suspended',
            suspended_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            suspension_reason: action.details,
          }).eq('id', action.targetUserId);
          break;

        case 'ban':
          await supabase.from('profiles').update({
            status: 'banned',
            banned_at: new Date().toISOString(),
            ban_reason: action.details,
          }).eq('id', action.targetUserId);
          break;

        case 'restriction':
          await supabase.from('user_restrictions').insert({
            user_id: action.targetUserId,
            reason: action.details,
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          });
          break;
      }

      // Notify affected user
      await supabase.from('notifications').insert({
        user_id: action.targetUserId,
        type: 'dispute_action',
        title: 'Dispute Resolution Action',
        message: action.details,
        data: { dispute_id: disputeId, action_type: action.type },
        priority: 'high',
      });
    }
  }

  private async processCompensation(
    disputeId: string,
    creditAmount?: number,
    refundAmount?: number
  ): Promise<void> {
    const { data: dispute } = await supabase
      .from('disputes')
      .select('created_by, ride_id')
      .eq('id', disputeId)
      .single();

    if (!dispute) return;

    if (creditAmount && creditAmount > 0) {
      // Add credit to user's account
      await supabase.from('user_credits').insert({
        user_id: dispute.created_by,
        amount: creditAmount,
        reason: `Dispute resolution credit - Dispute #${disputeId.slice(0, 8)}`,
        dispute_id: disputeId,
      });

      await supabase.from('notifications').insert({
        user_id: dispute.created_by,
        type: 'credit_added',
        title: '💰 Credit Added',
        message: `£${creditAmount.toFixed(2)} has been added to your account as dispute resolution.`,
      });
    }

    if (refundAmount && refundAmount > 0) {
      // Process refund (would integrate with payment provider in production)
      await supabase.from('refunds').insert({
        user_id: dispute.created_by,
        ride_id: dispute.ride_id,
        amount: refundAmount,
        reason: 'Dispute resolution',
        dispute_id: disputeId,
        status: 'pending',
      });
    }
  }

  // ==================== QUERIES ====================

  async getDispute(disputeId: string): Promise<Dispute | null> {
    const { data, error } = await supabase
      .from('disputes')
      .select('*')
      .eq('id', disputeId)
      .single();

    if (error || !data) return null;

    const dispute = this.mapDispute(data);
    dispute.evidence = await this.getDisputeEvidence(disputeId);

    return dispute;
  }

  async getUserDisputes(userId: string): Promise<Dispute[]> {
    const { data, error } = await supabase
      .from('disputes')
      .select('*')
      .or(`created_by.eq.${userId},against_user_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data?.map(this.mapDispute) || [];
  }

  async getOpenDisputes(filters?: {
    priority?: Dispute['priority'];
    type?: DisputeType;
    assignedTo?: string;
  }): Promise<Dispute[]> {
    let query = supabase
      .from('disputes')
      .select('*')
      .in('status', ['open', 'under_review', 'awaiting_response', 'mediation'])
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true });

    if (filters?.priority) {
      query = query.eq('priority', filters.priority);
    }
    if (filters?.type) {
      query = query.eq('type', filters.type);
    }
    if (filters?.assignedTo) {
      query = query.eq('assigned_to', filters.assignedTo);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data?.map(this.mapDispute) || [];
  }

  async getDisputeStats(): Promise<{
    open: number;
    underReview: number;
    resolved: number;
    avgResolutionTime: number;
    byType: Record<DisputeType, number>;
  }> {
    const { data: disputes } = await supabase
      .from('disputes')
      .select('status, type, created_at, resolved_at');

    if (!disputes) {
      return {
        open: 0,
        underReview: 0,
        resolved: 0,
        avgResolutionTime: 0,
        byType: {} as Record<DisputeType, number>,
      };
    }

    const open = disputes.filter((d) => d.status === 'open').length;
    const underReview = disputes.filter((d) =>
      ['under_review', 'awaiting_response', 'mediation'].includes(d.status)
    ).length;
    const resolved = disputes.filter((d) =>
      ['resolved', 'closed'].includes(d.status)
    ).length;

    // Calculate average resolution time
    const resolvedDisputes = disputes.filter((d) => d.resolved_at);
    const totalTime = resolvedDisputes.reduce((sum, d) => {
      return sum + (new Date(d.resolved_at).getTime() - new Date(d.created_at).getTime());
    }, 0);
    const avgResolutionTime = resolvedDisputes.length > 0
      ? totalTime / resolvedDisputes.length / (1000 * 60 * 60) // hours
      : 0;

    // Count by type
    const byType = disputes.reduce((acc, d) => {
      acc[d.type as DisputeType] = (acc[d.type as DisputeType] || 0) + 1;
      return acc;
    }, {} as Record<DisputeType, number>);

    return { open, underReview, resolved, avgResolutionTime, byType };
  }

  // ==================== NOTIFICATIONS ====================

  private async notifyDisputeCreated(
    disputeId: string,
    againstUserId: string,
    type: DisputeType
  ): Promise<void> {
    await supabase.from('notifications').insert({
      user_id: againstUserId,
      type: 'dispute_created',
      title: '⚠️ Dispute Filed Against You',
      message: `A ${type.replace('_', ' ')} dispute has been filed. Please respond within 48 hours.`,
      data: { dispute_id: disputeId },
      priority: 'high',
    });
  }

  private async notifyModerators(disputeId: string, type: DisputeType): Promise<void> {
    const { data: moderators } = await supabase
      .from('profiles')
      .select('id')
      .in('role', ['admin', 'moderator']);

    for (const mod of moderators || []) {
      await supabase.from('notifications').insert({
        user_id: mod.id,
        type: 'new_dispute',
        title: '🚨 New High-Priority Dispute',
        message: `A ${type.replace('_', ' ')} dispute requires attention.`,
        data: { dispute_id: disputeId },
        priority: 'high',
      });
    }
  }

  private async notifyStatusChange(dispute: Dispute): Promise<void> {
    const notifications = [
      { userId: dispute.createdBy, role: 'creator' },
      { userId: dispute.againstUserId, role: 'respondent' },
    ];

    for (const notif of notifications) {
      await supabase.from('notifications').insert({
        user_id: notif.userId,
        type: 'dispute_status_change',
        title: 'Dispute Status Updated',
        message: `Your dispute status has been updated to: ${dispute.status.replace('_', ' ')}`,
        data: { dispute_id: dispute.id },
      });
    }
  }

  // ==================== MAPPERS ====================

  private mapDispute(data: Record<string, unknown>): Dispute {
    return {
      id: data.id as string,
      rideId: data.ride_id as string,
      createdBy: data.created_by as string,
      againstUserId: data.against_user_id as string,
      type: data.type as DisputeType,
      status: data.status as DisputeStatus,
      priority: data.priority as Dispute['priority'],
      description: data.description as string,
      evidence: [],
      assignedTo: data.assigned_to as string | undefined,
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string,
      resolvedAt: data.resolved_at as string | undefined,
    };
  }

  private mapEvidence(data: Record<string, unknown>): DisputeEvidence {
    return {
      id: data.id as string,
      disputeId: data.dispute_id as string,
      type: data.type as DisputeEvidence['type'],
      url: data.url as string | undefined,
      content: data.content as string | undefined,
      description: data.description as string,
      submittedBy: data.submitted_by as string,
      createdAt: data.created_at as string,
    };
  }

  private mapMessage(data: Record<string, unknown>): DisputeMessage {
    return {
      id: data.id as string,
      disputeId: data.dispute_id as string,
      senderId: data.sender_id as string,
      senderType: data.sender_type as DisputeMessage['senderType'],
      content: data.content as string,
      attachments: data.attachments as string[] | undefined,
      createdAt: data.created_at as string,
    };
  }

  private mapResolution(data: Record<string, unknown>): DisputeResolution {
    return {
      id: data.id as string,
      disputeId: data.dispute_id as string,
      outcome: data.outcome as DisputeResolution['outcome'],
      summary: data.summary as string,
      actions: data.actions as ResolutionAction[],
      creditAmount: data.credit_amount as number | undefined,
      refundAmount: data.refund_amount as number | undefined,
      resolvedBy: data.resolved_by as string,
      createdAt: data.created_at as string,
    };
  }
}

export const disputeService = new DisputeService();
