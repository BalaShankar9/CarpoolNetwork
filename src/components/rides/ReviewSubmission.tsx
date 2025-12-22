import { useState } from 'react';
import { Star, Send, ThumbsUp, ThumbsDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ReviewSubmissionProps {
  bookingId: string;
  revieweeName: string;
  onSubmitted?: () => void;
}

export default function ReviewSubmission({
  bookingId,
  revieweeName,
  onSubmitted
}: ReviewSubmissionProps) {
  const [overallRating, setOverallRating] = useState(5);
  const [punctualityRating, setPunctualityRating] = useState(5);
  const [cleanlinessRating, setCleanlinessRating] = useState(5);
  const [communicationRating, setCommunicationRating] = useState(5);
  const [safetyRating, setSafetyRating] = useState(5);
  const [comfortRating, setComfortRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [wouldRideAgain, setWouldRideAgain] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { data, error } = await supabase.rpc('submit_detailed_review', {
        p_booking_id: bookingId,
        p_overall_rating: overallRating,
        p_punctuality_rating: punctualityRating,
        p_cleanliness_rating: cleanlinessRating,
        p_communication_rating: communicationRating,
        p_safety_rating: safetyRating,
        p_comfort_rating: comfortRating,
        p_review_text: reviewText || null,
        p_would_ride_again: wouldRideAgain
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const result = data[0];
        if (result.success) {
          let message = 'Review submitted successfully!';
          if (result.achievements_unlocked && result.achievements_unlocked.length > 0) {
            message += '\n\nAchievements unlocked:';
            result.achievements_unlocked.forEach((achievement: string) => {
              message += `\n- ${achievement}`;
            });
          }
          alert(message);
          if (onSubmitted) onSubmitted();
        } else {
          alert(result.message || 'Failed to submit review');
        }
      }
    } catch (error: any) {
      console.error('Error submitting review:', error);
      alert(error.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const RatingInput = ({
    label,
    value,
    onChange
  }: {
    label: string;
    value: number;
    onChange: (value: number) => void;
  }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() => onChange(rating)}
            className="focus:outline-none"
          >
            <Star
              className={`w-8 h-8 transition-colors ${
                rating <= value
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      <h3 className="text-xl font-bold text-gray-900 mb-4">
        Rate Your Experience with {revieweeName}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-6">
        <RatingInput
          label="Overall Rating"
          value={overallRating}
          onChange={setOverallRating}
        />

        <div className="grid md:grid-cols-2 gap-6">
          <RatingInput
            label="Punctuality"
            value={punctualityRating}
            onChange={setPunctualityRating}
          />
          <RatingInput
            label="Communication"
            value={communicationRating}
            onChange={setCommunicationRating}
          />
          <RatingInput
            label="Safety"
            value={safetyRating}
            onChange={setSafetyRating}
          />
          <RatingInput
            label="Comfort"
            value={comfortRating}
            onChange={setComfortRating}
          />
          <RatingInput
            label="Cleanliness"
            value={cleanlinessRating}
            onChange={setCleanlinessRating}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Written Review (Optional)
          </label>
          <textarea
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Share your experience..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Would you ride with them again?
          </label>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setWouldRideAgain(true)}
              className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors flex items-center justify-center gap-2 ${
                wouldRideAgain
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-300 text-gray-600'
              }`}
            >
              <ThumbsUp className="w-5 h-5" />
              Yes
            </button>
            <button
              type="button"
              onClick={() => setWouldRideAgain(false)}
              className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors flex items-center justify-center gap-2 ${
                !wouldRideAgain
                  ? 'border-red-500 bg-red-50 text-red-700'
                  : 'border-gray-300 text-gray-600'
              }`}
            >
              <ThumbsDown className="w-5 h-5" />
              No
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Send className="w-5 h-5" />
          {submitting ? 'Submitting...' : 'Submit Review'}
        </button>
      </form>
    </div>
  );
}
