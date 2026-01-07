import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Fuel,
  Users,
  MapPin,
  Calculator,
  Loader2,
  Check,
  CreditCard,
  Wallet,
  Split,
  Info,
  ChevronRight,
} from 'lucide-react';
import { paymentService, FuelContribution, PaymentMethod } from '../../services/paymentService';
import { PaymentMethods } from './PaymentMethods';
import { useAuth } from '../../contexts/AuthContext';

interface FuelContributionFormProps {
  rideId: string;
  driverId: string;
  distanceKm: number;
  passengers: number;
  driverName?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function FuelContributionForm({
  rideId,
  driverId,
  distanceKm,
  passengers,
  driverName = 'the driver',
  onSuccess,
  onCancel,
}: FuelContributionFormProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<'calculate' | 'payment' | 'success'>('calculate');
  const [contribution, setContribution] = useState<FuelContribution | null>(null);
  const [customAmount, setCustomAmount] = useState<number | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [processing, setProcessing] = useState(false);
  const [splitEnabled, setSplitEnabled] = useState(false);

  useEffect(() => {
    calculateContribution();
  }, [distanceKm, passengers]);

  const calculateContribution = () => {
    const calc = paymentService.calculateFuelContribution(distanceKm, passengers);
    calc.rideId = rideId;
    setContribution(calc);
    setCustomAmount(calc.suggestedAmount);
  };

  const handlePayment = async () => {
    if (!user || !contribution) return;

    setProcessing(true);
    try {
      const amount = customAmount || contribution.suggestedAmount;
      
      const { paymentId } = await paymentService.createPaymentIntent(
        user.id,
        amount,
        contribution.currency,
        'fuel_contribution',
        {
          rideId,
          recipientId: driverId,
          distanceKm,
          passengers,
        }
      );

      // In production, this would use Stripe's confirmPayment
      // For demo, mark as completed
      await paymentService.updatePaymentStatus(paymentId, 'completed');

      setStep('success');
      setTimeout(() => {
        onSuccess?.();
      }, 2000);
    } catch (error) {
      console.error('Payment failed:', error);
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  return (
    <div className="bg-slate-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-emerald-500/20 to-blue-500/20 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 rounded-lg">
            <Fuel className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Fuel Contribution</h3>
            <p className="text-sm text-slate-400">Support {driverName}'s journey</p>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 'calculate' && contribution && (
          <motion.div
            key="calculate"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="p-4 space-y-4"
          >
            {/* Trip Info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-700/50 rounded-lg">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <MapPin className="w-4 h-4" />
                  <span className="text-xs">Distance</span>
                </div>
                <p className="font-semibold text-white">{distanceKm.toFixed(1)} km</p>
              </div>
              <div className="p-3 bg-slate-700/50 rounded-lg">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <Users className="w-4 h-4" />
                  <span className="text-xs">Passengers</span>
                </div>
                <p className="font-semibold text-white">{passengers}</p>
              </div>
            </div>

            {/* Calculation Breakdown */}
            <div className="p-4 bg-slate-700/30 rounded-lg space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Fuel price</span>
                <span className="text-white">
                  {formatCurrency(contribution.fuelPricePerLiter, contribution.currency)}/L
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Avg. efficiency</span>
                <span className="text-white">{contribution.fuelEfficiency} km/L</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Total fuel cost</span>
                <span className="text-white">
                  {formatCurrency(
                    (distanceKm / contribution.fuelEfficiency) * contribution.fuelPricePerLiter,
                    contribution.currency
                  )}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-600">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 font-medium">Your share</span>
                  <span className="text-lg font-bold text-emerald-400">
                    {formatCurrency(contribution.suggestedAmount, contribution.currency)}
                  </span>
                </div>
              </div>
            </div>

            {/* Custom Amount */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Contribute amount
              </label>
              <div className="flex gap-2">
                {[0.5, 1, 1.5].map((multiplier) => {
                  const amount = Math.round(contribution.suggestedAmount * multiplier * 100) / 100;
                  return (
                    <button
                      key={multiplier}
                      onClick={() => setCustomAmount(amount)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                        customAmount === amount
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {formatCurrency(amount, contribution.currency)}
                    </button>
                  );
                })}
              </div>
              <div className="mt-2">
                <input
                  type="number"
                  value={customAmount || ''}
                  onChange={(e) => setCustomAmount(parseFloat(e.target.value) || 0)}
                  placeholder="Custom amount"
                  min="0"
                  step="0.50"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Info Note */}
            <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <Info className="w-4 h-4 text-blue-400 mt-0.5" />
              <p className="text-xs text-blue-300">
                Fuel contributions are optional and go directly to the driver. This is not a fare - 
                CarpoolNetwork is a free community carpooling platform.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={onCancel}
                className="flex-1 py-3 bg-slate-700 text-white font-medium rounded-lg hover:bg-slate-600 transition-colors"
              >
                Skip
              </button>
              <button
                onClick={() => setStep('payment')}
                disabled={!customAmount || customAmount <= 0}
                className="flex-1 py-3 bg-emerald-500 text-white font-medium rounded-lg hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                Continue
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {step === 'payment' && contribution && (
          <motion.div
            key="payment"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="p-4 space-y-4"
          >
            {/* Amount Summary */}
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-center">
              <p className="text-sm text-slate-400 mb-1">You're contributing</p>
              <p className="text-3xl font-bold text-emerald-400">
                {formatCurrency(customAmount || 0, contribution.currency)}
              </p>
              <p className="text-sm text-slate-400 mt-1">to {driverName}</p>
            </div>

            {/* Payment Methods */}
            <PaymentMethods
              selectable
              onMethodSelected={setSelectedMethod}
            />

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setStep('calculate')}
                className="flex-1 py-3 bg-slate-700 text-white font-medium rounded-lg hover:bg-slate-600 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handlePayment}
                disabled={processing || !selectedMethod}
                className="flex-1 py-3 bg-emerald-500 text-white font-medium rounded-lg hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    Pay {formatCurrency(customAmount || 0, contribution.currency)}
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {step === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-8 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <Check className="w-8 h-8 text-white" />
            </motion.div>
            <h3 className="text-xl font-bold text-white mb-2">Payment Successful!</h3>
            <p className="text-slate-400">
              Your contribution of {formatCurrency(customAmount || 0, contribution?.currency || 'GBP')} 
              {' '}has been sent to {driverName}.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default FuelContributionForm;
