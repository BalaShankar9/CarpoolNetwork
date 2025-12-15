import { useState, useEffect } from 'react';
import { Lightbulb, RefreshCw } from 'lucide-react';
import { getFactsForRoute, type ImpactFact } from '../../data/impactFacts';

interface ImpactFactsProps {
  route: string;
}

export default function ImpactFacts({ route }: ImpactFactsProps) {
  const [facts] = useState(() => getFactsForRoute(route));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const currentFact = facts[currentIndex];

  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % facts.length);
        setIsTransitioning(false);
      }, 300);
    }, 10000);

    return () => clearInterval(interval);
  }, [facts.length]);

  const handleNext = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % facts.length);
      setIsTransitioning(false);
    }, 300);
  };

  return (
    <div className="mt-6 pt-6 border-t border-gray-200">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center">
          <Lightbulb className="w-4 h-4 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Did you know?</p>
            <button
              onClick={handleNext}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Next fact"
            >
              <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>
          <p
            className={`text-sm text-gray-700 leading-relaxed transition-opacity duration-300 ${
              isTransitioning ? 'opacity-0' : 'opacity-100'
            }`}
          >
            {currentFact.text}
          </p>
          {currentFact.sourceLabel && currentFact.sourceUrl && (
            <a
              href={currentFact.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-2 text-xs text-blue-600 hover:text-blue-700"
            >
              Source: {currentFact.sourceLabel}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
