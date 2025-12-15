import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date().toISOString();
    let expiredCount = 0;

    // Expire accepted ride requests that are past their expiry time
    const { data: expiredRideRequests, error: rideRequestError } = await supabase
      .from('ride_requests')
      .update({ status: 'EXPIRED', updated_at: now })
      .eq('status', 'ACCEPTED_BY_DRIVER')
      .lt('expires_at', now)
      .select('id');

    if (rideRequestError) {
      console.error('Error expiring ride requests:', rideRequestError);
    } else {
      expiredCount += expiredRideRequests?.length || 0;
      console.log(`Expired ${expiredRideRequests?.length || 0} ride requests`);
    }

    // Expire old trip requests that are past their time window
    const { data: expiredTripRequests, error: tripRequestError } = await supabase
      .from('trip_requests')
      .update({ status: 'EXPIRED', updated_at: now })
      .eq('status', 'OPEN')
      .lt('time_window_end', now)
      .select('id');

    if (tripRequestError) {
      console.error('Error expiring trip requests:', tripRequestError);
    } else {
      expiredCount += expiredTripRequests?.length || 0;
      console.log(`Expired ${expiredTripRequests?.length || 0} trip requests`);
    }

    // Expire old trip offers (older than 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: expiredTripOffers, error: tripOfferError } = await supabase
      .from('trip_offers')
      .update({ status: 'EXPIRED', updated_at: now })
      .eq('status', 'OFFERED')
      .lt('created_at', twentyFourHoursAgo)
      .select('id');

    if (tripOfferError) {
      console.error('Error expiring trip offers:', tripOfferError);
    } else {
      expiredCount += expiredTripOffers?.length || 0;
      console.log(`Expired ${expiredTripOffers?.length || 0} trip offers`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        expired_count: expiredCount,
        details: {
          ride_requests: expiredRideRequests?.length || 0,
          trip_requests: expiredTripRequests?.length || 0,
          trip_offers: expiredTripOffers?.length || 0,
        },
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error in auto-expire function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
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
