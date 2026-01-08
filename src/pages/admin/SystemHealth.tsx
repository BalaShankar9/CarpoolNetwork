import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import {
    Activity,
    Database,
    AlertTriangle,
    CheckCircle,
    Clock,
    HardDrive,
    TrendingUp,
    RefreshCw,
    XCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from '../../lib/toast';

interface DatabaseStats {
    table_name: string;
    row_count: number;
    total_size: string;
    index_size: string;
}

interface SystemPerformance {
    metric: string;
    value: string;
    status: 'good' | 'warning' | 'critical';
}

interface RecentError {
    error_time: string;
    error_type: string;
    error_message: string;
    user_id?: string;
    count: number;
}

interface HealthScore {
    overall_score: number;
    database_health: number;
    performance_health: number;
    error_rate: number;
    status: 'healthy' | 'degraded' | 'critical';
}

export default function SystemHealth() {
    const { isAdmin } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [databaseStats, setDatabaseStats] = useState<DatabaseStats[]>([]);
    const [performance, setPerformance] = useState<SystemPerformance[]>([]);
    const [recentErrors, setRecentErrors] = useState<RecentError[]>([]);
    const [healthScore, setHealthScore] = useState<HealthScore | null>(null);

    useEffect(() => {
        if (!isAdmin) {
            navigate('/admin');
            return;
        }
        loadHealthData();
    }, [isAdmin, navigate]);

    const loadHealthData = async () => {
        if (loading) {
            setLoading(true);
        } else {
            setRefreshing(true);
        }

        try {
            // Load all health data in parallel
            const [dbStatsRes, perfRes, errorsRes, healthRes] = await Promise.all([
                supabase.rpc('get_database_stats'),
                supabase.rpc('get_system_performance'),
                supabase.rpc('get_recent_errors', { hours: 24 }),
                supabase.rpc('get_platform_health_score'),
            ]);

            if (dbStatsRes.error) throw dbStatsRes.error;
            if (perfRes.error) throw perfRes.error;
            if (errorsRes.error) throw errorsRes.error;
            if (healthRes.error) throw healthRes.error;

            setDatabaseStats(dbStatsRes.data || []);
            setPerformance(perfRes.data || []);
            setRecentErrors(errorsRes.data || []);
            setHealthScore(healthRes.data);
        } catch (error: any) {
            console.error('Error loading health data:', error);
            toast.error('Failed to load system health data');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const getHealthColor = (status: string) => {
        switch (status) {
            case 'healthy':
            case 'good':
                return 'text-green-600 bg-green-50 border-green-200';
            case 'degraded':
            case 'warning':
                return 'text-orange-600 bg-orange-50 border-orange-200';
            case 'critical':
                return 'text-red-600 bg-red-50 border-red-200';
            default:
                return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    };

    const getHealthIcon = (status: string) => {
        switch (status) {
            case 'healthy':
            case 'good':
                return <CheckCircle className="w-6 h-6 text-green-600" />;
            case 'degraded':
            case 'warning':
                return <AlertTriangle className="w-6 h-6 text-orange-600" />;
            case 'critical':
                return <XCircle className="w-6 h-6 text-red-600" />;
            default:
                return <Activity className="w-6 h-6 text-gray-600" />;
        }
    };

    if (!isAdmin) return null;

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <AdminLayout
            title="System Health"
            subtitle="Monitor platform performance and system status"
            actions={
                <button
                    onClick={loadHealthData}
                    disabled={refreshing}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium disabled:opacity-50"
                >
                    <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            }
        >
            <div className="space-y-6">
                {/* Health Score Overview */}
                {healthScore && (
                    <div className={`rounded-xl border-2 p-6 ${getHealthColor(healthScore.status)}`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                {getHealthIcon(healthScore.status)}
                                <div>
                                    <h3 className="text-lg font-bold">System Status: {healthScore.status.toUpperCase()}</h3>
                                    <p className="text-sm opacity-80">Overall health score: {healthScore.overall_score}%</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-3xl font-bold">{healthScore.overall_score}%</div>
                                <div className="text-xs opacity-70">Health Score</div>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 mt-4">
                            <div>
                                <div className="text-sm opacity-70">Database Health</div>
                                <div className="text-xl font-semibold">{healthScore.database_health}%</div>
                            </div>
                            <div>
                                <div className="text-sm opacity-70">Performance Health</div>
                                <div className="text-xl font-semibold">{healthScore.performance_health}%</div>
                            </div>
                            <div>
                                <div className="text-sm opacity-70">Error Rate</div>
                                <div className="text-xl font-semibold">{healthScore.error_rate.toFixed(2)}%</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* System Performance Metrics */}
                <div className="bg-white rounded-xl border border-gray-200">
                    <div className="border-b border-gray-200 p-6">
                        <div className="flex items-center gap-3">
                            <TrendingUp className="w-6 h-6 text-blue-600" />
                            <h2 className="text-xl font-bold text-gray-900">Performance Metrics</h2>
                        </div>
                    </div>
                    <div className="p-6">
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {performance.map((metric, index) => (
                                <div
                                    key={index}
                                    className={`rounded-lg border-2 p-4 ${getHealthColor(metric.status)}`}
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        {getHealthIcon(metric.status)}
                                        <div className="text-sm font-medium opacity-80">{metric.metric}</div>
                                    </div>
                                    <div className="text-2xl font-bold">{metric.value}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Database Statistics */}
                <div className="bg-white rounded-xl border border-gray-200">
                    <div className="border-b border-gray-200 p-6">
                        <div className="flex items-center gap-3">
                            <Database className="w-6 h-6 text-purple-600" />
                            <h2 className="text-xl font-bold text-gray-900">Database Statistics</h2>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Table
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Row Count
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Table Size
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Index Size
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {databaseStats.map((stat, index) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <HardDrive className="w-4 h-4 text-gray-400" />
                                                <span className="font-medium text-gray-900">{stat.table_name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                                            {stat.row_count.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-700">{stat.total_size}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-700">{stat.index_size}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Recent Errors */}
                <div className="bg-white rounded-xl border border-gray-200">
                    <div className="border-b border-gray-200 p-6">
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="w-6 h-6 text-orange-600" />
                            <h2 className="text-xl font-bold text-gray-900">Recent Errors (Last 24 Hours)</h2>
                        </div>
                    </div>
                    <div className="p-6">
                        {recentErrors.length === 0 ? (
                            <div className="text-center py-8">
                                <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
                                <p className="text-gray-600">No errors in the last 24 hours</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {recentErrors.map((error, index) => (
                                    <div
                                        key={index}
                                        className="border border-red-200 rounded-lg p-4 bg-red-50"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <XCircle className="w-5 h-5 text-red-600" />
                                                    <span className="font-semibold text-red-900">{error.error_type}</span>
                                                    <span className="text-xs bg-red-200 text-red-800 px-2 py-0.5 rounded-full">
                                                        {error.count}x
                                                    </span>
                                                </div>
                                                <p className="text-sm text-red-800 mb-2">{error.error_message}</p>
                                                <div className="flex items-center gap-4 text-xs text-red-700">
                                                    <div className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {new Date(error.error_time).toLocaleString()}
                                                    </div>
                                                    {error.user_id && (
                                                        <div>User ID: {error.user_id.slice(0, 8)}...</div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
