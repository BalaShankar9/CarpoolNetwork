import { useState, useEffect } from 'react';
import { Star, ThumbsUp, MessageSquare, Calendar, Car, User, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import ClickableUserProfile from '../shared/ClickableUserProfile';

interface Review {
    id: string;
    booking_id: string;
    ride_id: string;
    reviewer_id: string;
    reviewee_id: string;
    overall_rating: number;
    punctuality_rating: number | null;
    cleanliness_rating: number | null;
    communication_rating: number | null;
    safety_rating: number | null;
    comfort_rating: number | null;
    review_text: string | null;
    would_ride_again: boolean;
    created_at: string;
    reviewer?: {
        id: string;
        full_name: string;
        avatar_url?: string | null;
        profile_photo_url?: string | null;
    };
    ride?: {
        origin: string;
        destination: string;
        departure_time: string;
    };
}

interface ReviewStats {
    average_rating: number;
    total_reviews: number;
    rating_breakdown: Record<number, number>;
    category_averages: {
        punctuality: number;
        cleanliness: number;
        communication: number;
        safety: number;
        comfort: number;
    };
    would_ride_again_percent: number;
}

interface ReviewsDisplayProps {
    userId: string;
    isOwnProfile?: boolean;
}

export default function ReviewsDisplay({ userId, isOwnProfile = false }: ReviewsDisplayProps) {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [stats, setStats] = useState<ReviewStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'positive' | 'negative'>('all');
    const [sortBy, setSortBy] = useState<'recent' | 'highest' | 'lowest'>('recent');

    useEffect(() => {
        loadReviews();
    }, [userId]);

    const loadReviews = async () => {
        try {
            const { data, error } = await supabase
                .from('ride_reviews_detailed')
                .select(`
          *,
          reviewer:profiles!ride_reviews_detailed_reviewer_id_fkey(id, full_name, avatar_url, profile_photo_url),
          ride:rides!ride_reviews_detailed_ride_id_fkey(origin, destination, departure_time)
        `)
                .eq('reviewee_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            setReviews(data || []);
            calculateStats(data || []);
        } catch (error) {
            console.error('Error loading reviews:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (reviewData: Review[]) => {
        if (reviewData.length === 0) {
            setStats(null);
            return;
        }

        const totalRatings = reviewData.reduce((sum, r) => sum + r.overall_rating, 0);
        const avgRating = totalRatings / reviewData.length;

        const breakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        reviewData.forEach(r => {
            breakdown[r.overall_rating]++;
        });

        const calcAvg = (field: keyof Review) => {
            const validReviews = reviewData.filter(r => r[field] !== null);
            if (validReviews.length === 0) return 0;
            return validReviews.reduce((sum, r) => sum + ((r[field] as number) || 0), 0) / validReviews.length;
        };

        const wouldRideAgain = reviewData.filter(r => r.would_ride_again).length;

        setStats({
            average_rating: avgRating,
            total_reviews: reviewData.length,
            rating_breakdown: breakdown,
            category_averages: {
                punctuality: calcAvg('punctuality_rating'),
                cleanliness: calcAvg('cleanliness_rating'),
                communication: calcAvg('communication_rating'),
                safety: calcAvg('safety_rating'),
                comfort: calcAvg('comfort_rating'),
            },
            would_ride_again_percent: (wouldRideAgain / reviewData.length) * 100,
        });
    };

    const getFilteredAndSortedReviews = () => {
        let filtered = [...reviews];

        if (filter === 'positive') {
            filtered = filtered.filter(r => r.overall_rating >= 4);
        } else if (filter === 'negative') {
            filtered = filtered.filter(r => r.overall_rating <= 2);
        }

        switch (sortBy) {
            case 'highest':
                filtered.sort((a, b) => b.overall_rating - a.overall_rating);
                break;
            case 'lowest':
                filtered.sort((a, b) => a.overall_rating - b.overall_rating);
                break;
            default:
                filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }

        return filtered;
    };

    const RatingBar = ({ rating, maxRating = 5 }: { rating: number; maxRating?: number }) => (
        <div className="flex items-center gap-1">
            {[...Array(maxRating)].map((_, i) => (
                <Star
                    key={i}
                    className={`w-4 h-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                />
            ))}
        </div>
    );

    const CategoryRating = ({ label, rating }: { label: string; rating: number }) => (
        <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">{label}</span>
            <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${(rating / 5) * 100}%` }}
                    />
                </div>
                <span className="text-sm font-medium text-gray-900 w-8">{rating.toFixed(1)}</span>
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Stats Overview */}
            {stats && (
                <div className="bg-white rounded-xl p-6 border border-gray-200">
                    <div className="grid md:grid-cols-3 gap-6">
                        {/* Overall Rating */}
                        <div className="text-center">
                            <div className="text-5xl font-bold text-gray-900">{stats.average_rating.toFixed(1)}</div>
                            <div className="flex justify-center mt-2">
                                <RatingBar rating={Math.round(stats.average_rating)} />
                            </div>
                            <p className="text-gray-500 mt-1">{stats.total_reviews} reviews</p>
                        </div>

                        {/* Rating Breakdown */}
                        <div className="space-y-2">
                            {[5, 4, 3, 2, 1].map(rating => (
                                <div key={rating} className="flex items-center gap-2">
                                    <span className="text-sm text-gray-600 w-3">{rating}</span>
                                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-yellow-400 rounded-full"
                                            style={{
                                                width: `${(stats.rating_breakdown[rating] / stats.total_reviews) * 100}%`,
                                            }}
                                        />
                                    </div>
                                    <span className="text-sm text-gray-500 w-8">
                                        {stats.rating_breakdown[rating]}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Would Ride Again */}
                        <div className="text-center flex flex-col justify-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mx-auto">
                                <ThumbsUp className="w-8 h-8 text-green-600" />
                            </div>
                            <div className="text-2xl font-bold text-gray-900 mt-2">
                                {stats.would_ride_again_percent.toFixed(0)}%
                            </div>
                            <p className="text-gray-500 text-sm">would ride again</p>
                        </div>
                    </div>

                    {/* Category Breakdown */}
                    <div className="mt-6 pt-6 border-t border-gray-200">
                        <h4 className="text-sm font-medium text-gray-900 mb-4">Category Ratings</h4>
                        <div className="grid md:grid-cols-2 gap-4">
                            <CategoryRating label="Punctuality" rating={stats.category_averages.punctuality} />
                            <CategoryRating label="Communication" rating={stats.category_averages.communication} />
                            <CategoryRating label="Safety" rating={stats.category_averages.safety} />
                            <CategoryRating label="Comfort" rating={stats.category_averages.comfort} />
                            <CategoryRating label="Cleanliness" rating={stats.category_averages.cleanliness} />
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-center justify-between">
                <div className="flex gap-2">
                    {(['all', 'positive', 'negative'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            {f === 'all' ? 'All' : f === 'positive' ? '★ 4+' : '★ 2-'}
                        </button>
                    ))}
                </div>
                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                    <option value="recent">Most Recent</option>
                    <option value="highest">Highest Rated</option>
                    <option value="lowest">Lowest Rated</option>
                </select>
            </div>

            {/* Reviews List */}
            {reviews.length === 0 ? (
                <div className="bg-gray-50 rounded-xl p-8 text-center">
                    <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No Reviews Yet</h3>
                    <p className="text-gray-600">
                        {isOwnProfile
                            ? "You haven't received any reviews yet. Complete more rides to get feedback!"
                            : "This user hasn't received any reviews yet."}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {getFilteredAndSortedReviews().map(review => (
                        <div key={review.id} className="bg-white rounded-xl p-6 border border-gray-200">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-3">
                                    {review.reviewer && (
                                        <ClickableUserProfile
                                            user={{
                                                id: review.reviewer.id,
                                                full_name: review.reviewer.full_name,
                                                avatar_url: review.reviewer.avatar_url,
                                                profile_photo_url: review.reviewer.profile_photo_url,
                                            }}
                                            size="sm"
                                        />
                                    )}
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-gray-900">
                                                {review.reviewer?.full_name || 'Anonymous'}
                                            </span>
                                            <RatingBar rating={review.overall_rating} />
                                        </div>
                                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(review.created_at).toLocaleDateString()}
                                            {review.ride && (
                                                <>
                                                    <span className="mx-1">•</span>
                                                    <Car className="w-3 h-3" />
                                                    {review.ride.origin} → {review.ride.destination}
                                                </>
                                            )}
                                        </p>
                                    </div>
                                </div>
                                {review.would_ride_again ? (
                                    <span className="inline-flex items-center gap-1 text-green-600 text-sm bg-green-50 px-2 py-1 rounded-full">
                                        <ThumbsUp className="w-3 h-3" />
                                        Would ride again
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 text-red-600 text-sm bg-red-50 px-2 py-1 rounded-full">
                                        Would not ride again
                                    </span>
                                )}
                            </div>

                            {review.review_text && (
                                <p className="mt-4 text-gray-700">{review.review_text}</p>
                            )}

                            {/* Detailed Ratings */}
                            <div className="mt-4 grid grid-cols-5 gap-2">
                                {[
                                    { label: 'Punctuality', value: review.punctuality_rating },
                                    { label: 'Communication', value: review.communication_rating },
                                    { label: 'Safety', value: review.safety_rating },
                                    { label: 'Comfort', value: review.comfort_rating },
                                    { label: 'Cleanliness', value: review.cleanliness_rating },
                                ].map(({ label, value }) => (
                                    value !== null && (
                                        <div key={label} className="text-center">
                                            <div className="text-xs text-gray-500">{label}</div>
                                            <div className="flex items-center justify-center gap-0.5 mt-1">
                                                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                                <span className="text-sm font-medium">{value}</span>
                                            </div>
                                        </div>
                                    )
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
