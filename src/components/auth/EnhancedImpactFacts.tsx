import { useState, useEffect, useRef, useMemo } from 'react';
import { Lightbulb, RefreshCw, ExternalLink } from 'lucide-react';
import { getFactsForRoute } from '../../data/impactFacts';

interface EnhancedImpactFactsProps {
  route: string;
  autoRotate?: boolean;
  rotationInterval?: number;
}

export default function EnhancedImpactFacts({
  route,
  autoRotate = true,
  rotationInterval = 10000
}: EnhancedImpactFactsProps) {
  const facts = useMemo(() => getFactsForRoute(route), [route]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fade, setFade] = useState(true);
  const usedIndicesRef = useRef<number[]>([]);
  const transitionTimerRef = useRef<NodeJS.Timeout>();

  const rotateFact = () => {
    setFade(false);
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    transitionTimerRef.current = setTimeout(() => {
      const availableIndices = facts
        .map((_, i) => i)
        .filter(i => !usedIndicesRef.current.includes(i));

      let nextIndex: number;
      if (availableIndices.length === 0) {
        usedIndicesRef.current = [];
        nextIndex = Math.floor(Math.random() * facts.length);
      } else {
        nextIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
      }

      usedIndicesRef.current = [...usedIndicesRef.current, nextIndex];
      setCurrentIndex(nextIndex);
      setFade(true);
    }, 200);
  };

  useEffect(() => {
    if (!autoRotate || facts.length <= 1) return;

    const interval = setInterval(rotateFact, rotationInterval);

    return () => {
      clearInterval(interval);
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    };
  }, [autoRotate, rotationInterval, facts.length]);

  if (facts.length === 0) return null;

  const currentFact = facts[currentIndex];

  return (
    <div className="mt-6 pt-6 border-t border-gray-200">
      <div className={`transition-opacity duration-200 min-h-[80px] ${fade ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <Lightbulb className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-sm font-semibold text-gray-700">Did you know?</h4>
              <button
                onClick={rotateFact}
                className="text-gray-400 hover:text-blue-600 transition-colors"
                aria-label="Show another fact"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              {currentFact.text}
            </p>
            {currentFact.sourceUrl && (
              <a
                href={currentFact.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-xs text-blue-600 hover:text-blue-700 transition-colors"
              >
                <span>{currentFact.sourceLabel || 'Source'}</span>
                <ExternalLink className="w-3 h-3" />
                {currentFact.publishedDate && (
                  <span className="text-gray-500">({currentFact.publishedDate})</span>
                )}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
