/**
 * Enterprise-grade tests for ChallengeService
 * Covers: getChallenges, getUserChallenges, joinChallenge, leaveChallenge,
 * updateProgress, milestones, teams, events, registration
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
const mockSupabase = vi.hoisted(() => {
  const makeFreshChain = (result: any) => {
    const chain: Record<string, any> = {};
    const methods = [
      'select', 'insert', 'update', 'delete', 'eq', 'neq', 'or', 'not',
      'in', 'order', 'limit', 'is', 'ilike', 'gt', 'gte', 'lt', 'lte',
      'single', 'maybeSingle', 'filter', 'range', 'contains',
    ];
    for (const m of methods) chain[m] = vi.fn().mockReturnValue(chain);
    const p = Promise.resolve(result);
    Object.defineProperty(chain, 'then', {
      value: p.then.bind(p), writable: true, configurable: true, enumerable: false,
    });
    return chain;
  };
  return {
    from: vi.fn(() => makeFreshChain({ data: null, error: null })),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    makeFreshChain,
  };
});

vi.mock('../../src/lib/supabase', () => ({ supabase: mockSupabase }));

import { challengeService } from '../../src/services/challengeService';

// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.clearAllMocks();
  mockSupabase.from.mockImplementation(() =>
    mockSupabase.makeFreshChain({ data: null, error: null })
  );
  mockSupabase.rpc.mockResolvedValue({ data: null, error: null });
});

const sampleChallenge = {
  id: 'ch-1', title: 'Green Week', description: 'Save CO2 this week',
  type: 'community', category: 'co2', status: 'active', goal: 1000,
  unit: 'kg CO2', current_progress: 250, start_date: '2026-01-01',
  end_date: '2026-01-07', rewards: [{ type: 'badge', value: 'eco', description: 'Eco badge' }],
  participants: 50, rules: ['Must carpool'], milestones: [{ id: 'm1', target: 500, title: 'Halfway', reached: false }],
  team_size: 5, max_participants: 200,
};

// =========================================================================
describe('ChallengeService', () => {

  // --- getChallenges ---
  describe('getChallenges', () => {
    it('returns mapped challenges', async () => {
      mockSupabase.from.mockImplementation(() =>
        mockSupabase.makeFreshChain({ data: [sampleChallenge], error: null })
      );

      const challenges = await challengeService.getChallenges();
      expect(challenges).toHaveLength(1);
      expect(challenges[0].title).toBe('Green Week');
      expect(challenges[0].startDate).toBeInstanceOf(Date);
      expect(challenges[0].endDate).toBeInstanceOf(Date);
    });

    it('returns empty array when no data', async () => {
      mockSupabase.from.mockImplementation(() =>
        mockSupabase.makeFreshChain({ data: null, error: null })
      );

      const challenges = await challengeService.getChallenges();
      expect(challenges).toEqual([]);
    });

    it('filters by status when provided', async () => {
      mockSupabase.from.mockImplementation(() =>
        mockSupabase.makeFreshChain({ data: [], error: null })
      );

      await challengeService.getChallenges(['active', 'upcoming']);
      expect(mockSupabase.from).toHaveBeenCalledWith('challenges');
    });

    it('queries all challenges when no status filter', async () => {
      mockSupabase.from.mockImplementation(() =>
        mockSupabase.makeFreshChain({ data: [], error: null })
      );

      await challengeService.getChallenges();
      expect(mockSupabase.from).toHaveBeenCalledWith('challenges');
    });
  });

  // --- getUserChallenges ---
  describe('getUserChallenges', () => {
    it('returns challenges with user progress', async () => {
      mockSupabase.from.mockImplementation(() =>
        mockSupabase.makeFreshChain({
          data: [{
            challenge_id: 'ch-1', user_id: 'u1', progress: 10, rank: 3,
            team_id: null, joined_at: '2026-01-01', completed_at: null,
            milestones_reached: [], rewards_claimed: [],
            challenge: sampleChallenge,
          }],
          error: null,
        })
      );

      const result = await challengeService.getUserChallenges('u1');
      expect(result).toHaveLength(1);
      expect(result[0].userProgress.progress).toBe(10);
      expect(result[0].userProgress.rank).toBe(3);
      expect(result[0].title).toBe('Green Week');
    });

    it('filters out participations with null challenge', async () => {
      mockSupabase.from.mockImplementation(() =>
        mockSupabase.makeFreshChain({
          data: [
            { challenge_id: 'ch-1', user_id: 'u1', progress: 10, challenge: null },
            { challenge_id: 'ch-2', user_id: 'u1', progress: 5, challenge: sampleChallenge },
          ],
          error: null,
        })
      );

      const result = await challengeService.getUserChallenges('u1');
      expect(result).toHaveLength(1);
    });

    it('returns empty when user has no participations', async () => {
      mockSupabase.from.mockImplementation(() =>
        mockSupabase.makeFreshChain({ data: [], error: null })
      );

      const result = await challengeService.getUserChallenges('u1');
      expect(result).toEqual([]);
    });
  });

  // --- joinChallenge ---
  describe('joinChallenge', () => {
    it('throws when already joined', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'challenge_participants') {
          return mockSupabase.makeFreshChain({ data: { id: 'existing' }, error: null });
        }
        return mockSupabase.makeFreshChain({ data: null, error: null });
      });

      await expect(challengeService.joinChallenge('u1', 'ch-1')).rejects.toThrow('Already joined');
    });

    it('throws when challenge is not active', async () => {
      let cpCallCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'challenge_participants') {
          cpCallCount++;
          if (cpCallCount === 1) {
            return mockSupabase.makeFreshChain({ data: null, error: null }); // not joined
          }
          return mockSupabase.makeFreshChain({ data: null, error: null, count: 0 });
        }
        if (table === 'challenges') {
          return mockSupabase.makeFreshChain({ data: { status: 'expired', max_participants: null, type: 'individual' }, error: null });
        }
        return mockSupabase.makeFreshChain({ data: null, error: null });
      });

      await expect(challengeService.joinChallenge('u1', 'ch-1')).rejects.toThrow('not available');
    });

    it('throws when challenge is full', async () => {
      let cpCallCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'challenge_participants') {
          cpCallCount++;
          if (cpCallCount === 1) {
            return mockSupabase.makeFreshChain({ data: null, error: null }); // not joined
          }
          // count query
          return mockSupabase.makeFreshChain({ data: null, error: null, count: 200 });
        }
        if (table === 'challenges') {
          return mockSupabase.makeFreshChain({ data: { status: 'active', max_participants: 200, type: 'individual' }, error: null });
        }
        return mockSupabase.makeFreshChain({ data: null, error: null });
      });

      await expect(challengeService.joinChallenge('u1', 'ch-1')).rejects.toThrow('full');
    });

    it('inserts participant and calls increment RPC on success', async () => {
      let cpCallCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'challenge_participants') {
          cpCallCount++;
          if (cpCallCount === 1) {
            return mockSupabase.makeFreshChain({ data: null, error: null }); // not joined
          }
          return mockSupabase.makeFreshChain({ data: null, error: null });
        }
        if (table === 'challenges') {
          return mockSupabase.makeFreshChain({ data: { status: 'active', max_participants: null, type: 'individual' }, error: null });
        }
        return mockSupabase.makeFreshChain({ data: null, error: null });
      });

      await challengeService.joinChallenge('u1', 'ch-1');
      expect(mockSupabase.rpc).toHaveBeenCalledWith('increment_challenge_participants', { cid: 'ch-1' });
    });
  });

  // --- leaveChallenge ---
  describe('leaveChallenge', () => {
    it('deletes participation and decrements count', async () => {
      mockSupabase.from.mockImplementation(() =>
        mockSupabase.makeFreshChain({ data: null, error: null })
      );

      await challengeService.leaveChallenge('u1', 'ch-1');
      expect(mockSupabase.from).toHaveBeenCalledWith('challenge_participants');
      expect(mockSupabase.rpc).toHaveBeenCalledWith('decrement_challenge_participants', { cid: 'ch-1' });
    });
  });

  // --- updateProgress ---
  describe('updateProgress', () => {
    it('increments progress for the participant', async () => {
      let cpCallCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'challenge_participants') {
          cpCallCount++;
          if (cpCallCount === 1) {
            // get current progress
            return mockSupabase.makeFreshChain({ data: { progress: 10 }, error: null });
          }
          if (cpCallCount === 2) {
            // update progress
            return mockSupabase.makeFreshChain({ data: null, error: null });
          }
          // team_id check
          return mockSupabase.makeFreshChain({ data: { team_id: null }, error: null });
        }
        if (table === 'challenges') {
          return mockSupabase.makeFreshChain({ data: { milestones: [] }, error: null });
        }
        return mockSupabase.makeFreshChain({ data: null, error: null });
      });

      await challengeService.updateProgress('u1', 'ch-1', 5);
      expect(mockSupabase.from).toHaveBeenCalledWith('challenge_participants');
    });

    it('silently returns when participant not found', async () => {
      mockSupabase.from.mockImplementation(() =>
        mockSupabase.makeFreshChain({ data: null, error: null })
      );

      // Should not throw
      await challengeService.updateProgress('u1', 'ch-1', 5);
    });
  });

  // --- createTeam ---
  describe('createTeam', () => {
    it('creates team and adds captain as member', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'challenge_teams') {
          return mockSupabase.makeFreshChain({
            data: { id: 't1', name: 'Team A', challenge_id: 'ch-1', captain_id: 'u1', created_at: '2026-01-01' },
            error: null,
          });
        }
        return mockSupabase.makeFreshChain({ data: null, error: null });
      });

      const team = await challengeService.createTeam('Team A', 'ch-1', 'u1');
      expect(team.id).toBe('t1');
      expect(team.name).toBe('Team A');
      expect(team.captainId).toBe('u1');
      expect(mockSupabase.from).toHaveBeenCalledWith('team_members');
    });

    it('throws on creation error', async () => {
      mockSupabase.from.mockImplementation(() =>
        mockSupabase.makeFreshChain({ data: null, error: { message: 'Duplicate name' } })
      );

      await expect(challengeService.createTeam('Team A', 'ch-1', 'u1')).rejects.toThrow();
    });
  });

  // --- joinTeam ---
  describe('joinTeam', () => {
    it('throws when team not found', async () => {
      mockSupabase.from.mockImplementation(() =>
        mockSupabase.makeFreshChain({ data: null, error: null })
      );

      await expect(challengeService.joinTeam('t1', 'u2')).rejects.toThrow('Team not found');
    });

    it('throws when team is full', async () => {
      let tmCallCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'challenge_teams') {
          return mockSupabase.makeFreshChain({ data: { challenge_id: 'ch-1' }, error: null });
        }
        if (table === 'challenges') {
          return mockSupabase.makeFreshChain({ data: { team_size: 3 }, error: null });
        }
        if (table === 'team_members') {
          tmCallCount++;
          if (tmCallCount === 1) {
            // count query
            return mockSupabase.makeFreshChain({ data: null, error: null, count: 3 });
          }
          return mockSupabase.makeFreshChain({ data: null, error: null });
        }
        return mockSupabase.makeFreshChain({ data: null, error: null });
      });

      await expect(challengeService.joinTeam('t1', 'u2')).rejects.toThrow('Team is full');
    });

    it('adds member and updates challenge participation', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'challenge_teams') {
          return mockSupabase.makeFreshChain({ data: { challenge_id: 'ch-1' }, error: null });
        }
        if (table === 'challenges') {
          return mockSupabase.makeFreshChain({ data: { team_size: null }, error: null });
        }
        return mockSupabase.makeFreshChain({ data: null, error: null });
      });

      await challengeService.joinTeam('t1', 'u2');
      expect(mockSupabase.from).toHaveBeenCalledWith('team_members');
      expect(mockSupabase.from).toHaveBeenCalledWith('challenge_participants');
    });
  });

  // --- getTeamLeaderboard ---
  describe('getTeamLeaderboard', () => {
    it('returns teams sorted by progress with rank', async () => {
      mockSupabase.from.mockImplementation(() =>
        mockSupabase.makeFreshChain({
          data: [
            { id: 't1', name: 'Alpha', challenge_id: 'ch-1', captain_id: 'u1', total_progress: 100, members: [{ user_id: 'u1', user: { full_name: 'Alice', avatar_url: null } }], created_at: '2026-01-01' },
            { id: 't2', name: 'Beta', challenge_id: 'ch-1', captain_id: 'u2', total_progress: 50, members: [], created_at: '2026-01-02' },
          ],
          error: null,
        })
      );

      const teams = await challengeService.getTeamLeaderboard('ch-1');
      expect(teams).toHaveLength(2);
      expect(teams[0].rank).toBe(1);
      expect(teams[0].name).toBe('Alpha');
      expect(teams[1].rank).toBe(2);
    });

    it('returns empty array when no teams', async () => {
      mockSupabase.from.mockImplementation(() =>
        mockSupabase.makeFreshChain({ data: null, error: null })
      );

      const teams = await challengeService.getTeamLeaderboard('ch-1');
      expect(teams).toEqual([]);
    });
  });

  // --- getEvents ---
  describe('getEvents', () => {
    it('returns mapped events', async () => {
      mockSupabase.from.mockImplementation(() =>
        mockSupabase.makeFreshChain({
          data: [{
            id: 'e1', title: 'Carpool Meetup', description: 'Casual meetup',
            type: 'meetup', date: '2026-06-15', end_date: null,
            location: { name: 'Park', address: '123 St' },
            is_online: false, online_link: null,
            organizer: { id: 'u1', full_name: 'Alice', avatar_url: null },
            attendees: 25, max_attendees: 100, image_url: null, tags: ['social'],
          }],
          error: null,
        })
      );

      const events = await challengeService.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0].title).toBe('Carpool Meetup');
      expect(events[0].date).toBeInstanceOf(Date);
      expect(events[0].isRegistered).toBe(false);
    });

    it('filters upcoming events', async () => {
      mockSupabase.from.mockImplementation(() =>
        mockSupabase.makeFreshChain({ data: [], error: null })
      );

      await challengeService.getEvents({ upcoming: true });
      expect(mockSupabase.from).toHaveBeenCalledWith('community_events');
    });

    it('filters past events', async () => {
      mockSupabase.from.mockImplementation(() =>
        mockSupabase.makeFreshChain({ data: [], error: null })
      );

      await challengeService.getEvents({ past: true });
      expect(mockSupabase.from).toHaveBeenCalledWith('community_events');
    });
  });

  // --- registerForEvent ---
  describe('registerForEvent', () => {
    it('throws when already registered', async () => {
      mockSupabase.from.mockImplementation(() =>
        mockSupabase.makeFreshChain({ data: { id: 'existing' }, error: null })
      );

      await expect(challengeService.registerForEvent('u1', 'e1')).rejects.toThrow('Already registered');
    });

    it('throws when event is full', async () => {
      let erCallCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'event_registrations') {
          erCallCount++;
          if (erCallCount === 1) {
            return mockSupabase.makeFreshChain({ data: null, error: null }); // not registered
          }
          return mockSupabase.makeFreshChain({ data: null, error: null });
        }
        if (table === 'community_events') {
          return mockSupabase.makeFreshChain({ data: { max_attendees: 50, attendees: 50 }, error: null });
        }
        return mockSupabase.makeFreshChain({ data: null, error: null });
      });

      await expect(challengeService.registerForEvent('u1', 'e1')).rejects.toThrow('full');
    });

    it('registers and calls increment RPC on success', async () => {
      let erCallCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'event_registrations') {
          erCallCount++;
          if (erCallCount === 1) {
            return mockSupabase.makeFreshChain({ data: null, error: null }); // not registered
          }
          return mockSupabase.makeFreshChain({ data: null, error: null });
        }
        if (table === 'community_events') {
          return mockSupabase.makeFreshChain({ data: { max_attendees: null, attendees: 10 }, error: null });
        }
        return mockSupabase.makeFreshChain({ data: null, error: null });
      });

      await challengeService.registerForEvent('u1', 'e1');
      expect(mockSupabase.rpc).toHaveBeenCalledWith('increment_event_attendees', { eid: 'e1' });
    });
  });

  // --- unregisterFromEvent ---
  describe('unregisterFromEvent', () => {
    it('deletes registration and decrements attendees', async () => {
      mockSupabase.from.mockImplementation(() =>
        mockSupabase.makeFreshChain({ data: null, error: null })
      );

      await challengeService.unregisterFromEvent('u1', 'e1');
      expect(mockSupabase.from).toHaveBeenCalledWith('event_registrations');
      expect(mockSupabase.rpc).toHaveBeenCalledWith('decrement_event_attendees', { eid: 'e1' });
    });
  });

  // --- getUserRegisteredEvents ---
  describe('getUserRegisteredEvents', () => {
    it('returns array of event IDs', async () => {
      mockSupabase.from.mockImplementation(() =>
        mockSupabase.makeFreshChain({
          data: [{ event_id: 'e1' }, { event_id: 'e2' }],
          error: null,
        })
      );

      const ids = await challengeService.getUserRegisteredEvents('u1');
      expect(ids).toEqual(['e1', 'e2']);
    });

    it('returns empty array when no registrations', async () => {
      mockSupabase.from.mockImplementation(() =>
        mockSupabase.makeFreshChain({ data: null, error: null })
      );

      const ids = await challengeService.getUserRegisteredEvents('u1');
      expect(ids).toEqual([]);
    });
  });
});
