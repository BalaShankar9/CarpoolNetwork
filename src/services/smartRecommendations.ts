import { supabase } from '../lib/supabase';

interface Recommendation {
  recommendation_id: string;
  ride_id: string | null;
  driver_id: string | null;
  score: number;
  reasoning: Record<string, any>;
  ride_details: any;
}

interface RecommendationFeedback {
  recommendation_id: string;
  feedback_type: 'helpful' | 'not_helpful' | 'irrelevant' | 'offensive';
  rating?: number;
  comment?: string;
}

export async function getSmartRecommendations(userId: string, limit: number = 10): Promise<Recommendation[]> {
  try {
    const { data, error } = await supabase.rpc('get_smart_recommendations', {
      p_user_id: userId,
      p_limit: limit
    });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Failed to get smart recommendations:', error);
    return [];
  }
}

export async function markRecommendationClicked(recommendationId: string) {
  try {
    const { error } = await supabase
      .from('user_recommendations')
      .update({
        clicked: true,
        clicked_at: new Date().toISOString()
      })
      .eq('id', recommendationId);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Failed to mark recommendation clicked:', error);
    return false;
  }
}

export async function markRecommendationConverted(recommendationId: string) {
  try {
    const { error } = await supabase
      .from('user_recommendations')
      .update({
        converted: true,
        converted_at: new Date().toISOString()
      })
      .eq('id', recommendationId);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Failed to mark recommendation converted:', error);
    return false;
  }
}

export async function dismissRecommendation(recommendationId: string) {
  try {
    const { error } = await supabase
      .from('user_recommendations')
      .update({
        dismissed: true
      })
      .eq('id', recommendationId);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Failed to dismiss recommendation:', error);
    return false;
  }
}

export async function submitRecommendationFeedback(feedback: RecommendationFeedback) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('recommendation_feedback')
      .insert({
        recommendation_id: feedback.recommendation_id,
        user_id: user.id,
        feedback_type: feedback.feedback_type,
        rating: feedback.rating || null,
        comment: feedback.comment || null
      });

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Failed to submit recommendation feedback:', error);
    return false;
  }
}

export async function createRecommendations(userId: string) {
  try {
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!userProfile) return;

    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId);

    const { data: recentSearches } = await supabase
      .from('search_queries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    const { data: upcomingRides } = await supabase
      .from('rides')
      .select(`
        *,
        driver:profiles!rides_driver_id_fkey(*)
      `)
      .eq('status', 'active')
      .gte('departure_time', new Date().toISOString())
      .order('departure_time', { ascending: true })
      .limit(20);

    if (!upcomingRides || upcomingRides.length === 0) return;

    const recommendations = upcomingRides.map((ride: any) => {
      let score = 50;
      const reasoning: Record<string, any> = {};

      if (preferences) {
        preferences.forEach((pref: any) => {
          const rideMetadata = ride.metadata || {};

          if (pref.preference_key === 'smoking' && pref.preference_value === rideMetadata.smoking_allowed) {
            score += 15;
            reasoning.smoking_match = true;
          }

          if (pref.preference_key === 'pets' && pref.preference_value === rideMetadata.pets_allowed) {
            score += 15;
            reasoning.pets_match = true;
          }

          if (pref.preference_key === 'music' && pref.preference_value === rideMetadata.music_allowed) {
            score += 10;
            reasoning.music_match = true;
          }
        });
      }

      if (ride.driver && ride.driver.trust_score) {
        score += (ride.driver.trust_score - 50) * 0.5;
        reasoning.driver_trust_score = ride.driver.trust_score;
      }

      if (recentSearches) {
        const matchingSearch = recentSearches.find((search: any) => {
          const filters = search.filters || {};
          return (
            filters.origin?.toLowerCase().includes(ride.origin.toLowerCase()) ||
            filters.destination?.toLowerCase().includes(ride.destination.toLowerCase())
          );
        });

        if (matchingSearch) {
          score += 20;
          reasoning.matches_recent_search = true;
        }
      }

      return {
        user_id: userId,
        recommendation_type: 'ride_match',
        ride_id: ride.id,
        driver_id: ride.driver_id,
        score: Math.min(Math.max(score, 0), 100),
        reasoning
      };
    });

    const topRecommendations = recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    for (const rec of topRecommendations) {
      await supabase.from('user_recommendations').insert(rec);
    }

    return topRecommendations;
  } catch (error) {
    console.error('Failed to create recommendations:', error);
    return [];
  }
}

export async function optimizeSearchResults(
  userId: string,
  origin: string,
  destination: string,
  departureDate: string
) {
  try {
    const { data, error } = await supabase.rpc('optimize_search_results', {
      p_user_id: userId,
      p_origin: origin,
      p_destination: destination,
      p_departure_date: departureDate
    });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Failed to optimize search results:', error);
    return [];
  }
}

export async function trackSearch(
  userId: string | null,
  searchType: string,
  queryText: string,
  filters: Record<string, any>,
  resultsCount: number,
  responseTimeMs: number
) {
  try {
    const { error } = await supabase
      .from('search_queries')
      .insert({
        user_id: userId,
        search_type: searchType,
        query_text: queryText,
        filters,
        results_count: resultsCount,
        response_time_ms: responseTimeMs
      });

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Failed to track search:', error);
    return false;
  }
}

export async function updateRoutePopularity(
  origin: string,
  destination: string,
  incrementSearch: boolean = true,
  incrementBooking: boolean = false
) {
  try {
    const { error } = await supabase.rpc('update_route_popularity', {
      p_origin: origin,
      p_destination: destination,
      p_increment_search: incrementSearch,
      p_increment_booking: incrementBooking
    });

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Failed to update route popularity:', error);
    return false;
  }
}
