// Community Challenges Service
// Time-limited challenges, team events, and community goals

import { supabase } from '@/lib/supabase';

export type ChallengeType = 'individual' | 'team' | 'community';
export type ChallengeCategory = 'rides' | 'co2' | 'social' | 'streak' | 'distance' | 'special';
export type ChallengeStatus = 'upcoming' | 'active' | 'completed' | 'expired';

export interface Challenge {
    id: string;
    title: string;
    description: string;
    type: ChallengeType;
    category: ChallengeCategory;
    status: ChallengeStatus;
    goal: number;
    unit: string;
    currentProgress: number;
    startDate: Date;
    endDate: Date;
    rewards: ChallengeReward[];
    participants: number;
    rules: string[];
    imageUrl?: string;
    sponsorName?: string;
    sponsorLogo?: string;
    milestones: ChallengeMilestone[];
    teamSize?: number;
    maxParticipants?: number;
}

export interface ChallengeReward {
    type: 'badge' | 'points' | 'discount' | 'feature' | 'prize';
    value: string | number;
    description: string;
    tier?: 'participation' | 'bronze' | 'silver' | 'gold' | 'winner';
}

export interface ChallengeMilestone {
    id: string;
    target: number;
    title: string;
    reward?: ChallengeReward;
    reached: boolean;
    reachedAt?: Date;
}

export interface UserChallengeProgress {
    challengeId: string;
    userId: string;
    progress: number;
    rank?: number;
    teamId?: string;
    joinedAt: Date;
    completedAt?: Date;
    milestonesReached: string[];
    rewardsClaimed: string[];
}

export interface Team {
    id: string;
    name: string;
    challengeId: string;
    captainId: string;
    members: TeamMember[];
    totalProgress: number;
    rank?: number;
    createdAt: Date;
}

export interface TeamMember {
    userId: string;
    name: string;
    avatar?: string;
    contribution: number;
    joinedAt: Date;
}

export interface CommunityEvent {
    id: string;
    title: string;
    description: string;
    type: 'meetup' | 'webinar' | 'workshop' | 'charity' | 'competition' | 'celebration';
    date: Date;
    endDate?: Date;
    location?: {
        name: string;
        address: string;
        lat?: number;
        lng?: number;
    };
    isOnline: boolean;
    onlineLink?: string;
    organizer: {
        id: string;
        name: string;
        avatar?: string;
    };
    attendees: number;
    maxAttendees?: number;
    isRegistered: boolean;
    imageUrl?: string;
    tags: string[];
}

class ChallengeService {
    // Get active and upcoming challenges
    async getChallenges(status?: ChallengeStatus[]): Promise<Challenge[]> {
        let query = supabase
            .from('challenges')
            .select('*')
            .order('start_date', { ascending: true });

        if (status && status.length > 0) {
            query = query.in('status', status);
        }

        const { data } = await query;

        return (data || []).map(this.mapChallenge);
    }

    // Get user's active challenges
    async getUserChallenges(userId: string): Promise<(Challenge & { userProgress: UserChallengeProgress })[]> {
        const { data: participations } = await supabase
            .from('challenge_participants')
            .select(`
        *,
        challenge:challenges(*)
      `)
            .eq('user_id', userId);

        return (participations || [])
            .filter((p: any) => p.challenge)
            .map((p: any) => ({
                ...this.mapChallenge(p.challenge),
                userProgress: {
                    challengeId: p.challenge_id,
                    userId: p.user_id,
                    progress: p.progress,
                    rank: p.rank,
                    teamId: p.team_id,
                    joinedAt: new Date(p.joined_at),
                    completedAt: p.completed_at ? new Date(p.completed_at) : undefined,
                    milestonesReached: p.milestones_reached || [],
                    rewardsClaimed: p.rewards_claimed || [],
                },
            }));
    }

    // Join a challenge
    async joinChallenge(userId: string, challengeId: string, teamId?: string): Promise<void> {
        // Check if already joined
        const { data: existing } = await supabase
            .from('challenge_participants')
            .select('id')
            .eq('user_id', userId)
            .eq('challenge_id', challengeId)
            .single();

        if (existing) {
            throw new Error('Already joined this challenge');
        }

        // Check if challenge is joinable
        const { data: challenge } = await supabase
            .from('challenges')
            .select('status, max_participants, type')
            .eq('id', challengeId)
            .single();

        if (!challenge || challenge.status !== 'active') {
            throw new Error('Challenge is not available for joining');
        }

        // Check participant limit
        if (challenge.max_participants) {
            const { count } = await supabase
                .from('challenge_participants')
                .select('*', { count: 'exact', head: true })
                .eq('challenge_id', challengeId);

            if (count && count >= challenge.max_participants) {
                throw new Error('Challenge is full');
            }
        }

        // Join challenge
        await supabase.from('challenge_participants').insert({
            user_id: userId,
            challenge_id: challengeId,
            team_id: teamId,
            progress: 0,
            joined_at: new Date().toISOString(),
        });

        // Update participant count
        await supabase.rpc('increment_challenge_participants', { cid: challengeId });
    }

