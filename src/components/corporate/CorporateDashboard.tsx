import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Building2,
    Users,
    Car,
    TrendingUp,
    TrendingDown,
    Leaf,
    DollarSign,
    Calendar,
    Clock,
    MapPin,
    Download,
    RefreshCw,
    Filter,
    ChevronRight,
    Award,
    Target,
    BarChart3,
} from 'lucide-react';
import { corporateService, Company, CommuteReport } from '../../services/corporateService';
import { useAuth } from '../../contexts/AuthContext';

interface CorporateDashboardProps {
    companyId: string;
}

export function CorporateDashboard({ companyId }: CorporateDashboardProps) {
    const { user } = useAuth();
    const [company, setCompany] = useState<Company | null>(null);
    const [report, setReport] = useState<CommuteReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [reportPeriod, setReportPeriod] = useState<'week' | 'month' | 'quarter'>('month');

    useEffect(() => {
        loadData();
    }, [companyId, reportPeriod]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [companyData, reportData] = await Promise.all([
                corporateService.getCompany(companyId),
                corporateService.generateCommuteReport(companyId, reportPeriod),
            ]);
            setCompany(companyData);
            setReport(reportData);
        } catch (error) {
            console.error('Failed to load dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExportReport = async () => {
        // Export logic
        console.log('Exporting report...');
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="animate-pulse">
                    <div className="h-32 bg-gray-200 rounded-2xl mb-4" />
                    <div className="grid grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="h-24 bg-gray-200 rounded-xl" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (!company) {
        return (
            <div className="text-center py-12">
                <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900">Company Not Found</h3>
                <p className="text-gray-500">Unable to load company data.</p>
            </div>
        );
    }

    const stats = report?.stats || {
        totalTrips: 0,
        totalEmployeesParticipating: 0,
        participationRate: 0,
        co2Saved: 0,
        costSaved: 0,
        subsidyUsed: 0,
        averageOccupancy: 0,
        topRoutes: [],
        departmentBreakdown: [],
    };

    return (
        <div className="space-y-6">
            {/* Company Header */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-6 text-white relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 w-64 h-64 opacity-10">
                    <Building2 className="w-full h-full" />
                </div>

                <div className="relative z-10 flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        {company.logo ? (
                            <img
                                src={company.logo}
                                alt={company.name}
                                className="w-16 h-16 rounded-xl bg-white/20 p-2 object-contain"
                            />
                        ) : (
                            <div className="w-16 h-16 rounded-xl bg-white/20 flex items-center justify-center">
                                <Building2 className="w-8 h-8" />
                            </div>
                        )}
                        <div>
                            <h1 className="text-2xl font-bold">{company.name}</h1>
                            <p className="text-white/80 flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                {company.address}
                            </p>
                            <p className="text-white/60 text-sm mt-1">
                                {company.employeeCount} employees • {company.activePoolsCount} active pools
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={handleExportReport}
                            className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors text-sm font-medium"
                        >
                            <Download className="w-4 h-4" />
                            Export
                        </button>
                        <button
                            onClick={loadData}
                            className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* Period Selector */}
            <div className="flex items-center justify-between">
                <div className="flex gap-2 bg-gray-100 rounded-xl p-1">
                    {(['week', 'month', 'quarter'] as const).map((period) => (
                        <button
                            key={period}
                            onClick={() => setReportPeriod(period)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${reportPeriod === period
                                    ? 'bg-white text-gray-900 shadow'
                                    : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            {period === 'week' ? 'This Week' : period === 'month' ? 'This Month' : 'This Quarter'}
                        </button>
                    ))}
                </div>

                <p className="text-sm text-gray-500">
                    {report?.startDate && `${new Date(report.startDate).toLocaleDateString()} - ${new Date(report.endDate).toLocaleDateString()}`}
                </p>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    icon={<Car className="w-5 h-5" />}
                    label="Total Trips"
                    value={stats.totalTrips.toLocaleString()}
                    change={12}
                    color="blue"
                />
                <MetricCard
                    icon={<Users className="w-5 h-5" />}
                    label="Participation Rate"
                    value={`${stats.participationRate}%`}
                    change={5}
                    color="green"
                />
                <MetricCard
                    icon={<Leaf className="w-5 h-5" />}
                    label="CO₂ Saved"
                    value={`${stats.co2Saved.toLocaleString()} kg`}
                    change={18}
                    color="emerald"
                />
                <MetricCard
                    icon={<DollarSign className="w-5 h-5" />}
                    label="Cost Saved"
                    value={`£${stats.costSaved.toLocaleString()}`}
                    change={-3}
                    color="purple"
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Department Breakdown */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-2xl border border-gray-200 p-6"
                >
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-indigo-500" />
                            Department Breakdown
                        </h3>
                        <button className="text-sm text-indigo-600 hover:text-indigo-700">View all</button>
                    </div>

                    <div className="space-y-4">
                        {stats.departmentBreakdown.length > 0 ? (
                            stats.departmentBreakdown.slice(0, 5).map((dept, index) => (
                                <div key={dept.department}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-medium text-gray-700">{dept.department}</span>
                                        <span className="text-sm text-gray-500">
                                            {dept.trips} trips • {dept.employees} users
                                        </span>
                                    </div>
                                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(dept.trips / (stats.departmentBreakdown[0]?.trips || 1)) * 100}%` }}
                                            transition={{ delay: 0.2 + index * 0.1 }}
                                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                                        />
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-30" />
                                <p>No department data available</p>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Top Routes */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white rounded-2xl border border-gray-200 p-6"
                >
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-green-500" />
                            Popular Routes
                        </h3>
                        <button className="text-sm text-green-600 hover:text-green-700">View map</button>
                    </div>

                    <div className="space-y-3">
                        {stats.topRoutes.length > 0 ? (
                            stats.topRoutes.slice(0, 5).map((route, index) => (
                                <div
                                    key={route.route}
                                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
                                >
                                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm">
                                        {index + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 truncate">{route.route}</p>
                                        <p className="text-sm text-gray-500">{route.trips} trips</p>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-gray-400" />
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                <MapPin className="w-12 h-12 mx-auto mb-2 opacity-30" />
                                <p>No route data available</p>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* Goals & Achievements */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-6"
            >
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Target className="w-5 h-5 text-amber-600" />
                        Sustainability Goals
                    </h3>
                    <button className="text-sm text-amber-600 hover:text-amber-700">Set goals</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <GoalCard
                        title="Carbon Neutral"
                        current={stats.co2Saved}
                        target={5000}
                        unit="kg CO₂"
                        color="green"
                    />
                    <GoalCard
                        title="Participation Target"
                        current={stats.totalEmployeesParticipating}
                        target={Math.round(company.employeeCount * 0.5)}
                        unit="employees"
                        color="blue"
                    />
                    <GoalCard
                        title="Monthly Rides"
                        current={stats.totalTrips}
                        target={500}
                        unit="rides"
                        color="purple"
                    />
                </div>
            </motion.div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <QuickAction
                    icon={<Users className="w-5 h-5" />}
                    title="Manage Employees"
                    description="View and manage employee accounts"
                    onClick={() => { }}
                />
                <QuickAction
                    icon={<Car className="w-5 h-5" />}
                    title="View All Pools"
                    description="See all active carpool groups"
                    onClick={() => { }}
                />
                <QuickAction
                    icon={<Award className="w-5 h-5" />}
                    title="Recognition Program"
                    description="Reward top carpoolers"
                    onClick={() => { }}
                />
            </div>
        </div>
    );
}

// Helper Components
function MetricCard({
    icon,
    label,
    value,
    change,
    color,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    change: number;
    color: string;
}) {
    const isPositive = change >= 0;
    const colorClasses = {
        blue: 'from-blue-500 to-blue-600',
        green: 'from-green-500 to-green-600',
        emerald: 'from-emerald-500 to-emerald-600',
        purple: 'from-purple-500 to-purple-600',
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl border border-gray-200 p-4"
        >
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses]} text-white flex items-center justify-center mb-3`}>
                {icon}
            </div>
            <p className="text-sm text-gray-500 mb-1">{label}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <div className={`flex items-center gap-1 mt-2 text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {Math.abs(change)}% vs last period
            </div>
        </motion.div>
    );
}

function GoalCard({
    title,
    current,
    target,
    unit,
    color,
}: {
    title: string;
    current: number;
    target: number;
    unit: string;
    color: string;
}) {
    const progress = Math.min(100, Math.round((current / target) * 100));
    const colorClasses = {
        green: 'from-green-500 to-emerald-500',
        blue: 'from-blue-500 to-indigo-500',
        purple: 'from-purple-500 to-pink-500',
    };

    return (
        <div className="bg-white rounded-xl p-4">
            <p className="font-medium text-gray-900 mb-2">{title}</p>
            <div className="flex items-baseline gap-1 mb-2">
                <span className="text-2xl font-bold text-gray-900">{current.toLocaleString()}</span>
                <span className="text-gray-500">/ {target.toLocaleString()} {unit}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className={`h-full bg-gradient-to-r ${colorClasses[color as keyof typeof colorClasses]} rounded-full`}
                />
            </div>
            <p className="text-sm text-gray-500 mt-2">{progress}% complete</p>
        </div>
    );
}

function QuickAction({
    icon,
    title,
    description,
    onClick,
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all text-left group"
        >
            <div className="p-3 bg-gray-100 rounded-lg text-gray-600 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                {icon}
            </div>
            <div className="flex-1">
                <p className="font-medium text-gray-900">{title}</p>
                <p className="text-sm text-gray-500">{description}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
        </button>
    );
}
