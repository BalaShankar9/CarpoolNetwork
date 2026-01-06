import { useState } from 'react';
import { Calendar, Repeat, X, Info } from 'lucide-react';
import {
  RecurringPatternType,
  RecurringPatternConfig,
  DAYS_OF_WEEK,
  PATTERN_TYPE_LABELS,
  DEFAULT_PATTERN_CONFIG,
  formatPatternDescription,
} from '../../types/recurring';

interface RecurringPatternFormProps {
  isOpen: boolean;
  onClose: () => void;
  onChange: (pattern: RecurringPatternConfig | null) => void;
  initialPattern?: RecurringPatternConfig;
}

export default function RecurringPatternForm({
  isOpen,
  onClose,
  onChange,
  initialPattern,
}: RecurringPatternFormProps) {
  const [pattern, setPattern] = useState<RecurringPatternConfig>(
    initialPattern || DEFAULT_PATTERN_CONFIG
  );

  if (!isOpen) return null;

  const handleSave = () => {
    // Validate
    if (pattern.patternType === 'weekly' && pattern.daysOfWeek.length === 0) {
      return; // Should have at least one day selected
    }
    if (pattern.endType === 'date' && !pattern.endDate) {
      return; // Should have an end date
    }
    if (pattern.endType === 'occurrences' && (!pattern.maxOccurrences || pattern.maxOccurrences < 1)) {
      return;
    }

    onChange(pattern);
    onClose();
  };

  const handleClear = () => {
    onChange(null);
    onClose();
  };

  const toggleDay = (day: number) => {
    setPattern(prev => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter(d => d !== day)
        : [...prev.daysOfWeek, day].sort((a, b) => a - b),
    }));
  };

  const updatePattern = (updates: Partial<RecurringPatternConfig>) => {
    setPattern(prev => ({ ...prev, ...updates }));
  };

  // Get minimum date (today)
  const minDate = new Date().toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Repeat className="w-5 h-5 text-blue-600" />
            Recurring Pattern
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Pattern Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Repeat
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['daily', 'weekly', 'monthly'] as RecurringPatternType[]).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => updatePattern({ patternType: type })}
                  className={`px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
                    pattern.patternType === type
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 hover:border-gray-400 text-gray-700'
                  }`}
                >
                  {PATTERN_TYPE_LABELS[type]}
                </button>
              ))}
            </div>
          </div>

          {/* Weekly - Day Selection */}
          {pattern.patternType === 'weekly' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Repeat on
              </label>
              <div className="flex gap-2 justify-center">
                {DAYS_OF_WEEK.map(day => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className={`w-10 h-10 rounded-full text-sm font-medium transition-all ${
                      pattern.daysOfWeek.includes(day.value)
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    title={day.fullLabel}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
              {pattern.daysOfWeek.length === 0 && (
                <p className="text-sm text-red-500 mt-2 text-center">
                  Please select at least one day
                </p>
              )}
            </div>
          )}

          {/* Monthly - Day of Month */}
          {pattern.patternType === 'monthly' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Day of month
              </label>
              <select
                value={pattern.dayOfMonth}
                onChange={(e) => updatePattern({ dayOfMonth: Number(e.target.value) })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                  <option key={day} value={day}>
                    {day}{getOrdinalSuffix(day)} of each month
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                <Info className="w-3 h-3" />
                Days 29-31 may be skipped in shorter months
              </p>
            </div>
          )}

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Start date
            </label>
            <input
              type="date"
              value={pattern.startDate}
              onChange={(e) => updatePattern({ startDate: e.target.value })}
              min={minDate}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* End Condition */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Ends
            </label>
            <div className="space-y-3">
              {/* Never */}
              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="endType"
                  checked={pattern.endType === 'never'}
                  onChange={() => updatePattern({ endType: 'never' })}
                  className="w-4 h-4 text-blue-600"
                />
                <div>
                  <span className="font-medium text-gray-900">Never</span>
                  <p className="text-sm text-gray-500">Keep generating rides indefinitely</p>
                </div>
              </label>

              {/* On Date */}
              <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="endType"
                  checked={pattern.endType === 'date'}
                  onChange={() => updatePattern({ endType: 'date' })}
                  className="w-4 h-4 text-blue-600 mt-1"
                />
                <div className="flex-1">
                  <span className="font-medium text-gray-900">On date</span>
                  {pattern.endType === 'date' && (
                    <input
                      type="date"
                      value={pattern.endDate}
                      onChange={(e) => updatePattern({ endDate: e.target.value })}
                      min={pattern.startDate || minDate}
                      className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>
              </label>

              {/* After X occurrences */}
              <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="endType"
                  checked={pattern.endType === 'occurrences'}
                  onChange={() => updatePattern({ endType: 'occurrences' })}
                  className="w-4 h-4 text-blue-600 mt-1"
                />
                <div className="flex-1">
                  <span className="font-medium text-gray-900">After number of rides</span>
                  {pattern.endType === 'occurrences' && (
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="number"
                        value={pattern.maxOccurrences}
                        onChange={(e) => updatePattern({
                          maxOccurrences: Math.max(1, Math.min(100, Number(e.target.value))),
                        })}
                        min={1}
                        max={100}
                        className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-600">rides</span>
                    </div>
                  )}
                </div>
              </label>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm font-medium text-blue-800 mb-1">Preview</p>
            <p className="text-blue-700">
              {formatPatternDescription(pattern)}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-200">
          <button
            type="button"
            onClick={handleClear}
            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
          >
            Remove Pattern
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={pattern.patternType === 'weekly' && pattern.daysOfWeek.length === 0}
            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Pattern
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper function
function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

// Compact display component for showing pattern in forms
export function RecurringPatternDisplay({
  pattern,
  onEdit,
  onRemove,
}: {
  pattern: RecurringPatternConfig;
  onEdit: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Repeat className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-blue-900">Recurring Ride</p>
            <p className="text-sm text-blue-700 mt-1">
              {formatPatternDescription(pattern)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="text-sm text-red-600 hover:text-red-700 font-medium"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
