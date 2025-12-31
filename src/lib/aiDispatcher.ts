import { supabase } from '../lib/supabase';
import { AiAction, AiActionType, AiClientContext, isActionAllowedForRole } from './aiCapabilities';
import { logApiError } from '../services/errorTracking';

type DispatchOptions = {
  navigate: (path: string) => void;
  appendSystemMessage?: (text: string) => void;
};

async function summarizeList<T>(rows: T[], label: string, formatter: (row: T) => string): Promise<string> {
  if (!Array.isArray(rows) || rows.length === 0) return `No ${label} found.`;
  const limited = rows.slice(0, 5);
  const summary = limited.map(formatter).join('\n');
  return `${label} (${rows.length}):\n${summary}${rows.length > limited.length ? '\n...' : ''}`;
}

async function handleListAction(action: AiActionType, context: AiClientContext): Promise<string | null> {
  try {
    if (!context.userId) return 'Please sign in to view your data.';

    switch (action) {
      case 'LIST_VEHICLES': {
        const { data, error } = await supabase
          .from('vehicles')
          .select('id,make,model,year,color,license_plate,capacity,is_active')
          .eq('user_id', context.userId)
          .order('created_at', { ascending: false })
          .limit(5);
        if (error) throw error;
        return summarizeList(
          data || [],
          'vehicles',
          (v: any) => `- ${v.make} ${v.model} (${v.year}) ${v.color}, plate ${v.license_plate}, seats ${v.capacity}`
        );
      }
      case 'LIST_MY_RIDES': {
        const { data, error } = await supabase
          .from('rides')
          .select('id,origin,destination,departure_time,available_seats,status')
          .eq('driver_id', context.userId)
          .order('departure_time', { ascending: true })
          .limit(5);
        if (error) throw error;
        return summarizeList(
          data || [],
          'rides you are offering',
          (r: any) =>
            `- ${r.origin} -> ${r.destination} at ${r.departure_time} (${r.available_seats} seats, ${r.status})`
        );
      }
      case 'LIST_MY_BOOKINGS': {
        const { data, error } = await supabase
          .from('ride_bookings')
          .select('id,status,ride:rides(origin,destination,departure_time)')
          .eq('passenger_id', context.userId)
          .order('created_at', { ascending: false })
          .limit(5);
        if (error) throw error;
        return summarizeList(
          data || [],
          'bookings',
          (b: any) =>
            `- ${b.ride?.origin || 'Unknown'} -> ${b.ride?.destination || ''} at ${b.ride?.departure_time || ''} (${
              b.status
            })`
        );
      }
      default:
        return null;
    }
  } catch (error) {
    await logApiError('ai-action-dispatch', error, {
      route: context.currentRoute,
      userId: context.userId,
      role: context.role,
      extra: { action },
    });
    return 'I had trouble loading that data. Please try again from the main page.';
  }
}

export async function executeAiActions(
  actions: AiAction[] | undefined,
  context: AiClientContext,
  opts: DispatchOptions
): Promise<void> {
  if (!actions?.length) return;

  for (const action of actions) {
    if (!isActionAllowedForRole(context.role, action.type)) continue;

    try {
      switch (action.type) {
        case 'NAVIGATE': {
          const target = typeof action.params?.path === 'string' ? (action.params.path as string) : '/';
          opts.navigate(target);
          break;
        }
        case 'SHOW_HELP':
        case 'SUGGEST_RIDE_PLAN': {
          if (action.note && opts.appendSystemMessage) {
            opts.appendSystemMessage(action.note);
          }
          break;
        }
        case 'LIST_VEHICLES':
        case 'LIST_MY_RIDES':
        case 'LIST_MY_BOOKINGS': {
          const summary = await handleListAction(action.type, context);
          if (summary && opts.appendSystemMessage) {
            opts.appendSystemMessage(summary);
          }
          break;
        }
        case 'SHOW_TODAY_ACTIVITY': {
          const { data, error } = await supabase
            .from('ride_bookings')
            .select('id')
            .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
            .lte('created_at', new Date().toISOString())
            .limit(1);
          if (error) throw error;
          if (opts.appendSystemMessage) {
            opts.appendSystemMessage('Activity looks normal so far today. Check the dashboard for detailed charts.');
          }
          break;
        }
        case 'START_ADD_VEHICLE': {
          opts.navigate('/profile?tab=vehicles');
          break;
        }
        case 'START_POST_RIDE': {
          const params = new URLSearchParams();
          if (action.params) {
            Object.entries(action.params).forEach(([key, value]) => {
              if (typeof value === 'string' && value) params.set(key, value);
            });
          }
          const qs = params.toString();
          opts.navigate(qs ? `/post-ride?${qs}` : '/post-ride');
          break;
        }
        case 'ADMIN_OVERVIEW': {
          opts.navigate('/admin');
          break;
        }
        case 'ADMIN_RECENT_BUG_REPORTS': {
          opts.navigate('/admin/bugs');
          break;
        }
        case 'ADMIN_RECENT_ERRORS': {
          opts.navigate('/admin/diagnostics');
          break;
        }
        case 'ADMIN_USER_SUMMARY': {
          opts.navigate('/admin/users');
          break;
        }
        default:
          break;
      }
    } catch (error) {
      await logApiError('ai-action-dispatch', error, {
        route: context.currentRoute,
        userId: context.userId,
        role: context.role,
        extra: { actionType: action.type },
      });
    }
  }
}
