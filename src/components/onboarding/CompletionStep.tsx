import React, { useEffect, useState } from 'react';
import { Check, Sparkles, TrendingUp, Award } from 'lucide-react';

interface CompletionStepProps {
  onFinish: () => void;
  isLoading: boolean;
}

export default function CompletionStep({ onFinish, isLoading }: CompletionStepProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    setShowConfetti(true);
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="text-center">
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center">
          <div className="animate-ping">
            <Sparkles className="w-20 h-20 text-yellow-500" />
          </div>
        </div>
      )}

      <div className="mb-6">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
          <Check className="w-12 h-12 text-green-600" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          You're All Set!
        </h3>
        <p className="text-gray-600 text-lg">
          Welcome to the CarpoolNetwork community
        </p>
      </div>

      <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl p-6 mb-6">
        <h4 className="font-semibold text-gray-900 mb-4">What's Next?</h4>
        <div className="space-y-3 text-left">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-white rounded-full flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Complete Your Verification</p>
              <p className="text-sm text-gray-600">Add documents to boost your trust score</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-white rounded-full flex items-center justify-center">
              <Award className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Upload Profile Photo</p>
              <p className="text-sm text-gray-600">Help others recognize you</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-white rounded-full flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Find or Post Your First Ride</p>
              <p className="text-sm text-gray-600">Start your carpool journey today</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-yellow-800">
          <strong>Pro Tip:</strong> Completing your profile to 100% increases your match rate by 78%!
        </p>
      </div>

      <button
        onClick={onFinish}
        disabled={isLoading}
        className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 flex items-center justify-center gap-2 text-lg font-semibold"
      >
        {isLoading ? 'Finishing...' : 'Start Using CarpoolNetwork'}
        <Sparkles className="w-5 h-5" />
      </button>
    </div>
  );
}