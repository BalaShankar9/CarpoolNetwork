import React, { useState } from 'react';
import { X, ChevronLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import WelcomeStep from './WelcomeStep';
import ProfileStep from './ProfileStep';
import VehicleStep from './VehicleStep';
import PreferencesStep from './PreferencesStep';
import CompletionStep from './CompletionStep';

interface OnboardingWizardProps {
  onComplete: () => void;
  onSkip: () => void;
}

const TOTAL_STEPS = 5;

export default function OnboardingWizard({ onComplete, onSkip }: OnboardingWizardProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const handleNext = async () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(prev => prev + 1);
      await updateOnboardingProgress(currentStep + 1);
    } else {
      await completeOnboarding();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      await supabase
        .from('profiles')
        .update({
          onboarding_skipped: true,
          onboarding_step: currentStep
        })
        .eq('id', user.id);

      onSkip();
    } catch (error) {
      console.error('Error skipping onboarding:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateOnboardingProgress = async (step: number) => {
    if (!user) return;

    try {
      await supabase
        .from('profiles')
        .update({ onboarding_step: step })
        .eq('id', user.id);
    } catch (error) {
      console.error('Error updating onboarding progress:', error);
    }
  };

  const completeOnboarding = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      await supabase
        .from('profiles')
        .update({
          onboarding_completed: true,
          onboarding_step: TOTAL_STEPS
        })
        .eq('id', user.id);

      onComplete();
    } catch (error) {
      console.error('Error completing onboarding:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <WelcomeStep onNext={handleNext} />;
      case 2:
        return <ProfileStep onNext={handleNext} />;
      case 3:
        return <VehicleStep onNext={handleNext} onSkipStep={handleNext} />;
      case 4:
        return <PreferencesStep onNext={handleNext} />;
      case 5:
        return <CompletionStep onFinish={completeOnboarding} isLoading={isLoading} />;
      default:
        return <WelcomeStep onNext={handleNext} />;
    }
  };

  const progress = (currentStep / TOTAL_STEPS) * 100;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 z-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Get Started with CarpoolNetwork
            </h2>
            <button
              onClick={handleSkip}
              disabled={isLoading}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="relative">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-sm text-gray-600">
              <span>Step {currentStep} of {TOTAL_STEPS}</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
          </div>
        </div>

        <div className="p-6">
          {renderStep()}
        </div>

        {currentStep > 1 && currentStep < TOTAL_STEPS && (
          <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4">
            <div className="flex gap-3">
              <button
                onClick={handleBack}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
              <button
                onClick={handleSkip}
                disabled={isLoading}
                className="flex-1 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                Complete Later
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
