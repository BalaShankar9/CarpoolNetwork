import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import {
  Activity,
  CheckCircle,
  XCircle,
  Loader2,
  Copy,
  RefreshCw,
  Database,
  Zap,
  Cloud,
  MapPin,
  User,
  HardDrive,
  Server,
  BarChart3,
  Car,
  LayoutDashboard,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { getRuntimeConfig } from '../../lib/runtimeConfig';

type TestStatus = 'pending' | 'running' | 'pass' | 'fail' | 'warn';

interface TestResult {
  name: string;
  status: TestStatus;
  details?: string;
  error?: string;
  duration?: number;
  category: 'auth' | 'database' | 'realtime' | 'functions' | 'maps' | 'storage';
}

interface DatabaseStats {
  profiles: number;
  rides: number;
  bookings: number;
  messages: number;
  vehicles: number;
  bug_reports: number;
}

export default function Diagnostics() {
  const { user, session, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [results, setResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [dbStats, setDbStats] = useState<DatabaseStats | null>(null);
  const [mapsApiConfigured, setMapsApiConfigured] = useState<boolean | null>(null);
  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
  }, [isAdmin, navigate]);

  useEffect(() => {
    let active = true;

    getRuntimeConfig()
      .then((config) => {
        if (active) {
          setMapsApiConfigured(Boolean(config.mapsApiKey));
        }
      })
      .catch(() => {
        if (active) {
          setMapsApiConfigured(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const updateResult = (name: string, update: Partial<TestResult>) => {
    setResults(prev => prev.map(r => r.name === name ? { ...r, ...update } : r));
  };

  const waitForGoogleMaps = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof google !== 'undefined' && google.maps) {
        resolve(true);
        return;
      }

      let attempts = 0;
      const maxAttempts = 50;
      const interval = setInterval(() => {
        attempts++;
        if (typeof google !== 'undefined' && google.maps) {
          clearInterval(interval);
          resolve(true);
        } else if (attempts >= maxAttempts) {
          clearInterval(interval);
          resolve(false);
        }
      }, 100);
    });
  };

  const runAllTests = async () => {
    setRunning(true);
    setResults([
      { name: 'Supabase Session', status: 'pending', category: 'auth' },
      { name: 'Database Connection', status: 'pending', category: 'database' },
      { name: 'Database Read (profiles)', status: 'pending', category: 'database' },
      { name: 'Database Write Test', status: 'pending', category: 'database' },
      { name: 'Database Statistics', status: 'pending', category: 'database' },
      { name: 'Storage Buckets', status: 'pending', category: 'storage' },
      { name: 'Realtime Subscription', status: 'pending', category: 'realtime' },
      { name: 'Netlify Function (gemini)', status: 'pending', category: 'functions' },
      { name: 'Edge Function (vehicle-lookup)', status: 'pending', category: 'functions' },
      { name: 'Google Maps Script', status: 'pending', category: 'maps' },
      { name: 'Places Autocomplete', status: 'pending', category: 'maps' },
    ]);

    await testSupabaseSession();
    await testDatabaseConnection();
    await testDatabaseRead();
    await testDatabaseWrite();
    await testDatabaseStats();
    await testStorageBuckets();
    await testRealtimeSubscription();
    await testGeminiFunction();
    await testVehicleLookup();
    await testGoogleMapsScript();
    await testPlacesAutocomplete();

    setRunning(false);
  };

  const testSupabaseSession = async () => {
    const testName = 'Supabase Session';
    updateResult(testName, { status: 'running' });
    const start = Date.now();

    try {
      const { data, error } = await supabase.auth.getSession();

      if (error) throw error;
      if (!data.session) throw new Error('No active session');

      const expiresAt = data.session.expires_at;
      const expiresDate = expiresAt ? new Date(expiresAt * 1000).toLocaleString() : 'Unknown';
      const timeLeft = expiresAt ? Math.round((expiresAt * 1000 - Date.now()) / 60000) : 0;

      updateResult(testName, {
        status: 'pass',
        details: `User: ${data.session.user.email}, Expires in ${timeLeft} minutes`,
        duration: Date.now() - start,
      });
    } catch (err) {
      updateResult(testName, {
        status: 'fail',
        error: err instanceof Error ? err.message : 'Unknown error',
        duration: Date.now() - start,
      });
    }
  };

  const testDatabaseConnection = async () => {
    const testName = 'Database Connection';
    updateResult(testName, { status: 'running' });
    const start = Date.now();

    try {
      const { error } = await supabase.from('profiles').select('id').limit(1);

      if (error) throw error;

      updateResult(testName, {
        status: 'pass',
        details: `Connected to ${import.meta.env.VITE_SUPABASE_URL}`,
        duration: Date.now() - start,
      });
    } catch (err) {
      updateResult(testName, {
        status: 'fail',
        error: err instanceof Error ? err.message : 'Unknown error',
        duration: Date.now() - start,
      });
    }
  };

  const testDatabaseRead = async () => {
    const testName = 'Database Read (profiles)';
    updateResult(testName, { status: 'running' });
    const start = Date.now();

    try {
      const { data, error, count } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: false })
        .limit(1);

      if (error) throw error;

      updateResult(testName, {
        status: 'pass',
        details: `Read successful, total profiles: ${count ?? 'unknown'}`,
        duration: Date.now() - start,
      });
    } catch (err) {
      updateResult(testName, {
        status: 'fail',
        error: err instanceof Error ? err.message : 'Unknown error',
        duration: Date.now() - start,
      });
    }
  };

  const testDatabaseWrite = async () => {
    const testName = 'Database Write Test';
    updateResult(testName, { status: 'running' });
    const start = Date.now();

    try {
      const testText = `[DIAGNOSTIC TEST] ${new Date().toISOString()}`;

      const { data, error } = await supabase
        .from('bug_reports')
        .insert({
          user_id: user?.id,
          text: testText,
          page: '/admin/diagnostics',
        })
        .select('id')
        .single();

      if (error) throw error;

      const { error: deleteError } = await supabase
        .from('bug_reports')
        .delete()
        .eq('id', data.id);

      if (deleteError) {
        updateResult(testName, {
          status: 'warn',
          details: `Write OK, cleanup failed: ${deleteError.message}`,
          duration: Date.now() - start,
        });
      } else {
        updateResult(testName, {
          status: 'pass',
          details: 'Insert and delete operations successful',
          duration: Date.now() - start,
        });
      }
    } catch (err) {
      updateResult(testName, {
        status: 'fail',
        error: err instanceof Error ? err.message : 'Unknown error',
        duration: Date.now() - start,
      });
    }
  };

  const testDatabaseStats = async () => {
    const testName = 'Database Statistics';
    updateResult(testName, { status: 'running' });
    const start = Date.now();

    try {
      const [profiles, rides, bookings, messages, vehicles, bug_reports] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('rides').select('id', { count: 'exact', head: true }),
        supabase.from('ride_bookings').select('id', { count: 'exact', head: true }),
        supabase.from('chat_messages').select('id', { count: 'exact', head: true }),
        supabase.from('vehicles').select('id', { count: 'exact', head: true }),
        supabase.from('bug_reports').select('id', { count: 'exact', head: true }),
      ]);

      const stats: DatabaseStats = {
        profiles: profiles.count || 0,
        rides: rides.count || 0,
        bookings: bookings.count || 0,
        messages: messages.count || 0,
        vehicles: vehicles.count || 0,
        bug_reports: bug_reports.count || 0,
      };

      setDbStats(stats);

      updateResult(testName, {
        status: 'pass',
        details: `Users: ${stats.profiles}, Rides: ${stats.rides}, Bookings: ${stats.bookings}`,
        duration: Date.now() - start,
      });
    } catch (err) {
      updateResult(testName, {
        status: 'fail',
        error: err instanceof Error ? err.message : 'Unknown error',
        duration: Date.now() - start,
      });
    }
  };

  const testStorageBuckets = async () => {
    const testName = 'Storage Buckets';
    updateResult(testName, { status: 'running' });
    const start = Date.now();

    try {
      const { data, error } = await supabase.storage.listBuckets();

      if (error) throw error;

      const bucketNames = data?.map(b => b.name).join(', ') || 'none';

      updateResult(testName, {
        status: data && data.length > 0 ? 'pass' : 'warn',
        details: `Buckets: ${bucketNames}`,
        duration: Date.now() - start,
      });
    } catch (err) {
      updateResult(testName, {
        status: 'fail',
        error: err instanceof Error ? err.message : 'Unknown error',
        duration: Date.now() - start,
      });
    }
  };

  const testRealtimeSubscription = async () => {
    const testName = 'Realtime Subscription';
    updateResult(testName, { status: 'running' });
    const start = Date.now();

    return new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        if (realtimeChannelRef.current) {
          supabase.removeChannel(realtimeChannelRef.current);
        }
        updateResult(testName, {
          status: 'fail',
          error: 'Subscription timeout (5s) - channel may not be enabled',
          duration: Date.now() - start,
        });
        resolve();
      }, 5000);

      const channel = supabase
        .channel('diagnostics-test')
        .on('presence', { event: 'sync' }, () => {
          clearTimeout(timeout);
          supabase.removeChannel(channel);
          updateResult(testName, {
            status: 'pass',
            details: 'Realtime connection established via presence',
            duration: Date.now() - start,
          });
          resolve();
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            channel.track({ user_id: user?.id, online_at: new Date().toISOString() });
          }
          if (status === 'CHANNEL_ERROR') {
            clearTimeout(timeout);
            supabase.removeChannel(channel);
            updateResult(testName, {
              status: 'fail',
              error: 'Channel subscription error',
              duration: Date.now() - start,
            });
            resolve();
          }
        });

      realtimeChannelRef.current = channel;
    });
  };

  const testGeminiFunction = async () => {
    const testName = 'Netlify Function (ai-router)';
    updateResult(testName, { status: 'running' });
    const start = Date.now();

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const token = sessionData.session?.access_token;
      if (!token) {
        throw new Error('No access token available for AI function test');
      }

      const response = await fetch('/.netlify/functions/ai-router', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: 'Reply with only the word "OK".',
          conversationId: 'diagnostics',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!data.reply) {
        throw new Error('No reply in response');
      }

      updateResult(testName, {
        status: 'pass',
        details: `AI responded: "${data.reply.substring(0, 30)}${data.reply.length > 30 ? '...' : ''}"`,
        duration: Date.now() - start,
      });
    } catch (err) {
      updateResult(testName, {
        status: 'fail',
        error: err instanceof Error ? err.message : 'Unknown error',
        duration: Date.now() - start,
      });
    }
  };

  const testVehicleLookup = async () => {
    const testName = 'Edge Function (vehicle-lookup)';
    updateResult(testName, { status: 'running' });
    const start = Date.now();

    try {
      if (!session?.access_token) {
        throw new Error('No access token available');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vehicle-lookup`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ registrationNumber: 'TEST123' }),
        }
      );

      const isReachable = response.status === 200 || response.status === 400 || response.status === 404;

      updateResult(testName, {
        status: isReachable ? 'pass' : 'fail',
        details: isReachable ? 'Function reachable and responding' : `HTTP ${response.status}`,
        duration: Date.now() - start,
      });
    } catch (err) {
      updateResult(testName, {
        status: 'fail',
        error: err instanceof Error ? err.message : 'Unknown error',
        duration: Date.now() - start,
      });
    }
  };

  const testGoogleMapsScript = async () => {
    const testName = 'Google Maps Script';
    updateResult(testName, { status: 'running' });
    const start = Date.now();

    try {
      const loaded = await waitForGoogleMaps();

      if (!loaded) {
        throw new Error('Google Maps script not loaded after 5s');
      }

      const version = google.maps.version || 'unknown';
      const hasPlaces = typeof google.maps.places !== 'undefined';
      const hasGeocoder = typeof google.maps.Geocoder !== 'undefined';

      updateResult(testName, {
        status: 'pass',
        details: `Version: ${version}, Places: ${hasPlaces ? 'Yes' : 'No'}, Geocoder: ${hasGeocoder ? 'Yes' : 'No'}`,
        duration: Date.now() - start,
      });
    } catch (err) {
      updateResult(testName, {
        status: 'fail',
        error: err instanceof Error ? err.message : 'Unknown error',
        duration: Date.now() - start,
      });
    }
  };

  const testPlacesAutocomplete = async () => {
    const testName = 'Places Autocomplete';
    updateResult(testName, { status: 'running' });
    const start = Date.now();

    try {
      const loaded = await waitForGoogleMaps();

      if (!loaded || !google.maps?.places) {
        throw new Error('Google Maps Places library not loaded');
      }

      const testDiv = document.createElement('div');
      testDiv.style.display = 'none';
      document.body.appendChild(testDiv);

      const input = document.createElement('input');
      testDiv.appendChild(input);

      const autocomplete = new google.maps.places.Autocomplete(input, {
        componentRestrictions: { country: 'gb' },
        fields: ['place_id', 'formatted_address'],
      });

      if (!autocomplete) {
        throw new Error('Failed to create Autocomplete instance');
      }

      document.body.removeChild(testDiv);

      updateResult(testName, {
        status: 'pass',
        details: 'Autocomplete instance created successfully (UK restricted)',
        duration: Date.now() - start,
      });
    } catch (err) {
      updateResult(testName, {
        status: 'fail',
        error: err instanceof Error ? err.message : 'Unknown error',
        duration: Date.now() - start,
      });
    }
  };

  const generateReport = () => {
    const timestamp = new Date().toISOString();
    const passCount = results.filter(r => r.status === 'pass').length;
    const failCount = results.filter(r => r.status === 'fail').length;
    const warnCount = results.filter(r => r.status === 'warn').length;

    let report = `Carpool Network Diagnostics Report\n`;
    report += `Generated: ${timestamp}\n`;
    report += `User: ${user?.email}\n`;
    report += `Environment: ${import.meta.env.MODE}\n`;
    report += `\nSummary: ${passCount} PASS, ${warnCount} WARN, ${failCount} FAIL\n`;
    report += `${'='.repeat(50)}\n\n`;

    const categories = ['auth', 'database', 'storage', 'realtime', 'functions', 'maps'];
    categories.forEach(cat => {
      const categoryResults = results.filter(r => r.category === cat);
      if (categoryResults.length > 0) {
        report += `[${cat.toUpperCase()}]\n`;
        categoryResults.forEach(result => {
          const icon = result.status === 'pass' ? '[PASS]' : result.status === 'warn' ? '[WARN]' : result.status === 'fail' ? '[FAIL]' : '[----]';
          report += `  ${icon} ${result.name}\n`;
          if (result.duration) report += `         Duration: ${result.duration}ms\n`;
          if (result.details) report += `         Details: ${result.details}\n`;
          if (result.error) report += `         Error: ${result.error}\n`;
        });
        report += '\n';
      }
    });

    if (dbStats) {
      report += `[DATABASE STATISTICS]\n`;
      report += `  Users: ${dbStats.profiles}\n`;
      report += `  Rides: ${dbStats.rides}\n`;
      report += `  Bookings: ${dbStats.bookings}\n`;
      report += `  Messages: ${dbStats.messages}\n`;
      report += `  Vehicles: ${dbStats.vehicles}\n`;
      report += `  Bug Reports: ${dbStats.bug_reports}\n\n`;
    }

    report += `${'='.repeat(50)}\n`;
    report += `Supabase URL: ${import.meta.env.VITE_SUPABASE_URL}\n`;
    const mapsStatus = mapsApiConfigured === null
      ? 'UNKNOWN'
      : mapsApiConfigured
        ? 'Configured'
        : 'NOT CONFIGURED';
    report += `Google Maps API: ${mapsStatus}\n`;
    report += `Beta Mode: ${import.meta.env.VITE_BETA_MODE}\n`;

    return report;
  };

  const copyReport = async () => {
    const report = generateReport();
    await navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusIcon = (status: TestStatus) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warn':
        return <CheckCircle className="w-5 h-5 text-yellow-500" />;
      case 'fail':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'running':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-gray-300" />;
    }
  };

  const getTestIcon = (name: string) => {
    if (name.includes('Session')) return <User className="w-4 h-4" />;
    if (name.includes('Database') || name.includes('Statistics')) return <Database className="w-4 h-4" />;
    if (name.includes('Storage')) return <HardDrive className="w-4 h-4" />;
    if (name.includes('Realtime')) return <Zap className="w-4 h-4" />;
    if (name.includes('Edge') || name.includes('Function')) return <Cloud className="w-4 h-4" />;
    if (name.includes('Maps') || name.includes('Places')) return <MapPin className="w-4 h-4" />;
    if (name.includes('vehicle')) return <Car className="w-4 h-4" />;
    return <Activity className="w-4 h-4" />;
  };

  const getCategoryColor = (category: TestResult['category']) => {
    const colors = {
      auth: 'border-l-blue-500',
      database: 'border-l-green-500',
      storage: 'border-l-orange-500',
      realtime: 'border-l-yellow-500',
      functions: 'border-l-teal-500',
      maps: 'border-l-red-500',
    };
    return colors[category] || 'border-l-gray-500';
  };

  if (!isAdmin) {
    return null;
  }

  const passCount = results.filter(r => r.status === 'pass').length;
  const failCount = results.filter(r => r.status === 'fail').length;
  const warnCount = results.filter(r => r.status === 'warn').length;

  return (
    <AdminLayout
      title="System Diagnostics"
      subtitle="Comprehensive health checks for all system components"
      actions={
        <div className="flex items-center gap-3 flex-wrap">
          {results.length > 0 && (
            <button
              onClick={copyReport}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <Copy className="w-4 h-4" />
              {copied ? 'Copied!' : 'Copy Report'}
            </button>
          )}
          <button
            onClick={runAllTests}
            disabled={running}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {running ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Run All Tests
              </>
            )}
          </button>
        </div>
      }
    >

      {results.length > 0 && (
        <div className="mb-6 flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="font-medium text-green-700">{passCount} Pass</span>
          </div>
          {warnCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-yellow-500" />
              <span className="font-medium text-yellow-700">{warnCount} Warn</span>
            </div>
          )}
          <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg">
            <XCircle className="w-5 h-5 text-red-500" />
            <span className="font-medium text-red-700">{failCount} Fail</span>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Test Results</h2>
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
            <span className="w-3 h-3 rounded-full bg-blue-500"></span> Auth
            <span className="w-3 h-3 rounded-full bg-green-500 ml-2"></span> Database
            <span className="w-3 h-3 rounded-full bg-orange-500 ml-2"></span> Storage
            <span className="w-3 h-3 rounded-full bg-teal-500 ml-2"></span> Functions
            <span className="w-3 h-3 rounded-full bg-red-500 ml-2"></span> Maps
          </div>
        </div>

        {results.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium text-gray-600">No tests run yet</p>
            <p className="text-sm mt-1">Click "Run All Tests" to start diagnostics</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {results.map((result) => (
              <div
                key={result.name}
                className={`px-6 py-4 border-l-4 ${getCategoryColor(result.category)} ${result.status === 'fail' ? 'bg-red-50' : result.status === 'warn' ? 'bg-yellow-50' : ''
                  }`}
              >
                <div className="flex items-center gap-4">
                  {getStatusIcon(result.status)}
                  <div className="flex items-center gap-2 text-gray-500">
                    {getTestIcon(result.name)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-gray-900">{result.name}</span>
                      {result.duration && (
                        <span className="text-xs text-gray-400">{result.duration}ms</span>
                      )}
                    </div>
                    {result.details && (
                      <p className="text-sm text-gray-600 mt-1">{result.details}</p>
                    )}
                    {result.error && (
                      <p className="text-sm text-red-600 mt-1 font-mono bg-red-100 px-2 py-1 rounded break-words">
                        {result.error}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {dbStats && (
        <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Database Statistics</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: 'Users', value: dbStats.profiles, icon: User },
              { label: 'Rides', value: dbStats.rides, icon: Car },
              { label: 'Bookings', value: dbStats.bookings, icon: Server },
              { label: 'Messages', value: dbStats.messages, icon: Activity },
              { label: 'Vehicles', value: dbStats.vehicles, icon: Car },
              { label: 'Feedback', value: dbStats.bug_reports, icon: Activity },
            ].map(stat => (
              <div key={stat.label} className="bg-gray-50 rounded-lg p-4 text-center">
                <stat.icon className="w-5 h-5 text-gray-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Environment Configuration</h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-3">
            <div>
              <span className="text-gray-500 block mb-1">Supabase URL</span>
              <p className="font-mono text-gray-900 bg-gray-50 px-3 py-2 rounded truncate">
                {import.meta.env.VITE_SUPABASE_URL}
              </p>
            </div>
            <div>
              <span className="text-gray-500 block mb-1">Google Maps API</span>
              <p className="font-mono text-gray-900 bg-gray-50 px-3 py-2 rounded">
                {mapsApiConfigured === null
                  ? 'UNKNOWN'
                  : mapsApiConfigured
                    ? 'Configured'
                    : 'NOT CONFIGURED'}
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <span className="text-gray-500 block mb-1">Environment</span>
              <p className="font-mono text-gray-900 bg-gray-50 px-3 py-2 rounded">
                {import.meta.env.MODE} {import.meta.env.VITE_BETA_MODE === 'true' && '(Beta)'}
              </p>
            </div>
            <div>
              <span className="text-gray-500 block mb-1">Admin Email</span>
              <p className="font-mono text-gray-900 bg-gray-50 px-3 py-2 rounded">
                {import.meta.env.VITE_ADMIN_EMAIL || 'Not configured'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
