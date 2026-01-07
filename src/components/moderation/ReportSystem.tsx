import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flag,
  AlertTriangle,
  MessageSquare,
  Car,
  User,
  Shield,
  Camera,
  Send,
  X,
  Loader2,
  Check,
} from 'lucide-react';
import { moderationService, ReportCategory } from '@/services/moderationService';

interface ReportSystemProps {
  reporterId: string;
  reportedUserId?: string;
  reportedMessageId?: string;
  reportedRideId?: string;
  contextType: 'user' | 'message' | 'ride';
  onClose: () => void;
  onReportSubmitted?: () => void;
}

export function ReportSystem({
  reporterId,
  reportedUserId,
  reportedMessageId,
  reportedRideId,
  contextType,
  onClose,
  onReportSubmitted,
}: ReportSystemProps) {
  const [step, setStep] = useState<'category' | 'details' | 'submitted'>('category');
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory | null>(null);
  const [description, setDescription] = useState('');
  const [evidence, setEvidence] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const categories: Array<{
    value: ReportCategory;
    label: string;
    icon: React.ReactNode;
    description: string;
    contexts: typeof contextType[];
  }> = [
    {
      value: 'harassment',
      label: 'Harassment',
      icon: <AlertTriangle className="w-5 h-5" />,
      description: 'Threatening, bullying, or intimidating behavior',
      contexts: ['user', 'message'],
    },
    {
      value: 'inappropriate_content',
      label: 'Inappropriate Content',
      icon: <MessageSquare className="w-5 h-5" />,
      description: 'Offensive, explicit, or inappropriate messages',
      contexts: ['message'],
    },
    {
      value: 'spam',
      label: 'Spam',
      icon: <MessageSquare className="w-5 h-5" />,
      description: 'Unwanted promotional content or repeated messages',
      contexts: ['user', 'message'],
    },
    {
      value: 'fake_profile',
      label: 'Fake Profile',
      icon: <User className="w-5 h-5" />,
      description: 'Profile using false information or photos',
      contexts: ['user'],
    },
    {
      value: 'fraud',
      label: 'Fraud / Scam',
      icon: <Shield className="w-5 h-5" />,
      description: 'Attempting to deceive or defraud users',
      contexts: ['user', 'message', 'ride'],
    },
    {
      value: 'safety_concern',
      label: 'Safety Concern',
      icon: <AlertTriangle className="w-5 h-5" />,
      description: 'Feeling unsafe or threatened',
      contexts: ['user', 'ride'],
    },
    {
      value: 'dangerous_driving',
      label: 'Dangerous Driving',
      icon: <Car className="w-5 h-5" />,
      description: 'Reckless or unsafe driving behavior',
      contexts: ['ride'],
    },
    {
      value: 'no_show',
      label: 'No Show',
      icon: <X className="w-5 h-5" />,
      description: "Driver or passenger didn't show up",
      contexts: ['ride'],
    },
    {
      value: 'other',
      label: 'Other',
      icon: <Flag className="w-5 h-5" />,
      description: 'Something else not listed above',
      contexts: ['user', 'message', 'ride'],
    },
  ];

  const filteredCategories = categories.filter((c) => c.contexts.includes(contextType));

  const handleSubmit = async () => {
    if (!selectedCategory) return;

    setSubmitting(true);
    try {
      await moderationService.createReport(reporterId, {
        reportedUserId,
        reportedMessageId,
        reportedRideId,
        category: selectedCategory,
        description,
        evidence: evidence.length > 0 ? evidence : undefined,
      });

      setStep('submitted');
      onReportSubmitted?.();
    } catch (error) {
      console.error('Failed to submit report:', error);
      alert('Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddEvidence = () => {
    // In production, this would open a file picker
    const url = prompt('Enter evidence URL (screenshot, etc.)');
    if (url) {
      setEvidence([...evidence, url]);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="bg-slate-800 rounded-xl max-w-md w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <Flag className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Report</h3>
              <p className="text-sm text-slate-400">
                {step === 'category' && 'Select a reason'}
                {step === 'details' && 'Provide details'}
                {step === 'submitted' && 'Report submitted'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {step === 'category' && (
            <motion.div
              key="category"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-4 max-h-96 overflow-y-auto"
            >
              <p className="text-sm text-slate-400 mb-4">
                What would you like to report?
              </p>
              <div className="space-y-2">
                {filteredCategories.map((category) => (
                  <button
                    key={category.value}
                    onClick={() => {
                      setSelectedCategory(category.value);
                      setStep('details');
                    }}
                    className="w-full p-3 bg-slate-700/50 hover:bg-slate-700 rounded-lg flex items-start gap-3 text-left transition-colors"
                  >
                    <div className="p-2 bg-slate-600 rounded-lg text-slate-300">
                      {category.icon}
                    </div>
                    <div>
                      <p className="font-medium text-white">{category.label}</p>
                      <p className="text-sm text-slate-400">{category.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 'details' && (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-4 space-y-4"
            >
              {/* Selected Category */}
              <div className="p-3 bg-slate-700/50 rounded-lg flex items-center gap-3">
                <span className="text-sm text-slate-400">Reporting for:</span>
                <span className="text-sm font-medium text-white capitalize">
                  {selectedCategory?.replace('_', ' ')}
                </span>
                <button
                  onClick={() => setStep('category')}
                  className="ml-auto text-sm text-purple-400 hover:text-purple-300"
                >
                  Change
                </button>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Please describe what happened
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide as much detail as possible..."
                  rows={4}
                  className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              {/* Evidence */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Evidence (optional)
                </label>
                {evidence.length > 0 && (
                  <div className="mb-2 space-y-1">
                    {evidence.map((url, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-2 bg-slate-700/50 rounded-lg"
                      >
                        <Camera className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span className="text-sm text-slate-300 truncate flex-1">
                          {url}
                        </span>
                        <button
                          onClick={() => setEvidence(evidence.filter((_, i) => i !== index))}
                          className="p-1 hover:bg-slate-600 rounded"
                        >
                          <X className="w-3 h-3 text-slate-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  onClick={handleAddEvidence}
                  className="w-full py-2 border border-dashed border-slate-600 rounded-lg text-sm text-slate-400 hover:text-slate-300 hover:border-slate-500 transition-colors"
                >
                  + Add screenshot or evidence
                </button>
              </div>

              {/* Submit */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setStep('category')}
                  className="flex-1 py-3 bg-slate-700 text-white font-medium rounded-lg hover:bg-slate-600 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !description.trim()}
                  className="flex-1 py-3 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Submit Report
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {step === 'submitted' && (
            <motion.div
              key="submitted"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-6 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
                className="w-16 h-16 mx-auto bg-emerald-500/20 rounded-full flex items-center justify-center mb-4"
              >
                <Check className="w-8 h-8 text-emerald-400" />
              </motion.div>
              <h3 className="text-lg font-bold text-white mb-2">Report Submitted</h3>
              <p className="text-slate-400 mb-6">
                Thank you for helping keep our community safe. We'll review your report and take appropriate action.
              </p>
              <button
                onClick={onClose}
                className="px-6 py-3 bg-purple-500 text-white font-medium rounded-lg hover:bg-purple-600 transition-colors"
              >
                Done
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

// Quick Report Button
interface ReportButtonProps {
  reporterId: string;
  reportedUserId?: string;
  reportedMessageId?: string;
  reportedRideId?: string;
  contextType: 'user' | 'message' | 'ride';
  variant?: 'icon' | 'text' | 'full';
}

export function ReportButton({
  reporterId,
  reportedUserId,
  reportedMessageId,
  reportedRideId,
  contextType,
  variant = 'icon',
}: ReportButtonProps) {
  const [showReport, setShowReport] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowReport(true)}
        className={`${
          variant === 'icon'
            ? 'p-2 hover:bg-red-500/20 rounded-lg'
            : variant === 'text'
            ? 'text-sm text-red-400 hover:text-red-300'
            : 'px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30'
        } transition-colors flex items-center gap-2`}
      >
        <Flag className={`${variant === 'icon' ? 'w-4 h-4' : 'w-4 h-4'} text-red-400`} />
        {variant !== 'icon' && <span>Report</span>}
      </button>

      <AnimatePresence>
        {showReport && (
          <ReportSystem
            reporterId={reporterId}
            reportedUserId={reportedUserId}
            reportedMessageId={reportedMessageId}
            reportedRideId={reportedRideId}
            contextType={contextType}
            onClose={() => setShowReport(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

export default ReportSystem;
