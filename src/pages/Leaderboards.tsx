import React, { useState, useEffect, useRef } from 'react';
import {
  Trophy,
  Globe,
  MapPin,
  Users,
  Car,
  Leaf,
  Shield,
  ChevronUp,
  ChevronDown,
  Minus,
  Flame,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react';

import GlobalLeaderboard from '../components/leaderboards/GlobalLeaderboard';
import RegionalLeaderboard from '../components/leaderboards/RegionalLeaderboard';
import FriendLeaderboard from '../components/leaderboards/FriendLeaderboard';

type TabType = 'global' | 'regional' | 'friends';
type Category = 'rides' | 'co2' | 'trust_score' | 'distance';
type Period = 'week' | 'month' | 'all_time';

/* ---------- animated counter hook ---------- */
function useAnimatedCounter(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number>();

  useEffect(() => {
    const start = performance.now();
    const from = 0;
    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(step);
      }
    };
    frameRef.current = requestAnimationFrame(step);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [target, duration]);

  return value;
}

/* ---------- category metadata ---------- */
const CATEGORY_META: Record<
  Category,
  {
    label: string;
    icon: React.ElementType;
    gradient: string;
    ring: string;
    bg: string;
    unit: string;
    tip: string;
  }
> = {
  rides: {
    label: 'Most Rides',
    icon: Car,
    gradient: 'from-blue-500 to-cyan-400',
    ring: 'ring-blue-400',
    bg: 'bg-blue-50',
    unit: 'rides',
    tip: 'Offer or join more rides each week to climb the ranks.',
  },
  co2: {
    label: 'Eco Warriors',
    icon: Leaf,
    gradient: 'from-emerald-500 to-green-400',
    ring: 'ring-emerald-400',
    bg: 'bg-emerald-50',
    unit: 'kg CO\u2082 saved',
    tip: 'Longer shared trips save more carbon. Carpool on your commute!',
  },
  trust_score: {
    label: 'Trust Score',
    icon: Shield,
    gradient: 'from-violet-500 to-purple-400',
    ring: 'ring-violet-400',
    bg: 'bg-violet-50',
    unit: 'score',
    tip: 'Complete your profile, verify your ID, and collect great reviews.',
  },
  distance: {
    label: 'Distance',
    icon: MapPin,
    gradient: 'from-orange-500 to-amber-400',
    ring: 'ring-orange-400',
    bg: 'bg-orange-50',
    unit: 'km',
    tip: 'Every kilometre shared counts. Take that long-distance trip!',
  },
};

const PERIOD_META: Record<Period, { label: string }> = {
  week: { label: 'This Week' },
  month: { label: 'This Month' },
  all_time: { label: 'All Time' },
};

