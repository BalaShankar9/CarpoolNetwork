import { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 auth-bg">
      <style>{`
        .auth-bg {
          background:
            radial-gradient(600px 400px at 15% 20%, rgba(56,189,248,0.10), transparent 60%),
            radial-gradient(700px 500px at 85% 25%, rgba(45,212,191,0.10), transparent 60%),
            radial-gradient(600px 400px at 80% 85%, rgba(251,113,133,0.06), transparent 60%),
            linear-gradient(180deg, #F8FAFF 0%, #EEF4FF 100%);
        }
      `}</style>
      {children}
    </div>
  );
}
