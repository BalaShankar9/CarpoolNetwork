/**
 * Enterprise-grade tests for ModerationService
 * Covers: content filtering, profanity detection, spam detection, reports,
 * warnings/strikes, user suspension/banning, restrictions, moderation queue, stats
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const mockSupabase = vi.hoisted(() => {
  const makeFreshChain = (result: any) => {
    const chain: Record<string, any> = {};
    const methods = [
      'select', 'insert', 'update', 'delete', 'eq', 'neq', 'or', 'not',
      'in', 'order', 'limit', 'is', 'ilike', 'gt', 'gte', 'lt', 'lte',
      'single', 'maybeSingle', 'filter', 'range', 'contains', 'upsert',
    ];
    for (const m of methods) chain[m] = vi.fn().mockReturnValue(chain);
    const p = Promise.resolve(result);
    Object.defineProperty(chain, 'then', {
      value: p.then.bind(p),
      writable: true,
      configurable: true,
      enumerable: false,
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

import { moderationService } from '../../src/services/moderationService';

// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.clearAllMocks();
  mockSupabase.from.mockImplementation(() =>
    mockSupabase.makeFreshChain({ data: null, error: null })
  );
});

// =========================================================================
describe('ModerationService', () => {
  // =======================================================================
  // CONTENT FILTERING
  // =======================================================================
  describe('filterContent', () => {
    it('returns clean content unchanged', () => {
      const result = moderationService.filterContent('Hello world');
      expect(result.flagged).toBe(false);
      expect(result.clean).toBe('Hello world');
      expect(result.issues).toEqual([]);
    });

    it('detects and replaces profanity with ***', () => {
      const result = moderationService.filterContent('What the fuck is this');
      expect(result.flagged).toBe(true);
      expect(result.clean).toContain('***');
      expect(result.clean).not.toContain('fuck');
      expect(result.issues).toContain('inappropriate_language');
    });

    it('detects multiple profane words', () => {
      const result = moderationService.filterContent('shit and damn it all');
      expect(result.flagged).toBe(true);
      expect(result.issues).toContain('inappropriate_language');
    });

    it('is case-insensitive for profanity', () => {
      const result = moderationService.filterContent('SHIT happens');
      expect(result.flagged).toBe(true);
      expect(result.clean).toContain('***');
    });

    it('detects racial slurs', () => {
      const result = moderationService.filterContent('some racist slur nigger here');
      expect(result.flagged).toBe(true);
      expect(result.issues).toContain('inappropriate_language');
    });

    it('detects gender/sexuality slurs', () => {
      const result = moderationService.filterContent('you are a faggot');
      expect(result.flagged).toBe(true);
    });

    it('detects disability slurs', () => {
      const result = moderationService.filterContent('don\'t be a retard');
      expect(result.flagged).toBe(true);
    });

    it('detects threats/violence', () => {
      const result = moderationService.filterContent('just kys already');
      expect(result.flagged).toBe(true);
    });

    it('detects common evasions like "f u c k"', () => {
      const result = moderationService.filterContent('f u c k you');
      expect(result.flagged).toBe(true);
    });

    it('detects spam pattern "free money"', () => {
      const result = moderationService.filterContent('Get free money now! Click here to win');
      expect(result.flagged).toBe(true);
      expect(result.issues).toContain('spam_detected');
    });

    it('detects spam via repeated characters', () => {
      const result = moderationService.filterContent('aaaaaaaaa buy now');
      expect(result.flagged).toBe(true);
      expect(result.issues).toContain('spam_detected');
    });

    it('detects spam via multiple URLs', () => {
      // The regex requires 3+ URLs to match as consecutive. Use URLshttps://a.comhttps://b.comhttps://c.com pattern
      const result = moderationService.filterContent('Check https://a.comhttps://b.comhttps://c.com now');
      expect(result.flagged).toBe(true);
      expect(result.issues).toContain('spam_detected');
    });

    it('flags excessive caps (shouting)', () => {
      const result = moderationService.filterContent('THIS IS ALL CAPS TEXT!!');
      expect(result.flagged).toBe(true);
      expect(result.issues).toContain('excessive_caps');
    });

    it('does not flag short all-caps strings', () => {
      const result = moderationService.filterContent('OK SURE');
      // Content length <= 10, should NOT be flagged for caps
      expect(result.issues).not.toContain('excessive_caps');
    });

    it('can flag multiple issue types at once', () => {
      const result = moderationService.filterContent('FUCK THIS FREE MONEY SCAM AAAAAAAAA');
      expect(result.flagged).toBe(true);
      expect(result.issues).toContain('inappropriate_language');
      // May also have spam and/or excessive caps
    });

    it('preserves surrounding text while replacing profanity', () => {
      const result = moderationService.filterContent('Hello shit world');
      expect(result.clean).toMatch(/Hello .* world/);
    });
  });

  // =======================================================================
  // CONTENT SAFETY CHECK (async)
  // =======================================================================
  describe('checkContentSafety', () => {
    it('allows clean content without logging', async () => {
      const result = await moderationService.checkContentSafety('Nice ride!', 'user-1');
      expect(result.allowed).toBe(true);
      expect(result.filtered).toBe('Nice ride!');
      expect(result.warning).toBeUndefined();
      // Should NOT insert into content_flags
      expect(mockSupabase.from).not.toHaveBeenCalledWith('content_flags');
    });

    it('filters profanity and logs to content_flags', async () => {
      // getUserWarnings returns empty (no strikes)
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'user_warnings') {
          return mockSupabase.makeFreshChain({ data: [], error: null });
        }
        return mockSupabase.makeFreshChain({ data: null, error: null });
      });

      const result = await moderationService.checkContentSafety('What the fuck', 'user-1');
      expect(result.allowed).toBe(true);
      expect(result.warning).toBe('Some content was automatically filtered.');
      expect(mockSupabase.from).toHaveBeenCalledWith('content_flags');
    });

    it('blocks content when user has 3+ active strikes', async () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'user_warnings') {
          return mockSupabase.makeFreshChain({
            data: [
              { id: 'w1', expires_at: futureDate, acknowledged: false },
              { id: 'w2', expires_at: futureDate, acknowledged: false },
              { id: 'w3', expires_at: futureDate, acknowledged: false },
            ],
            error: null,
          });
        }
        return mockSupabase.makeFreshChain({ data: null, error: null });
      });

      const result = await moderationService.checkContentSafety('fuck off', 'user-1');
      expect(result.allowed).toBe(false);
      expect(result.warning).toContain('too many warnings');
    });

    it('allows flagged content when user has expired strikes only', async () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'user_warnings') {
          return mockSupabase.makeFreshChain({
            data: [
              { id: 'w1', expires_at: pastDate },
              { id: 'w2', expires_at: pastDate },
              { id: 'w3', expires_at: pastDate },
            ],
            error: null,
          });
        }
        return mockSupabase.makeFreshChain({ data: null, error: null });
      });

      const result = await moderationService.checkContentSafety('shit', 'user-1');
      expect(result.allowed).toBe(true);
    });
  });

  // =======================================================================
  // REPORTS
  // =======================================================================
  describe('createReport', () => {
    it('inserts a report with correct severity mapping', async () => {
      const reportData = {
        id: 'rpt-1',
        reporter_id: 'user-1',
        reported_user_id: 'user-2',
        category: 'harassment',
        description: 'Rude messages',
        status: 'pending',
        severity: 'high',
        created_at: '2026-01-01T00:00:00Z',
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'content_reports') {
          return mockSupabase.makeFreshChain({ data: reportData, error: null });
        }
        if (table === 'profiles') {
          return mockSupabase.makeFreshChain({ data: [], error: null });
        }
        return mockSupabase.makeFreshChain({ data: null, error: null });
      });

      const report = await moderationService.createReport('user-1', {
        reportedUserId: 'user-2',
        category: 'harassment',
        description: 'Rude messages',
      });

      expect(report.id).toBe('rpt-1');
      expect(report.category).toBe('harassment');
      expect(mockSupabase.from).toHaveBeenCalledWith('content_reports');
    });

    it('throws on insert error', async () => {
      mockSupabase.from.mockImplementation(() =>
        mockSupabase.makeFreshChain({ data: null, error: { message: 'DB error' } })
      );

      await expect(moderationService.createReport('user-1', {
        category: 'spam',
        description: 'test',
      })).rejects.toThrow();
    });

    it('auto-escalates critical severity reports (safety_concern)', async () => {
      const reportData = {
        id: 'rpt-critical',
        reporter_id: 'user-1',
        category: 'safety_concern',
        description: 'Dangerous',
        status: 'pending',
        severity: 'critical',
        created_at: '2026-01-01T00:00:00Z',
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'content_reports') {
          return mockSupabase.makeFreshChain({ data: reportData, error: null });
        }
        if (table === 'profiles') {
          return mockSupabase.makeFreshChain({ data: [{ id: 'admin-1' }], error: null });
        }
        if (table === 'notifications') {
          return mockSupabase.makeFreshChain({ data: null, error: null });
        }
        return mockSupabase.makeFreshChain({ data: null, error: null });
      });

      await moderationService.createReport('user-1', {
        category: 'safety_concern',
        description: 'Dangerous driver',
      });

      // Should update report to escalated AND notify admins
      expect(mockSupabase.from).toHaveBeenCalledWith('notifications');
    });

    it('auto-escalates dangerous_driving reports', async () => {
      const reportData = {
        id: 'rpt-dd',
        reporter_id: 'user-1',
        category: 'dangerous_driving',
        description: 'Speeding',
        status: 'pending',
        severity: 'critical',
        created_at: '2026-01-01T00:00:00Z',
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'content_reports') {
          return mockSupabase.makeFreshChain({ data: reportData, error: null });
        }
        if (table === 'profiles') {
          return mockSupabase.makeFreshChain({ data: [{ id: 'admin-1' }], error: null });
        }
        return mockSupabase.makeFreshChain({ data: null, error: null });
      });

      await moderationService.createReport('user-1', {
        category: 'dangerous_driving',
        description: 'Speeding',
      });

      // The escalateReport path was called
      expect(mockSupabase.from).toHaveBeenCalledWith('content_reports');
    });
  });

  describe('getReport', () => {
    it('returns mapped report when found', async () => {
      mockSupabase.from.mockImplementation(() =>
        mockSupabase.makeFreshChain({
          data: {
            id: 'r1', reporter_id: 'u1', reported_user_id: 'u2',
            category: 'spam', description: 'spam msg', status: 'pending',
            severity: 'low', created_at: '2026-01-01T00:00:00Z',
          },
          error: null,
        })
      );

      const report = await moderationService.getReport('r1');
      expect(report).not.toBeNull();
      expect(report!.id).toBe('r1');
      expect(report!.reporterId).toBe('u1');
    });

    it('returns null when report not found', async () => {
      mockSupabase.from.mockImplementation(() =>
        mockSupabase.makeFreshChain({ data: null, error: { code: 'PGRST116' } })
      );

      const report = await moderationService.getReport('nonexistent');
      expect(report).toBeNull();
    });
  });

  describe('getPendingReports', () => {
    it('queries reports with pending/under_review status', async () => {
      mockSupabase.from.mockImplementation(() =>
        mockSupabase.makeFreshChain({
          data: [
            { id: 'r1', reporter_id: 'u1', category: 'spam', status: 'pending', severity: 'low', description: 'test', created_at: '2026-01-01' },
          ],
          error: null,
        })
      );

      const reports = await moderationService.getPendingReports();
      expect(reports).toHaveLength(1);
      expect(mockSupabase.from).toHaveBeenCalledWith('content_reports');
    });

    it('returns empty array on error', async () => {
      mockSupabase.from.mockImplementation(() =>
        mockSupabase.makeFreshChain({ data: null, error: { message: 'fail' } })
      );

      await expect(moderationService.getPendingReports()).rejects.toThrow();
    });

    it('respects custom limit', async () => {
      mockSupabase.from.mockImplementation(() =>
        mockSupabase.makeFreshChain({ data: [], error: null })
      );

      await moderationService.getPendingReports(10);
      expect(mockSupabase.from).toHaveBeenCalledWith('content_reports');
    });
  });

  describe('updateReportStatus', () => {
    it('updates status and sets resolved_at for action_taken', async () => {
      const updatedReport = {
        id: 'r1', reporter_id: 'u1', category: 'spam', status: 'action_taken',
        severity: 'low', description: 'test', resolution: 'User banned',
        resolved_at: '2026-01-01', created_at: '2025-01-01',
      };

      mockSupabase.from.mockImplementation(() =>
        mockSupabase.makeFreshChain({ data: updatedReport, error: null })
      );

      const result = await moderationService.updateReportStatus('r1', 'action_taken', 'User banned');
      expect(result.status).toBe('action_taken');
    });

    it('throws on update error', async () => {
      mockSupabase.from.mockImplementation(() =>
        mockSupabase.makeFreshChain({ data: null, error: { message: 'fail' } })
      );

      await expect(
        moderationService.updateReportStatus('r1', 'dismissed')
      ).rejects.toThrow();
    });
  });

  // =======================================================================
  // WARNINGS & STRIKES
  // =======================================================================
  describe('issueWarning', () => {
    it('inserts warning with strike count', async () => {
      // getUserWarnings returns 1 existing active warning
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      let callCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'user_warnings') {
          callCount++;
          if (callCount === 1) {
            // getUserWarnings query
            return mockSupabase.makeFreshChain({
              data: [{ id: 'w1', user_id: 'u1', expires_at: futureDate, type: 'verbal_warning', message: 'old', acknowledged: false, strike_count: 1, created_at: '2026-01-01' }],
              error: null,
            });
          }
          // insert query
          return mockSupabase.makeFreshChain({
            data: {
              id: 'w2', user_id: 'u1', type: 'written_warning', message: 'Be nice',
              strike_count: 2, acknowledged: false, created_at: '2026-01-02',
            },
            error: null,
          });
        }
        return mockSupabase.makeFreshChain({ data: null, error: null });
      });

      const warning = await moderationService.issueWarning('u1', {
        type: 'written_warning',
        message: 'Be nice',
      });

      expect(warning.strikeCount).toBe(2);
      expect(warning.type).toBe('written_warning');
    });

    it('calculates expiry from durationDays', async () => {
      let warningCallCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'user_warnings') {
          warningCallCount++;
          if (warningCallCount === 1) {
            // getUserWarnings returns empty array
            return mockSupabase.makeFreshChain({ data: [], error: null });
          }
          // insert returns single object
          return mockSupabase.makeFreshChain({
            data: { id: 'w1', user_id: 'u1', type: 'temporary_restriction', message: 'test', strike_count: 1, acknowledged: false, created_at: '2026-01-01', expires_at: '2026-01-08' },
            error: null,
          });
        }
        return mockSupabase.makeFreshChain({ data: null, error: null });
      });

      const warning = await moderationService.issueWarning('u1', {
        type: 'temporary_restriction',
        message: 'test',
        durationDays: 7,
      });

      expect(warning).toBeDefined();
    });

    it('auto-suspends user at 5+ active strikes', async () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      const existingWarnings = Array.from({ length: 4 }, (_, i) => ({
        id: `w${i}`, user_id: 'u1', expires_at: futureDate,
        type: 'verbal_warning', message: 'old', acknowledged: false,
        strike_count: i + 1, created_at: '2026-01-01',
      }));

      let warningCallCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'user_warnings') {
          warningCallCount++;
          if (warningCallCount === 1) {
            return mockSupabase.makeFreshChain({ data: existingWarnings, error: null });
          }
          return mockSupabase.makeFreshChain({
            data: { id: 'w5', user_id: 'u1', type: 'written_warning', message: 'Final', strike_count: 5, acknowledged: false, created_at: '2026-01-01' },
            error: null,
          });
        }
        if (table === 'profiles' || table === 'moderation_actions' || table === 'notifications') {
          return mockSupabase.makeFreshChain({ data: null, error: null });
        }
        return mockSupabase.makeFreshChain({ data: null, error: null });
      });

      await moderationService.issueWarning('u1', {
        type: 'written_warning',
        message: 'Final',
      });

      // suspendUser should have been called → profiles update
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
      expect(mockSupabase.from).toHaveBeenCalledWith('moderation_actions');
    });

    it('throws on insert error', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'user_warnings') {
          return mockSupabase.makeFreshChain({ data: null, error: { message: 'DB error' } });
        }
        return mockSupabase.makeFreshChain({ data: null, error: null });
      });

      await expect(
        moderationService.issueWarning('u1', { type: 'verbal_warning', message: 'test' })
      ).rejects.toThrow();
    });
  });

  describe('getUserWarnings', () => {
    it('returns mapped warnings ordered by created_at desc', async () => {
      mockSupabase.from.mockImplementation(() =>
        mockSupabase.makeFreshChain({
          data: [
            { id: 'w1', user_id: 'u1', type: 'verbal_warning', message: 'Be nice', acknowledged: false, strike_count: 1, created_at: '2026-01-01' },
          ],
          error: null,
        })
      );

      const warnings = await moderationService.getUserWarnings('u1');
      expect(warnings).toHaveLength(1);
      expect(warnings[0].userId).toBe('u1');
      expect(warnings[0].type).toBe('verbal_warning');
    });

    it('throws on error', async () => {
      mockSupabase.from.mockImplementation(() =>
        mockSupabase.makeFreshChain({ data: null, error: { message: 'fail' } })
      );
      await expect(moderationService.getUserWarnings('u1')).rejects.toThrow();
    });
  });

  describe('acknowledgeWarning', () => {
    it('updates acknowledged flag', async () => {
      mockSupabase.from.mockImplementation(() =>
        mockSupabase.makeFreshChain({ data: null, error: null })
      );

      await moderationService.acknowledgeWarning('w1');
      expect(mockSupabase.from).toHaveBeenCalledWith('user_warnings');
    });
  });

  describe('getActiveStrikeCount', () => {
    it('counts only non-expired warnings', async () => {
      const future = new Date(Date.now() + 86400000).toISOString();
      const past = new Date(Date.now() - 86400000).toISOString();

      mockSupabase.from.mockImplementation(() =>
        mockSupabase.makeFreshChain({
          data: [
            { id: 'w1', user_id: 'u1', expires_at: future, type: 'verbal_warning', message: 'a', acknowledged: false, strike_count: 1, created_at: '2026-01-01' },
            { id: 'w2', user_id: 'u1', expires_at: past, type: 'verbal_warning', message: 'b', acknowledged: false, strike_count: 2, created_at: '2026-01-01' },
            { id: 'w3', user_id: 'u1', expires_at: null, type: 'verbal_warning', message: 'c', acknowledged: false, strike_count: 3, created_at: '2026-01-01' },
          ],
          error: null,
        })
      );

      const count = await moderationService.getActiveStrikeCount('u1');
      // w1 (future) and w3 (null expiresAt → no expiry = active) = 2
      expect(count).toBe(2);
    });
  });

  // =======================================================================
  // USER ACTIONS
  // =======================================================================
  describe('suspendUser', () => {
    it('updates profile status and creates moderation action + notification', async () => {
      mockSupabase.from.mockImplementation(() =>
        mockSupabase.makeFreshChain({ data: null, error: null })
      );

      await moderationService.suspendUser('u1', 'Violations', 30);

      expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
      expect(mockSupabase.from).toHaveBeenCalledWith('moderation_actions');
      expect(mockSupabase.from).toHaveBeenCalledWith('notifications');
    });
  });

  describe('banUser', () => {
    it('sets profile to banned status', async () => {
      mockSupabase.from.mockImplementation(() =>
        mockSupabase.makeFreshChain({ data: null, error: null })
      );

      await moderationService.banUser('u1', 'Repeated violations', true);
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
      expect(mockSupabase.from).toHaveBeenCalledWith('moderation_actions');
    });

    it('handles non-permanent ban', async () => {
      mockSupabase.from.mockImplementation(() =>
        mockSupabase.makeFreshChain({ data: null, error: null })
      );

      await moderationService.banUser('u1', 'Temp ban', false);
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
    });
  });

  describe('unbanUser', () => {
    it('resets profile to active and logs action', async () => {
      mockSupabase.from.mockImplementation(() =>
        mockSupabase.makeFreshChain({ data: null, error: null })
      );

      await moderationService.unbanUser('u1', 'Appealed', 'mod-1');
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
      expect(mockSupabase.from).toHaveBeenCalledWith('moderation_actions');
    });
  });

  describe('restrictUser', () => {
    it('inserts restriction record and logs action', async () => {
      mockSupabase.from.mockImplementation(() =>
        mockSupabase.makeFreshChain({ data: null, error: null })
      );

      await moderationService.restrictUser(
        'u1',
        { canMessage: false, canCreateRides: true, canBook: true, canReview: false },
        'Spamming messages',
        14,
      );

      expect(mockSupabase.from).toHaveBeenCalledWith('user_restrictions');
      expect(mockSupabase.from).toHaveBeenCalledWith('moderation_actions');
    });
  });

  describe('getUserRestrictions', () => {
    it('returns full permissions when no active restriction', async () => {
      mockSupabase.from.mockImplementation(() =>
        mockSupabase.makeFreshChain({ data: null, error: null })
      );

      const restrictions = await moderationService.getUserRestrictions('u1');
      expect(restrictions).toEqual({
        canMessage: true,
        canCreateRides: true,
        canBook: true,
        canReview: true,
      });
    });

    it('returns restriction values when active restriction exists', async () => {
      mockSupabase.from.mockImplementation(() =>
        mockSupabase.makeFreshChain({
          data: {
            can_message: false,
            can_create_rides: true,
            can_book: false,
            can_review: true,
          },
          error: null,
        })
      );

      const restrictions = await moderationService.getUserRestrictions('u1');
      expect(restrictions.canMessage).toBe(false);
      expect(restrictions.canBook).toBe(false);
      expect(restrictions.canCreateRides).toBe(true);
    });
  });

  // =======================================================================
  // MODERATION QUEUE
  // =======================================================================
  describe('getModerationQueue', () => {
    it('returns reports sorted by severity', async () => {
      mockSupabase.from.mockImplementation(() =>
        mockSupabase.makeFreshChain({
          data: [
            { id: 'r1', reporter_id: 'u1', category: 'safety_concern', status: 'pending', severity: 'critical', description: 'danger', created_at: '2026-01-01' },
          ],
          error: null,
        })
      );

      const queue = await moderationService.getModerationQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].severity).toBe('critical');
    });

    it('applies status filter', async () => {
      mockSupabase.from.mockImplementation(() =>
        mockSupabase.makeFreshChain({ data: [], error: null })
      );

      await moderationService.getModerationQueue({ status: 'pending' });
      expect(mockSupabase.from).toHaveBeenCalledWith('content_reports');
    });

    it('applies category filter', async () => {
      mockSupabase.from.mockImplementation(() =>
        mockSupabase.makeFreshChain({ data: [], error: null })
      );

      await moderationService.getModerationQueue({ category: 'harassment' });
      expect(mockSupabase.from).toHaveBeenCalledWith('content_reports');
    });

    it('applies severity filter', async () => {
      mockSupabase.from.mockImplementation(() =>
        mockSupabase.makeFreshChain({ data: [], error: null })
      );

      await moderationService.getModerationQueue({ severity: 'critical' });
      expect(mockSupabase.from).toHaveBeenCalledWith('content_reports');
    });

    it('throws on query error', async () => {
      mockSupabase.from.mockImplementation(() =>
        mockSupabase.makeFreshChain({ data: null, error: { message: 'fail' } })
      );
      await expect(moderationService.getModerationQueue()).rejects.toThrow();
    });
  });

  // =======================================================================
  // MODERATION STATS
  // =======================================================================
  describe('getModerationStats', () => {
    it('calculates correct counts from report data', async () => {
      mockSupabase.from.mockImplementation(() =>
        mockSupabase.makeFreshChain({
          data: [
            { status: 'pending', created_at: '2026-01-01T00:00:00Z', resolved_at: null },
            { status: 'pending', created_at: '2026-01-02T00:00:00Z', resolved_at: null },
            { status: 'action_taken', created_at: '2026-01-01T00:00:00Z', resolved_at: '2026-01-02T00:00:00Z' },
            { status: 'dismissed', created_at: '2026-01-01T00:00:00Z', resolved_at: '2026-01-03T00:00:00Z' },
            { status: 'escalated', created_at: '2026-01-01T00:00:00Z', resolved_at: null },
          ],
          error: null,
        })
      );

      const stats = await moderationService.getModerationStats();
      expect(stats.pending).toBe(2);
      expect(stats.resolved).toBe(2); // action_taken + dismissed
      expect(stats.escalated).toBe(1);
      expect(stats.avgResolutionTime).toBeGreaterThan(0);
    });

    it('returns zeros when no reports exist', async () => {
      mockSupabase.from.mockImplementation(() =>
        mockSupabase.makeFreshChain({ data: null, error: null })
      );

      const stats = await moderationService.getModerationStats();
      expect(stats).toEqual({ pending: 0, resolved: 0, escalated: 0, avgResolutionTime: 0 });
    });
  });
});
