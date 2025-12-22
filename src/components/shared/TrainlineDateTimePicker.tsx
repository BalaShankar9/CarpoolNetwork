import { Calendar, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';

interface DateTimeValue {
  date: string;
  time: string;
  timeType: 'depart' | 'arrive';
}

interface TrainlineDateTimePickerProps {
  value: DateTimeValue;
  onChange: (value: DateTimeValue) => void;
  minDate?: string;
  label?: string;
  required?: boolean;
  className?: string;
}

export default function TrainlineDateTimePicker({
  value,
  onChange,
  minDate,
  label = 'When',
  required = false,
  className = '',
}: TrainlineDateTimePickerProps) {
  const [showCustomDate, setShowCustomDate] = useState(false);

  // Generate time options in 15-minute intervals
  const generateTimeOptions = () => {
    const options: string[] = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const h = hour.toString().padStart(2, '0');
        const m = minute.toString().padStart(2, '0');
        options.push(`${h}:${m}`);
      }
    }
    return options;
  };

  const timeOptions = generateTimeOptions();

  // Get today and tomorrow dates
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  // Round current time to nearest 15 minutes
  const getRoundedTime = () => {
    const now = new Date();
    const minutes = now.getMinutes();
    const roundedMinutes = Math.ceil(minutes / 15) * 15;
    now.setMinutes(roundedMinutes);
    now.setSeconds(0);
    return now.toTimeString().slice(0, 5);
  };

  // Initialize with rounded time if empty
  useEffect(() => {
    if (!value.time) {
      onChange({
        ...value,
        time: getRoundedTime(),
        date: value.date || today,
      });
    }
  }, []);

  const handleTimeTypeChange = (timeType: 'depart' | 'arrive') => {
    onChange({ ...value, timeType });
  };

  const handleQuickDateSelect = (selectedDate: string) => {
    onChange({ ...value, date: selectedDate });
    setShowCustomDate(false);
  };

  const handleDateChange = (date: string) => {
    onChange({ ...value, date });
  };

  const handleTimeChange = (time: string) => {
    onChange({ ...value, time });
  };

  // Check if selected date is today
  const isToday = value.date === today;
  const isTomorrow = value.date === tomorrow;

  // Determine if we should show custom date picker
  const shouldShowCustomDate = !isToday && !isTomorrow;

  useEffect(() => {
    if (shouldShowCustomDate) {
      setShowCustomDate(true);
    }
  }, [shouldShowCustomDate]);

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-3">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Time Type Toggle */}
      <div className="flex gap-3 mb-4">
        <button
          type="button"
          onClick={() => handleTimeTypeChange('depart')}
          className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
            value.timeType === 'depart'
              ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-400'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Clock className="w-4 h-4" />
            <span>Depart After</span>
          </div>
        </button>
        <button
          type="button"
          onClick={() => handleTimeTypeChange('arrive')}
          className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
            value.timeType === 'arrive'
              ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-400'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Clock className="w-4 h-4" />
            <span>Arrive By</span>
          </div>
        </button>
      </div>

      {/* Helper Text */}
      <p className="text-xs text-gray-500 mb-4 text-center">
        {value.timeType === 'depart'
          ? 'Select when you want to depart'
          : 'Select when you want to arrive'}
      </p>

      {/* Date Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Calendar className="w-4 h-4 inline mr-1" />
          Date
        </label>
        <div className="grid grid-cols-3 gap-2 mb-2">
          <button
            type="button"
            onClick={() => handleQuickDateSelect(today)}
            className={`py-3 px-4 rounded-lg font-medium transition-all ${
              isToday && !showCustomDate
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => handleQuickDateSelect(tomorrow)}
            className={`py-3 px-4 rounded-lg font-medium transition-all ${
              isTomorrow && !showCustomDate
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Tomorrow
          </button>
          <button
            type="button"
            onClick={() => setShowCustomDate(!showCustomDate)}
            className={`py-3 px-4 rounded-lg font-medium transition-all ${
              showCustomDate
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Custom
          </button>
        </div>

        {showCustomDate && (
          <input
            type="date"
            value={value.date}
            onChange={(e) => handleDateChange(e.target.value)}
            min={minDate || today}
            required={required}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mt-2"
          />
        )}
      </div>

      {/* Time Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Clock className="w-4 h-4 inline mr-1" />
          {value.timeType === 'depart' ? 'Departure Time' : 'Arrival Time'}
        </label>
        <select
          value={value.time}
          onChange={(e) => handleTimeChange(e.target.value)}
          required={required}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
        >
          {timeOptions.map((time) => {
            const [hours, minutes] = time.split(':');
            const hour = parseInt(hours);
            const isPM = hour >= 12;
            const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
            const period = isPM ? 'PM' : 'AM';

            return (
              <option key={time} value={time}>
                {displayHour}:{minutes} {period}
              </option>
            );
          })}
        </select>
      </div>

      {/* Current Selection Summary */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-900">
          <strong>
            {value.timeType === 'depart' ? 'Departing' : 'Arriving'}
          </strong>{' '}
          on{' '}
          {isToday && !showCustomDate
            ? 'Today'
            : isTomorrow && !showCustomDate
            ? 'Tomorrow'
            : new Date(value.date + 'T00:00:00').toLocaleDateString('en-GB', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              })}{' '}
          at{' '}
          {(() => {
            const [hours, minutes] = value.time.split(':');
            const hour = parseInt(hours);
            const isPM = hour >= 12;
            const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
            const period = isPM ? 'PM' : 'AM';
            return `${displayHour}:${minutes} ${period}`;
          })()}
        </p>
      </div>
    </div>
  );
}