    // Leave a challenge
    async leaveChallenge(userId: string, challengeId: string): Promise<void> {
        await supabase
            .from('challenge_participants')
            .delete()
            .eq('user_id', userId)
            .eq('challenge_id', challengeId);

        await supabase.rpc('decrement_challenge_participants', { cid: challengeId });
    }

    // Update progress (called by triggers or background jobs)
    async updateProgress(userId: string, challengeId: string, increment: number): Promise<void> {
        const { data: participant } = await supabase
            .from('challenge_participants')
            .select('progress')
            .eq('user_id', userId)
            .eq('challenge_id', challengeId)
            .single();

        if (!participant) return;

        const newProgress = participant.progress + increment;

        await supabase
            .from('challenge_participants')
            .update({ progress: newProgress })
            .eq('user_id', userId)
            .eq('challenge_id', challengeId);

        // Check milestones
        await this.checkMilestones(userId, challengeId, newProgress);

        // Update team progress if applicable
        const { data: team } = await supabase
            .from('challenge_participants')
            .select('team_id')
            .eq('user_id', userId)
            .eq('challenge_id', challengeId)
            .single();

        if (team?.team_id) {
            await this.updateTeamProgress(team.team_id);
        }
    }

    private async checkMilestones(userId: string, challengeId: string, progress: number): Promise<void> {
        const { data: challenge } = await supabase
            .from('challenges')
            .select('milestones')
            .eq('id', challengeId)
            .single();

        if (!challenge?.milestones) return;

        const { data: participant } = await supabase
            .from('challenge_participants')
            .select('milestones_reached')
            .eq('user_id', userId)
            .eq('challenge_id', challengeId)
            .single();

        const reached = participant?.milestones_reached || [];
        const newReached = [...reached];

        for (const milestone of challenge.milestones) {
            if (progress >= milestone.target && !reached.includes(milestone.id)) {
                newReached.push(milestone.id);

                // Send notification
                await supabase.from('notifications').insert({
                    user_id: userId,
                    type: 'milestone_reached',
                    title: 'Milestone Reached! 🎯',
                    message: `You've reached "${milestone.title}" in the challenge!`,
                    data: { challenge_id: challengeId, milestone_id: milestone.id },
                });
            }
        }

        if (newReached.length > reached.length) {
            await supabase
                .from('challenge_participants')
                .update({ milestones_reached: newReached })
                .eq('user_id', userId)
                .eq('challenge_id', challengeId);
        }
    }

