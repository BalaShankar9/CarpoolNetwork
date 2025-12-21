import { ReactNode } from 'react';
import Logo from '../shared/Logo';
import EnhancedImpactFacts from './EnhancedImpactFacts';

interface AuthCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  showImpactFacts?: boolean;
  impactFactsRoute?: string;
}

export default function AuthCard({
  title,
  subtitle,
  children,
  showImpactFacts = true,
  impactFactsRoute = '/signin',
}: AuthCardProps) {
  return (
    <div className="w-full max-w-md animate-fade-in-up">
      <style>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out;
        }

        .glass-card {
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.3);
          box-shadow:
            0 8px 32px 0 rgba(31, 38, 135, 0.15),
            0 0 0 1px rgba(255, 255, 255, 0.5) inset;
        }

        .glass-card:hover {
          box-shadow:
            0 12px 48px 0 rgba(31, 38, 135, 0.2),
            0 0 0 1px rgba(255, 255, 255, 0.6) inset;
          transition: all 0.3s ease;
        }

        .logo-glow {
          filter: drop-shadow(0 4px 12px rgba(14, 165, 233, 0.3));
          animation: logo-pulse 3s ease-in-out infinite;
        }

        @keyframes logo-pulse {
          0%, 100% {
            filter: drop-shadow(0 4px 12px rgba(14, 165, 233, 0.3));
          }
          50% {
            filter: drop-shadow(0 6px 20px rgba(14, 165, 233, 0.5));
          }
        }

        .title-gradient {
          background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 50%, #10b981 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
      `}</style>

      <div className="text-center mb-8">
        <div className="flex justify-center mb-6 logo-glow">
          <Logo size="lg" showText={false} />
        </div>
        <h1 className="text-4xl font-bold mb-2 title-gradient">
          {title}
        </h1>
        {subtitle && (
          <p className="text-gray-600 text-lg font-medium">{subtitle}</p>
        )}
      </div>

      <div className="glass-card rounded-3xl p-8 transition-all duration-300">
        {children}
        {showImpactFacts && <EnhancedImpactFacts route={impactFactsRoute} />}
      </div>
    </div>
  );
}
