import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface AggregationRequest {
  type: 'daily' | 'hourly' | 'realtime';
  date?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { type, date }: AggregationRequest = await req.json();
    const targetDate = date || new Date().toISOString().split('T')[0];

    let result: any = {};

    if (type === 'daily') {
      const { data: rides } = await supabase
        .from('rides')
        .select('*')
        .gte('created_at', `${targetDate}T00:00:00`)
        .lte('created_at', `${targetDate}T23:59:59`);

      const { data: users } = await supabase
        .from('profiles')
        .select('id')
        .gte('created_at', `${targetDate}T00:00:00`)
        .lte('created_at', `${targetDate}T23:59:59`);

      const { data: bookings } = await supabase
        .from('bookings')
        .select('*')
        .gte('created_at', `${targetDate}T00:00:00`)
        .lte('created_at', `${targetDate}T23:59:59`);

      const totalRides = rides?.length || 0;
      const newUsers = users?.length || 0;
      const completedBookings = bookings?.filter(b => b.status === 'completed').length || 0;
      const cancelledBookings = bookings?.filter(b => b.status === 'cancelled').length || 0;
      const cancellationRate = totalRides > 0 ? (cancelledBookings / totalRides) * 100 : 0;

      await supabase.from('business_metrics_daily').upsert({
        date: targetDate,
        total_rides: totalRides,
        new_users: newUsers,
        cancellation_rate: cancellationRate,
      }, {
        onConflict: 'date'
      });

      result = {
        success: true,
        date: targetDate,
        metrics: {
          totalRides,
          newUsers,
          completedBookings,
          cancelledBookings,
          cancellationRate
        }
      };
    }

    if (type === 'realtime') {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();

      const { count: activeUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('last_active', fiveMinutesAgo);

      const { count: activeRides } = await supabase
        .from('rides')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      await supabase.from('active_users_snapshot').insert({
        snapshot_time: now.toISOString(),
        total_active: activeUsers || 0,
        active_drivers: 0,
        active_passengers: 0,
        users_in_rides: activeRides || 0
      });

      result = {
        success: true,
        timestamp: now.toISOString(),
        activeUsers: activeUsers || 0,
        activeRides: activeRides || 0
      };
    }

    return new Response(
      JSON.stringify(result),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error aggregating metrics:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});