    // Team management
    async createTeam(name: string, challengeId: string, captainId: string): Promise<Team> {
        const { data, error } = await supabase
            .from('challenge_teams')
            .insert({
                name,
                challenge_id: challengeId,
                captain_id: captainId,
                created_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (error) throw error;

        // Add captain as member
        await supabase.from('team_members').insert({
            team_id: data.id,
            user_id: captainId,
            joined_at: new Date().toISOString(),
        });

        return {
            id: data.id,
            name: data.name,
            challengeId: data.challenge_id,
            captainId: data.captain_id,
            members: [],
            totalProgress: 0,
            createdAt: new Date(data.created_at),
        };
    }

    async joinTeam(teamId: string, userId: string): Promise<void> {
        const { data: team } = await supabase
            .from('challenge_teams')
            .select('challenge_id')
            .eq('id', teamId)
            .single();

        if (!team) throw new Error('Team not found');

        // Check team size limit
        const { data: challenge } = await supabase
            .from('challenges')
            .select('team_size')
            .eq('id', team.challenge_id)
            .single();

        if (challenge?.team_size) {
            const { count } = await supabase
                .from('team_members')
                .select('*', { count: 'exact', head: true })
                .eq('team_id', teamId);

            if (count && count >= challenge.team_size) {
                throw new Error('Team is full');
            }
        }

        await supabase.from('team_members').insert({
            team_id: teamId,
            user_id: userId,
            joined_at: new Date().toISOString(),
        });

        // Update user's team in challenge participation
        await supabase
            .from('challenge_participants')
            .update({ team_id: teamId })
            .eq('user_id', userId)
            .eq('challenge_id', team.challenge_id);
    }

    async getTeamLeaderboard(challengeId: string): Promise<Team[]> {
        const { data: teams } = await supabase
            .from('challenge_teams')
            .select(`
        *,
        members:team_members(
          user_id,
          user:profiles(full_name, avatar_url)
        )
      `)
            .eq('challenge_id', challengeId)
            .order('total_progress', { ascending: false });

        return (teams || []).map((t: any, index: number) => ({
            id: t.id,
            name: t.name,
            challengeId: t.challenge_id,
            captainId: t.captain_id,
            members: (t.members || []).map((m: any) => ({
                userId: m.user_id,
                name: m.user?.full_name || 'Unknown',
                avatar: m.user?.avatar_url,
                contribution: m.contribution || 0,
                joinedAt: new Date(m.joined_at),
            })),
            totalProgress: t.total_progress || 0,
            rank: index + 1,
            createdAt: new Date(t.created_at),
        }));
    }

    private async updateTeamProgress(teamId: string): Promise<void> {
        const { data: members } = await supabase
            .from('team_members')
            .select('user_id')
            .eq('team_id', teamId);

        if (!members) return;

        const { data: team } = await supabase
            .from('challenge_teams')
            .select('challenge_id')
            .eq('id', teamId)
            .single();

        if (!team) return;

        // Sum all member progress
        let total = 0;
        for (const member of members) {
            const { data: progress } = await supabase
                .from('challenge_participants')
                .select('progress')
                .eq('user_id', member.user_id)
                .eq('challenge_id', team.challenge_id)
                .single();

            total += progress?.progress || 0;
        }

        await supabase
            .from('challenge_teams')
            .update({ total_progress: total })
            .eq('id', teamId);
    }

    // Community Events
    async getEvents(options?: { upcoming?: boolean; past?: boolean }): Promise<CommunityEvent[]> {
        let query = supabase
            .from('community_events')
            .select(`
        *,
        organizer:profiles!organizer_id(id, full_name, avatar_url)
      `)
            .order('date', { ascending: true });

        const now = new Date().toISOString();

        if (options?.upcoming) {
            query = query.gte('date', now);
        } else if (options?.past) {
            query = query.lt('date', now);
        }

        const { data } = await query;

        return (data || []).map((e: any) => ({
            id: e.id,
            title: e.title,
            description: e.description,
            type: e.type,
            date: new Date(e.date),
            endDate: e.end_date ? new Date(e.end_date) : undefined,
            location: e.location
                ? {
                    name: e.location.name,
                    address: e.location.address,
                    lat: e.location.lat,
                    lng: e.location.lng,
                }
                : undefined,
            isOnline: e.is_online,
            onlineLink: e.online_link,
            organizer: {
                id: e.organizer?.id,
                name: e.organizer?.full_name || 'Unknown',
                avatar: e.organizer?.avatar_url,
            },
            attendees: e.attendees || 0,
            maxAttendees: e.max_attendees,
            isRegistered: false, // Will be set client-side
            imageUrl: e.image_url,
            tags: e.tags || [],
        }));
    }

    async registerForEvent(userId: string, eventId: string): Promise<void> {
        const { data: existing } = await supabase
            .from('event_registrations')
            .select('id')
            .eq('user_id', userId)
            .eq('event_id', eventId)
            .single();

        if (existing) {
            throw new Error('Already registered');
        }

        // Check capacity
        const { data: event } = await supabase
            .from('community_events')
            .select('max_attendees, attendees')
            .eq('id', eventId)
            .single();

        if (event?.max_attendees && event.attendees >= event.max_attendees) {
            throw new Error('Event is full');
        }

        await supabase.from('event_registrations').insert({
            user_id: userId,
            event_id: eventId,
            registered_at: new Date().toISOString(),
        });

        await supabase.rpc('increment_event_attendees', { eid: eventId });
    }

    async unregisterFromEvent(userId: string, eventId: string): Promise<void> {
        await supabase
            .from('event_registrations')
            .delete()
            .eq('user_id', userId)
            .eq('event_id', eventId);

        await supabase.rpc('decrement_event_attendees', { eid: eventId });
    }

    async getUserRegisteredEvents(userId: string): Promise<string[]> {
        const { data } = await supabase
            .from('event_registrations')
            .select('event_id')
            .eq('user_id', userId);

        return data?.map((r) => r.event_id) || [];
    }

    // Helper
    private mapChallenge(c: any): Challenge {
        return {
            id: c.id,
            title: c.title,
            description: c.description,
            type: c.type,
            category: c.category,
            status: c.status,
            goal: c.goal,
            unit: c.unit,
            currentProgress: c.current_progress || 0,
            startDate: new Date(c.start_date),
            endDate: new Date(c.end_date),
            rewards: c.rewards || [],
            participants: c.participants || 0,
            rules: c.rules || [],
            imageUrl: c.image_url,
            sponsorName: c.sponsor_name,
            sponsorLogo: c.sponsor_logo,
            milestones: c.milestones || [],
            teamSize: c.team_size,
            maxParticipants: c.max_participants,
        };
    }
}

export const challengeService = new ChallengeService();
export default challengeService;
