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
    <div className="w-full max-w-md">
      <div className="text-center mb-6">
        <div className="flex justify-center mb-4">
          <Logo size="lg" showText={false} />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
        {subtitle && <p className="text-gray-600">{subtitle}</p>}
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
        {children}
        {showImpactFacts && <EnhancedImpactFacts route={impactFactsRoute} />}
      </div>
    </div>
  );
}
