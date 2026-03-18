import { vi } from 'vitest';

/* ------------------------------------------------------------------ */
/*  Fake IDs                                                           */
/* ------------------------------------------------------------------ */
export const FAKE_MOD_ID = 'mod-001';
export const FAKE_REPORTER_ID = 'user-rep-001';
export const FAKE_REPORTED_USER_ID = 'user-rep-002';
export const FAKE_REPORT_ID_1 = 'report-001';
export const FAKE_REPORT_ID_2 = 'report-002';

/* ------------------------------------------------------------------ */
/*  Fake reports                                                       */
/* ------------------------------------------------------------------ */
export const FAKE_REPORT_PENDING = {
  id: FAKE_REPORT_ID_1,
  reporterId: FAKE_REPORTER_ID,
  reportedUserId: FAKE_REPORTED_USER_ID,
  category: 'harassment' as const,
  description: 'This user sent threatening messages',
  evidence: ['https://evidence.com/screenshot1.png'],
  status: 'pending' as const,
  severity: 'high' as const,
  createdAt: '2024-06-10T14:30:00Z',
};

export const FAKE_REPORT_RESOLVED = {
  id: FAKE_REPORT_ID_2,
  reporterId: FAKE_REPORTER_ID,
  reportedUserId: FAKE_REPORTED_USER_ID,
  category: 'spam' as const,
  description: 'Sending repeated promotional links',
  status: 'action_taken' as const,
  severity: 'medium' as const,
  resolution: 'User warned and content removed',
  createdAt: '2024-06-08T09:00:00Z',
};

export const FAKE_REPORTS = [FAKE_REPORT_PENDING, FAKE_REPORT_RESOLVED];

/* ------------------------------------------------------------------ */
/*  Fake stats                                                         */
/* ------------------------------------------------------------------ */
export const FAKE_STATS = {
  pending: 5,
  resolved: 42,
  escalated: 2,
  avgResolutionTime: 3.5,
};
