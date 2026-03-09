import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FileText,
  Truck,
  BarChart3,
  Settings,
  Bell,
  ChevronDown,
  ArrowLeft,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export type AdminTab = 'overview' | 'users-safety' | 'content' | 'operations' | 'analytics' | 'system';

interface TabDef {
  key: AdminTab;
  label: string;
  icon: React.ReactNode;
}

const TABS: TabDef[] = [
  { key: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
  { key: 'users-safety', label: 'Users & Safety', icon: <Users className="w-4 h-4" /> },
  { key: 'content', label: 'Content', icon: <FileText className="w-4 h-4" /> },
  { key: 'operations', label: 'Operations', icon: <Truck className="w-4 h-4" /> },
  { key: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> },
  { key: 'system', label: 'System', icon: <Settings className="w-4 h-4" /> },
];

interface AdminTopBarProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  incidentCount?: number;
}

export default function AdminTopBar({ activeTab, onTabChange, incidentCount }: AdminTopBarProps) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="bg-slate-900 border-b border-slate-700 shrink-0">
      {/* Top row */}
      <div className="h-14 flex items-center justify-between px-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
            <LayoutDashboard className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-slate-50 text-sm">CarpoolNetwork Admin</span>
        </div>

        {/* Right side: notification bell + user dropdown */}
        <div className="flex items-center gap-3">
          {/* Notification bell */}
          <button
            className="relative p-2 hover:bg-slate-800 rounded-lg transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5 text-slate-400" />
            {incidentCount !== undefined && incidentCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
                {incidentCount > 99 ? '99+' : incidentCount}
              </span>
            )}
          </button>

          {/* User dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <img
                src={profile?.avatar_url || '/default-avatar.png'}
                alt="Avatar"
                className="w-7 h-7 rounded-full object-cover bg-slate-700"
              />
              <span className="text-sm text-slate-50 hidden sm:inline">
                {profile?.full_name || 'Admin'}
              </span>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-1 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 z-50">
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate('/');
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-slate-50 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to App
                </button>
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    handleSignOut();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-slate-700 hover:text-red-300 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tab row */}
      <div className="flex overflow-x-auto px-4">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors relative ${
              activeTab === tab.key
                ? 'text-slate-50'
                : 'text-slate-400 hover:text-slate-50 hover:bg-slate-800'
            }`}
          >
            {tab.icon}
            {tab.label}
            {/* Active tab gradient underline */}
            {activeTab === tab.key && (
              <span
                className="absolute bottom-0 left-0 right-0 h-[3px]"
                style={{
                  background: 'linear-gradient(to right, #ef4444, #f97316)',
                }}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
