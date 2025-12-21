import { useState, useEffect } from 'react';
import { Star, ThumbsUp, Car, User, Calendar, Filter } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface Review {
  id: string;
  rating: number;
  comment: string;
  review_type: 'driver' | 'passenger';
  created_at: string;
  reviewer: {
    full_name: string;
    avatar_url: string;
    profile_photo_url: string;
  };
}

export default function ReviewsDisplay() {
  const { profile } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'driver' | 'passenger'>('all');

  useEffect(() => {
    if (profile?.id) {
      loadReviews();
    }
  }, [profile?.id, filter]);

  const loadReviews = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('reviews')
        .select(`
          id,
          rating,
          comment,
          review_type,
          created_at,
          reviewer:reviewer_id (
            full_name,
            avatar_url,
            profile_photo_url
          )
        `)
        .eq('reviewee_id', profile?.id)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('review_type', filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setReviews(data || []);
    } catch (err) {
      console.error('Error loading reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!profile) return null;

  const filteredReviews = reviews;
  const totalReviews = reviews.length;
  const averageRating = profile.average_rating || 0;

  const ratingDistribution = [5, 4, 3, 2, 1].map(stars => ({
    stars,
    count: reviews.filter(r => r.rating === stars).length,
    percentage: totalReviews > 0 ? (reviews.filter(r => r.rating === stars).length / totalReviews) * 100 : 0
  }));

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < rating
            ? 'text-yellow-400 fill-yellow-400'
            : 'text-gray-300'
        }`}
      />
    ));
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 md:p-8 border border-gray-200 shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ThumbsUp className="w-6 h-6" />
            Reviews & Ratings
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'} from the community
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('driver')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
              filter === 'driver'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Car className="w-4 h-4" />
            As Driver
          </button>
          <button
            onClick={() => setFilter('passenger')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
              filter === 'passenger'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <User className="w-4 h-4" />
            As Passenger
          </button>
        </div>
      </div>

      {totalReviews === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <ThumbsUp className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="font-medium text-gray-900 mb-2">No reviews yet</p>
          <p className="text-sm text-gray-600">
            Complete rides to start receiving reviews from other users
          </p>
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-2 gap-6 mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
            <div>
              <div className="flex items-center gap-4 mb-4">
                <div className="text-5xl font-bold text-gray-900">{averageRating.toFixed(1)}</div>
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    {renderStars(Math.round(averageRating))}
                  </div>
                  <p className="text-sm text-gray-600">
                    Based on {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {ratingDistribution.map(({ stars, count, percentage }) => (
                <div key={stars} className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700 w-12">{stars} star</span>
                  <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-400 transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 w-12 text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {filteredReviews.map((review) => (
              <div
                key={review.id}
                className="p-5 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center overflow-hidden">
                      {review.reviewer?.profile_photo_url || review.reviewer?.avatar_url ? (
                        <img
                          src={review.reviewer.profile_photo_url || review.reviewer.avatar_url}
                          alt={review.reviewer.full_name}
                          className="w-12 h-12 object-cover"
                        />
                      ) : (
                        <span className="text-lg font-bold text-blue-600">
                          {review.reviewer?.full_name?.[0]?.toUpperCase() || '?'}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{review.reviewer?.full_name || 'Anonymous'}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Calendar className="w-3 h-3" />
                        {new Date(review.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded capitalize">
                          {review.review_type}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {renderStars(review.rating)}
                  </div>
                </div>
                {review.comment && (
                  <p className="text-gray-700 text-sm leading-relaxed pl-15">
                    {review.comment}
                  </p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