/* ================================================================== */
/*  MAIN COMPONENT                                                     */
/* ================================================================== */
export default function Leaderboards() {
  const [activeTab, setActiveTab] = useState<TabType>('global');
  const [category, setCategory] = useState<Category>('rides');
  const [period, setPeriod] = useState<Period>('month');

  const tabs: { id: TabType; label: string; icon: React.ElementType }[] = [
    { id: 'global', label: 'Global', icon: Globe },
    { id: 'regional', label: 'Regional', icon: MapPin },
    { id: 'friends', label: 'Friends', icon: Users },
  ];

  const categories: Category[] = ['rides', 'co2', 'trust_score', 'distance'];
  const periods: Period[] = ['week', 'month', 'all_time'];

  /* mock "your rank" — in production pull from child component or context */
  const mockRank = 12;
  const mockPrevRank = 15;
  const rankDelta = mockPrevRank - mockRank; // positive = improved
  const animatedRank = useAnimatedCounter(mockRank, 900);

  const catMeta = CATEGORY_META[category];
  const CategoryIcon = catMeta.icon;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ============================================================ */}
      {/*  HERO SECTION                                                 */}
      {/* ============================================================ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500">
        {/* decorative circles */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-white/10 blur-2xl" />

        <div className="relative max-w-6xl mx-auto px-4 pt-10 pb-14 sm:pt-14 sm:pb-20">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            {/* Title cluster */}
            <div className="flex items-center gap-4">
              {/* Trophy with glow */}
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl bg-white/30 blur-xl animate-pulse" />
                <div className="relative p-4 bg-white/20 backdrop-blur-sm rounded-2xl border border-white/30 shadow-lg">
                  <Trophy className="w-10 h-10 text-white drop-shadow-md" />
                </div>
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight drop-shadow">
                  Leaderboards
                </h1>
                <p className="text-amber-100 mt-1 text-sm sm:text-base">
                  Compete, climb, and celebrate with the community
                </p>
              </div>
            </div>

            {/* Your Rank floating card */}
            <div className="w-full sm:w-auto flex-shrink-0">
              <div className="bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 shadow-xl px-6 py-4 flex items-center gap-5">
                <div className="flex flex-col items-center">
                  <span className="text-xs font-semibold uppercase tracking-wider text-amber-100">
                    Your Rank
                  </span>
                  <span className="text-4xl font-black text-white tabular-nums leading-none mt-1">
                    #{animatedRank}
                  </span>
                </div>
                <div className="h-12 w-px bg-white/30" />
                <div className="flex flex-col items-center gap-1">
                  {rankDelta > 0 ? (
                    <>
                      <ChevronUp className="w-5 h-5 text-green-200" />
                      <span className="text-sm font-bold text-green-200">+{rankDelta}</span>
                    </>
                  ) : rankDelta < 0 ? (
                    <>
                      <ChevronDown className="w-5 h-5 text-red-200" />
                      <span className="text-sm font-bold text-red-200">{rankDelta}</span>
                    </>
                  ) : (
                    <>
                      <Minus className="w-5 h-5 text-white/60" />
                      <span className="text-sm font-bold text-white/60">Same</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/*  TAB NAVIGATION (Global / Regional / Friends)             */}
          {/* ======================================================== */}
          <div className="mt-10">
            <div className="inline-flex bg-white/15 backdrop-blur-sm rounded-2xl p-1.5 border border-white/20 shadow-inner">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300
                      ${
                        isActive
                          ? 'bg-white text-amber-700 shadow-lg shadow-amber-900/20'
                          : 'text-white/80 hover:text-white hover:bg-white/10'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  BODY                                                         */}
      {/* ============================================================ */}
      <div className="max-w-6xl mx-auto px-4 -mt-6 relative z-10 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          {/* ======================================================== */}
          {/*  LEFT SIDEBAR (desktop) — Category + Period cards          */}
          {/* ======================================================== */}
          <aside className="hidden lg:block">
            <div className="sticky top-6 space-y-4">
              {/* --- Category cards --- */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 px-1">
                  Category
                </h3>
                <div className="space-y-2">
                  {categories.map((catId) => {
                    const meta = CATEGORY_META[catId];
                    const Icon = meta.icon;
                    const selected = category === catId;
                    return (
                      <button
                        key={catId}
                        onClick={() => setCategory(catId)}
                        className={`
                          w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                          ${
                            selected
                              ? `bg-gradient-to-r ${meta.gradient} text-white shadow-lg ring-2 ${meta.ring} ring-offset-2`
                              : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                          }
                        `}
                      >
                        <div
                          className={`p-2 rounded-lg ${
                            selected ? 'bg-white/20' : 'bg-white shadow-sm'
                          }`}
                        >
                          <Icon
                            className={`w-5 h-5 ${
                              selected ? 'text-white' : 'text-gray-500'
                            }`}
                          />
                        </div>
                        <span className="font-semibold text-sm">{meta.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* --- Period selector --- */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 px-1">
                  Time Period
                </h3>
                <div className="flex flex-col gap-1">
                  {periods.map((p) => {
                    const selected = period === p;
                    return (
                      <button
                        key={p}
                        onClick={() => setPeriod(p)}
                        className={`
                          px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-left
                          ${
                            selected
                              ? 'bg-amber-50 text-amber-700 border border-amber-200 shadow-sm'
                              : 'text-gray-600 hover:bg-gray-50'
                          }
                        `}
                      >
                        {PERIOD_META[p].label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* --- Quick stats flair --- */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200/60 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Flame className="w-5 h-5 text-orange-500" />
                  <span className="text-sm font-bold text-orange-800">Hot Streak</span>
                </div>
                <p className="text-2xl font-black text-orange-700">7 days</p>
                <p className="text-xs text-orange-600/80 mt-1">
                  You have been active every day this week!
                </p>
              </div>
            </div>
          </aside>

          {/* ======================================================== */}
          {/*  MOBILE CATEGORY SCROLLER + PERIOD PILLS                  */}
          {/* ======================================================== */}
          <div className="lg:hidden space-y-3">
            {/* Category horizontal scroll */}
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {categories.map((catId) => {
                const meta = CATEGORY_META[catId];
                const Icon = meta.icon;
                const selected = category === catId;
                return (
                  <button
                    key={catId}
                    onClick={() => setCategory(catId)}
                    className={`
                      flex-shrink-0 flex items-center gap-2 px-4 py-3 rounded-2xl transition-all duration-200
                      ${
                        selected
                          ? `bg-gradient-to-r ${meta.gradient} text-white shadow-lg ring-2 ${meta.ring} ring-offset-2`
                          : 'bg-white text-gray-700 border border-gray-200 shadow-sm'
                      }
                    `}
                  >
                    <Icon className={`w-5 h-5 ${selected ? 'text-white' : 'text-gray-500'}`} />
                    <span className="font-semibold text-sm whitespace-nowrap">{meta.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Period pills */}
            <div className="flex bg-white rounded-xl border border-gray-200 p-1 shadow-sm">
              {periods.map((p) => {
                const selected = period === p;
                return (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`
                      flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-200
                      ${
                        selected
                          ? 'bg-amber-500 text-white shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }
                    `}
                  >
                    {PERIOD_META[p].label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ======================================================== */}
          {/*  MAIN CONTENT AREA                                        */}
          {/* ======================================================== */}
          <main className="space-y-6">
            {/* ---- Category + period banner ---- */}
            <div
              className={`bg-gradient-to-r ${catMeta.gradient} rounded-2xl p-6 shadow-lg relative overflow-hidden`}
            >
              {/* decorative icon */}
              <CategoryIcon className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10" />

              <div className="relative flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <CategoryIcon className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-extrabold text-white">{catMeta.label}</h2>
                  <p className="text-white/80 text-sm mt-0.5">
                    {PERIOD_META[period].label} &middot;{' '}
                    {tabs.find((t) => t.id === activeTab)?.label} Rankings
                  </p>
                </div>
              </div>
            </div>

            {/* ---- Leaderboard content ---- */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-5 sm:p-6">
                {activeTab === 'global' && (
                  <GlobalLeaderboard category={category} period={period} />
                )}
                {activeTab === 'regional' && (
                  <RegionalLeaderboard category={category} period={period} />
                )}
                {activeTab === 'friends' && (
                  <FriendLeaderboard category={category} period={period} />
                )}
              </div>
            </div>

            {/* ---- Motivational Footer ---- */}
            <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 rounded-2xl border border-amber-200/60 p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl shadow-md flex-shrink-0">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-amber-900 text-lg flex items-center gap-2">
                    Keep Climbing!
                    <Sparkles className="w-5 h-5 text-amber-500" />
                  </h3>

                  {/* progress to next rank */}
                  <div className="mt-3 mb-4">
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="text-amber-700 font-medium">Progress to next rank</span>
                      <span className="text-amber-600 font-bold">73%</span>
                    </div>
                    <div className="w-full h-2.5 bg-amber-200/60 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-1000 ease-out"
                        style={{ width: '73%' }}
                      />
                    </div>
                    <p className="text-xs text-amber-600/80 mt-1.5">
                      3 more {catMeta.unit} to reach Rank #11
                    </p>
                  </div>

                  {/* category-specific tip */}
                  <div className="flex items-start gap-2 bg-white/60 rounded-xl p-3 border border-amber-200/40">
                    <Zap className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-amber-800">{catMeta.tip}</p>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
