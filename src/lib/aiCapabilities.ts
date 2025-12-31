export type UserRole = 'guest' | 'user' | 'admin';

export type AiActionType =
  | 'NAVIGATE'
  | 'SHOW_HELP'
  | 'LIST_VEHICLES'
  | 'LIST_MY_RIDES'
  | 'LIST_MY_BOOKINGS'
  | 'SHOW_TODAY_ACTIVITY'
  | 'START_ADD_VEHICLE'
  | 'START_POST_RIDE'
  | 'SUGGEST_RIDE_PLAN'
  | 'ADMIN_OVERVIEW'
  | 'ADMIN_RECENT_BUG_REPORTS'
  | 'ADMIN_RECENT_ERRORS'
  | 'ADMIN_USER_SUMMARY';

export interface AiAction {
  type: AiActionType;
  params?: Record<string, unknown>;
  note?: string;
}

export type AiAuthor = 'user' | 'assistant' | 'system';

export interface AiMessage {
  id: string;
  author: AiAuthor;
  content: string;
  createdAt: string;
}

export interface AiRouterResponse {
  reply: string;
  actions?: AiAction[];
  debug?: Record<string, unknown>;
}

export interface AiClientContext {
  userId?: string | null;
  displayName?: string | null;
  role: UserRole;
  currentRoute: string;
  locale?: string;
  counters?: {
    vehiclesCount?: number;
    offeredRidesCount?: number;
    takenRidesCount?: number;
    upcomingBookingsCount?: number;
  };
}

export function isActionAllowedForRole(role: UserRole, action: AiActionType): boolean {
  if (role === 'admin') return true;
  if (role === 'guest') {
    return action === 'NAVIGATE' || action === 'SHOW_HELP' || action === 'SUGGEST_RIDE_PLAN';
  }
  // default user role
  return !action.startsWith('ADMIN_');
}
