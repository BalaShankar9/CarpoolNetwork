import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Building2, Users, Car, MapPin, Clock, ChevronRight,
  Plus, Calendar, TrendingUp, Leaf
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { corporateService, Company, CompanyPool } from '@/services/corporateService';
import { Link } from 'react-router-dom';

export function CompanyDashboard() {
  const { user } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [pools, setPools] = useState<CompanyPool[]>([]);
  const [userRole, setUserRole] = useState<string>('employee');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      try {
        const companyData = await corporateService.getUserCompany(user.id);
        if (companyData) {
          setCompany(companyData.company);
          setUserRole(companyData.role);
          
          const companyPools = await corporateService.getCompanyPools(companyData.company.id);
          setPools(companyPools);
        }
      } catch (error) {
        console.error('Failed to fetch company data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-700 rounded w-1/3"></div>
          <div className="h-24 bg-slate-700 rounded-xl"></div>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-slate-700 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-6 text-center">
        <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <h3 className="font-semibold text-white mb-2">Join Your Company</h3>
        <p className="text-sm text-slate-400 mb-4">
          Connect with your work email to access company carpools and commute benefits.
        </p>
        <Link
          to="/settings?section=company"
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Connect Company
        </Link>
      </div>
    );
  }

  const getDayName = (day: number) => {
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day];
  };

  return (
    <div className="space-y-6">
      {/* Company Header */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-slate-700/50 overflow-hidden">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-6">
            {company.logo ? (
              <img
                src={company.logo}
                alt={company.name}
                className="w-16 h-16 rounded-xl object-cover"
              />
            ) : (
              <div className="w-16 h-16 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                <Building2 className="w-8 h-8 text-emerald-400" />
              </div>
            )}
            <div>
              <h2 className="text-2xl font-bold text-white">{company.name}</h2>
              <p className="text-slate-400">{company.address}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-700/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-slate-400">Employees</span>
              </div>
              <div className="text-2xl font-bold text-white">{company.employeeCount}</div>
            </div>
            <div className="bg-slate-700/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Car className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-slate-400">Active Pools</span>
              </div>
              <div className="text-2xl font-bold text-white">{company.activePoolsCount}</div>
            </div>
            <div className="bg-slate-700/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Leaf className="w-4 h-4 text-green-400" />
                <span className="text-sm text-slate-400">CO₂ Saved</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {(company.activePoolsCount * 15).toFixed(0)}kg
              </div>
            </div>
          </div>
        </div>

        {/* Subsidy Info */}
        {company.settings.subsidyEnabled && (
          <div className="px-6 pb-6">
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <div>
                <span className="text-emerald-300 font-medium">
                  £{company.settings.subsidyAmount} subsidy per ride
                </span>
                <span className="text-emerald-400/70 text-sm ml-2">
                  (up to £{company.settings.maxSubsidyPerMonth}/month)
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Active Pools */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50">
        <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
          <h3 className="font-semibold text-white">Company Carpools</h3>
          <Link
            to="/pools/create?company=true"
            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500 text-white text-sm rounded-lg hover:bg-emerald-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Pool
          </Link>
        </div>

        {pools.length === 0 ? (
          <div className="p-8 text-center">
            <Car className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h4 className="font-medium text-white mb-1">No Active Pools</h4>
            <p className="text-sm text-slate-400">
              Be the first to create a carpool for your commute!
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/50">
            {pools.map((pool, index) => (
              <motion.div
                key={pool.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 hover:bg-slate-700/30 transition-colors"
              >
                <Link to={`/pools/${pool.id}`} className="block">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-white">{pool.name}</h4>
                      <p className="text-sm text-slate-400">{pool.description}</p>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="w-4 h-4 text-slate-500" />
                      <span className="text-slate-400">
                        {pool.currentMembers}/{pool.maxMembers}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-slate-400 mb-3">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {pool.origin.split(',')[0]}
                    </div>
                    <ChevronRight className="w-4 h-4" />
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {pool.destination.split(',')[0]}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-sm">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">{pool.departureTime}</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-slate-500">
                      <Calendar className="w-3.5 h-3.5" />
                      {pool.daysOfWeek.map(d => getDayName(d)).join(', ')}
                    </div>
                  </div>

                  {/* Members Preview */}
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {pool.members.slice(0, 4).map((member, i) => (
                        <div
                          key={member.userId}
                          className="w-7 h-7 rounded-full bg-slate-700 border-2 border-slate-800 overflow-hidden"
                        >
                          {member.profile?.avatar ? (
                            <img
                              src={member.profile.avatar}
                              alt={member.profile.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                              {member.profile?.name?.charAt(0) || '?'}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    {pool.members.length > 4 && (
                      <span className="text-xs text-slate-500">
                        +{pool.members.length - 4} more
                      </span>
                    )}
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Admin Section */}
      {(userRole === 'admin' || userRole === 'super_admin') && (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-purple-400" />
            Admin Tools
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/company/employees"
              className="p-4 bg-slate-700/50 rounded-xl hover:bg-slate-700 transition-colors"
            >
              <Users className="w-5 h-5 text-blue-400 mb-2" />
              <div className="text-sm font-medium text-white">Manage Employees</div>
              <div className="text-xs text-slate-400">Approve & manage team</div>
            </Link>
            <Link
              to="/company/reports"
              className="p-4 bg-slate-700/50 rounded-xl hover:bg-slate-700 transition-colors"
            >
              <TrendingUp className="w-5 h-5 text-emerald-400 mb-2" />
              <div className="text-sm font-medium text-white">Commute Reports</div>
              <div className="text-xs text-slate-400">View analytics</div>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default CompanyDashboard;
