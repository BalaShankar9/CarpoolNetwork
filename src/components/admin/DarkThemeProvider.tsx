import { ReactNode, useEffect } from 'react';

interface DarkThemeProviderProps {
  children: ReactNode;
}

export default function DarkThemeProvider({ children }: DarkThemeProviderProps) {
  useEffect(() => {
    document.documentElement.classList.add('dark');
    return () => {
      document.documentElement.classList.remove('dark');
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-50">
      {children}
    </div>
  );
}
