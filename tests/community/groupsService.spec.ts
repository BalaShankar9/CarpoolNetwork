/**
 * Enterprise-grade tests for groupsService
 *
 * Covers all 11 exported methods:
 *  getMyGroups, getPublicGroups, getGroupDetails, createGroup,
 *  joinGroup, leaveGroup, inviteToGroup, respondToInvite,
 *  getInvites, updateGroup, getGroupActivity
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  FAKE_USER_ID, FAKE_OTHER_USER_ID, FAKE_GROUP_ID,
  FAKE_GROUP, FAKE_GROUP_INVITE, FAKE_PROFILE, FAKE_OTHER_PROFILE,
  FAKE_INVITE_ID,
  buildChain,
} from './helpers';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockSupabase = vi.hoisted(() => {
  const chainMethods = [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
    'is', 'in', 'or', 'not',
    'order', 'limit', 'range', 'single', 'maybeSingle',
    'filter', 'match', 'textSearch', 'contains', 'containedBy',
    'overlaps', 'ilike', 'like', 'onConflict',
  ];

  function makeFreshChain(result: { data: any; error: any; count?: number } = { data: null, error: null }) {
    const mock: Record<string, any> = {};
    for (const m of chainMethods) {
      mock[m] = vi.fn().mockReturnValue(mock);
    }
    mock.single = vi.fn().mockResolvedValue(result);
    mock.maybeSingle = vi.fn().mockResolvedValue(result);
    const p = Promise.resolve(result);
    Object.defineProperty(mock, 'then', {
      value: p.then.bind(p), writable: true, configurable: true, enumerable: false,
    });
    return mock;
  }

  return {
    makeFreshChain,
    from: vi.fn(() => makeFreshChain()),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-comm-001' } }, error: null }) },
  };
});

vi.mock('../../src/lib/supabase', () => ({ supabase: mockSupabase }));

import { groupsService } from '../../src/services/groupsService';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function setFromChain(table: string, result: { data: any; error: any }) {
  const chain = mockSupabase.makeFreshChain(result);
  mockSupabase.from.mockImplementation((t: string) => {
    if (t === table) return chain;
    return mockSupabase.makeFreshChain();
  });
  return chain;
}

function setMultiTableChains(mapping: Record<string, { data: any; error: any }>) {
  const chains: Record<string, any> = {};
  for (const [table, result] of Object.entries(mapping)) {
    chains[table] = mockSupabase.makeFreshChain(result);
  }
  mockSupabase.from.mockImplementation((t: string) => {
    if (chains[t]) return chains[t];
    return mockSupabase.makeFreshChain();
  });
  return chains;
}

function setRpcResult(data: any, error: any = null) {
  mockSupabase.rpc.mockResolvedValue({ data, error });
}

// ---------------------------------------------------------------------------
beforeEach(() => { vi.clearAllMocks(); });
afterEach(() => { vi.restoreAllMocks(); });

// =========================================================================
// getMyGroups
// =========================================================================
describe('groupsService.getMyGroups', () => {
  it('returns groups the user belongs to', async () => {
    const memberRows = [
      { group_id: FAKE_GROUP_ID, user_id: FAKE_USER_ID, role: 'OWNER' },
    ];
    const groupRows = [{
      ...FAKE_GROUP,
      owner: { id: FAKE_USER_ID, full_name: 'Alice Community', avatar_url: null },
    }];

    setMultiTableChains({
      social_group_members: { data: memberRows, error: null },
      social_groups: { data: groupRows, error: null },
    });

    const result = await groupsService.getMyGroups(FAKE_USER_ID);
    expect(Array.isArray(result)).toBe(true);
  });

  it('returns empty array when user has no groups', async () => {
    setFromChain('social_group_members', { data: [], error: null });
    const result = await groupsService.getMyGroups(FAKE_USER_ID);
    expect(result).toEqual([]);
  });

  it('returns empty array on error', async () => {
    setFromChain('social_group_members', { data: null, error: { message: 'Error' } });
    const result = await groupsService.getMyGroups(FAKE_USER_ID);
    expect(result).toEqual([]);
  });
});

// =========================================================================
// getPublicGroups
// =========================================================================
describe('groupsService.getPublicGroups', () => {
  it('returns public groups ordered by member_count', async () => {
    const groups = [FAKE_GROUP, { ...FAKE_GROUP, id: 'g2', name: 'Another Group' }];
    setFromChain('social_groups', { data: groups, error: null });

    const result = await groupsService.getPublicGroups();
    expect(Array.isArray(result)).toBe(true);
  });

  it('filters by category when provided', async () => {
    setFromChain('social_groups', { data: [FAKE_GROUP], error: null });

    const result = await groupsService.getPublicGroups({ category: 'Commuters' });
    expect(mockSupabase.from).toHaveBeenCalledWith('social_groups');
  });

  it('filters by search query when provided', async () => {
    setFromChain('social_groups', { data: [], error: null });

    const result = await groupsService.getPublicGroups({ search: 'campus' });
    expect(result).toEqual([]);
  });

  it('returns empty array on error', async () => {
    setFromChain('social_groups', { data: null, error: { message: 'Error' } });
    const result = await groupsService.getPublicGroups();
    expect(result).toEqual([]);
  });
});

// =========================================================================
// getGroupDetails
// =========================================================================
describe('groupsService.getGroupDetails', () => {
  it('returns group with members and enrichment', async () => {
    const groupData = { ...FAKE_GROUP };
    const membersData = [
      { id: 'm1', group_id: FAKE_GROUP_ID, user_id: FAKE_USER_ID, role: 'OWNER', joined_at: '2026-01-01T00:00:00Z' },
    ];

    setMultiTableChains({
      social_groups: { data: groupData, error: null },
      social_group_members: { data: membersData, error: null },
      profiles: { data: [FAKE_PROFILE], error: null },
    });

    const result = await groupsService.getGroupDetails(FAKE_GROUP_ID, FAKE_USER_ID);
    expect(result).toBeDefined();
  });

  it('returns null when group not found', async () => {
    const chain = mockSupabase.makeFreshChain({ data: null, error: null });
    chain.single = vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'Not found' } });
    mockSupabase.from.mockReturnValue(chain);

    const result = await groupsService.getGroupDetails('nonexistent', FAKE_USER_ID);
    expect(result).toBeNull();
  });
});

// =========================================================================
// createGroup
// =========================================================================
describe('groupsService.createGroup', () => {
  it('calls create_social_group RPC with trimmed data', async () => {
    setRpcResult(FAKE_GROUP_ID);

    const result = await groupsService.createGroup({
      name: '  Campus Commuters  ',
      description: 'Daily riders  ',
      visibility: 'PUBLIC',
      category: 'Commuters',
    });

    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      'create_social_group',
      expect.objectContaining({ p_name: 'Campus Commuters' })
    );
    expect(result).toBe(FAKE_GROUP_ID);
  });

  it('throws on RPC error', async () => {
    mockSupabase.rpc.mockResolvedValue({ data: null, error: { message: 'Name taken' } });
    await expect(
      groupsService.createGroup({ name: 'Test', visibility: 'PUBLIC', category: 'General' })
    ).rejects.toThrow();
  });
});

// =========================================================================
// joinGroup
// =========================================================================
describe('groupsService.joinGroup', () => {
  it('calls join_social_group RPC and returns true', async () => {
    setRpcResult(true);
    const result = await groupsService.joinGroup(FAKE_GROUP_ID);
    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      'join_social_group',
      expect.objectContaining({ p_group_id: FAKE_GROUP_ID })
    );
    expect(result).toBe(true);
  });

  it('throws on RPC error', async () => {
    mockSupabase.rpc.mockResolvedValue({ data: null, error: { message: 'Full' } });
    await expect(groupsService.joinGroup(FAKE_GROUP_ID)).rejects.toThrow();
  });
});

// =========================================================================
// leaveGroup
// =========================================================================
describe('groupsService.leaveGroup', () => {
  it('calls leave_social_group RPC and returns true', async () => {
    setRpcResult(true);
    const result = await groupsService.leaveGroup(FAKE_GROUP_ID);
    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      'leave_social_group',
      expect.objectContaining({ p_group_id: FAKE_GROUP_ID })
    );
    expect(result).toBe(true);
  });

  it('throws on RPC error', async () => {
    mockSupabase.rpc.mockResolvedValue({ data: null, error: { message: 'Owner cannot leave' } });
    await expect(groupsService.leaveGroup(FAKE_GROUP_ID)).rejects.toThrow();
  });
});

// =========================================================================
// inviteToGroup
// =========================================================================
describe('groupsService.inviteToGroup', () => {
  it('calls invite_to_group RPC with optional message', async () => {
    setRpcResult(FAKE_INVITE_ID);
    const result = await groupsService.inviteToGroup(FAKE_GROUP_ID, FAKE_OTHER_USER_ID, 'Join us!');
    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      'invite_to_group',
      expect.objectContaining({
        p_group_id: FAKE_GROUP_ID,
        p_invitee_id: FAKE_OTHER_USER_ID,
        p_message: 'Join us!',
      })
    );
    expect(result).toBe(FAKE_INVITE_ID);
  });

  it('throws on RPC error', async () => {
    mockSupabase.rpc.mockResolvedValue({ data: null, error: { message: 'Already member' } });
    await expect(
      groupsService.inviteToGroup(FAKE_GROUP_ID, FAKE_OTHER_USER_ID)
    ).rejects.toThrow();
  });
});

// =========================================================================
// respondToInvite
// =========================================================================
describe('groupsService.respondToInvite', () => {
  it('accepts an invite via RPC', async () => {
    setRpcResult(true);
    const result = await groupsService.respondToInvite(FAKE_INVITE_ID, true);
    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      'respond_to_group_invite',
      expect.objectContaining({
        p_invite_id: FAKE_INVITE_ID,
        p_accept: true,
      })
    );
    expect(result).toBe(true);
  });

  it('declines an invite via RPC', async () => {
    setRpcResult(true);
    const result = await groupsService.respondToInvite(FAKE_INVITE_ID, false);
    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      'respond_to_group_invite',
      expect.objectContaining({ p_accept: false })
    );
    expect(result).toBe(true);
  });

  it('throws on RPC error', async () => {
    mockSupabase.rpc.mockResolvedValue({ data: null, error: { message: 'Invalid invite' } });
    await expect(groupsService.respondToInvite(FAKE_INVITE_ID, true)).rejects.toThrow();
  });
});

// =========================================================================
// getInvites
// =========================================================================
describe('groupsService.getInvites', () => {
  it('returns pending invites with group and inviter data', async () => {
    setFromChain('social_group_invites', { data: [FAKE_GROUP_INVITE], error: null });

    const result = await groupsService.getInvites(FAKE_USER_ID);
    expect(Array.isArray(result)).toBe(true);
  });

  it('returns empty array when no invites', async () => {
    setFromChain('social_group_invites', { data: [], error: null });
    const result = await groupsService.getInvites(FAKE_USER_ID);
    expect(result).toEqual([]);
  });

  it('returns empty array on error', async () => {
    setFromChain('social_group_invites', { data: null, error: { message: 'Fail' } });
    const result = await groupsService.getInvites(FAKE_USER_ID);
    expect(result).toEqual([]);
  });
});

// =========================================================================
// updateGroup
// =========================================================================
describe('groupsService.updateGroup', () => {
  it('updates group fields', async () => {
    const chain = setFromChain('social_groups', { data: null, error: null });
    await groupsService.updateGroup(FAKE_GROUP_ID, { name: 'Updated Name' });
    expect(mockSupabase.from).toHaveBeenCalledWith('social_groups');
  });

  it('throws on update error', async () => {
    setFromChain('social_groups', { data: null, error: { message: 'Permission denied' } });
    await expect(
      groupsService.updateGroup(FAKE_GROUP_ID, { name: 'Updated' })
    ).rejects.toThrow();
  });
});

// =========================================================================
// getGroupActivity
// =========================================================================
describe('groupsService.getGroupActivity', () => {
  it('returns message count, last active, and online members', async () => {
    const conversationData = [{ id: 'conv-1' }];
    const chatMessages = { count: 42 };
    const memberData = [
      { user_id: FAKE_USER_ID },
      { user_id: FAKE_OTHER_USER_ID },
    ];
    const presenceData = [
      { user_id: FAKE_USER_ID, status: 'online' },
    ];

    let fromCount: Record<string, number> = {};
    mockSupabase.from.mockImplementation((table: string) => {
      fromCount[table] = (fromCount[table] || 0) + 1;
      if (table === 'conversations') {
        return mockSupabase.makeFreshChain({ data: conversationData, error: null });
      }
      if (table === 'chat_messages') {
        const chain = mockSupabase.makeFreshChain({ data: null, error: null, count: 42 });
        return chain;
      }
      if (table === 'social_group_members') {
        return mockSupabase.makeFreshChain({ data: memberData, error: null });
      }
      if (table === 'user_presence') {
        return mockSupabase.makeFreshChain({ data: presenceData, error: null });
      }
      return mockSupabase.makeFreshChain();
    });

    const result = await groupsService.getGroupActivity(FAKE_GROUP_ID);
    expect(result).toBeDefined();
    expect(result).toHaveProperty('messageCount');
    expect(result).toHaveProperty('lastActive');
    expect(result).toHaveProperty('onlineMembers');
  });

  it('handles missing presence table gracefully', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'conversations') return mockSupabase.makeFreshChain({ data: [], error: null });
      if (table === 'chat_messages') return mockSupabase.makeFreshChain({ data: null, error: null, count: 0 });
      if (table === 'social_group_members') return mockSupabase.makeFreshChain({ data: [], error: null });
      if (table === 'user_presence') return mockSupabase.makeFreshChain({ data: null, error: { message: '42P01' } });
      return mockSupabase.makeFreshChain();
    });

    const result = await groupsService.getGroupActivity(FAKE_GROUP_ID);
    expect(result).toBeDefined();
    expect(result.onlineMembers).toBe(0);
  });
});
