import { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 auth-bg overflow-hidden relative">
      <style>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          33% { transform: translate(30px, -30px) rotate(120deg); }
          66% { transform: translate(-20px, 20px) rotate(240deg); }
        }

        @keyframes float-delayed {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          33% { transform: translate(-30px, 30px) rotate(-120deg); }
          66% { transform: translate(20px, -20px) rotate(-240deg); }
        }

        @keyframes gradient-shift {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; }
        }

        @keyframes pulse-glow {
          0%, 100% { opacity: 0.5; filter: blur(60px); }
          50% { opacity: 0.8; filter: blur(80px); }
        }

        .auth-bg {
          background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 25%, #10b981 50%, #f59e0b 75%, #ef4444 100%);
          background-size: 400% 400%;
          animation: gradient-flow 15s ease infinite;
        }

        @keyframes gradient-flow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .auth-bg::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(248,250,255,0.98) 100%);
          z-index: 1;
        }

        .floating-shape {
          position: absolute;
          border-radius: 50%;
          filter: blur(60px);
          opacity: 0.6;
          z-index: 2;
        }

        .shape-1 {
          width: 500px;
          height: 500px;
          background: linear-gradient(135deg, rgba(6, 182, 212, 0.3), rgba(14, 165, 233, 0.2));
          top: -250px;
          left: -250px;
          animation: float 20s ease-in-out infinite;
        }

        .shape-2 {
          width: 400px;
          height: 400px;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.3), rgba(5, 150, 105, 0.2));
          bottom: -200px;
          right: -200px;
          animation: float-delayed 25s ease-in-out infinite;
        }

        .shape-3 {
          width: 350px;
          height: 350px;
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(251, 146, 60, 0.2));
          top: 50%;
          right: -150px;
          animation: float 22s ease-in-out infinite 5s;
        }

        .shape-4 {
          width: 300px;
          height: 300px;
          background: linear-gradient(135deg, rgba(14, 165, 233, 0.2), rgba(99, 102, 241, 0.15));
          bottom: 20%;
          left: -100px;
          animation: float-delayed 18s ease-in-out infinite 3s;
        }

        .auth-content {
          position: relative;
          z-index: 10;
        }
      `}</style>

      <div className="floating-shape shape-1"></div>
      <div className="floating-shape shape-2"></div>
      <div className="floating-shape shape-3"></div>
      <div className="floating-shape shape-4"></div>

      <div className="auth-content">
        {children}
      </div>
    </div>
  );
}
