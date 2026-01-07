import { supabase } from '@/lib/supabase';

// Types
export interface SafetyIncident {
  id: string;
  type: 'sos_alert' | 'safety_report' | 'dispute' | 'ban' | 'suspension' | 'route_deviation' | 'missed_checkin';
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  rideId?: string;
  description: string;
  metadata: Record<string, unknown>;
  resolvedAt?: Date;
  createdAt: Date;
}

export interface SafetyMetrics {
  totalIncidents: number;
  incidentsByType: Record<string, number>;
  incidentsBySeverity: Record<string, number>;
  averageResolutionTime: number; // in hours
  activeAlerts: number;
  resolvedThisWeek: number;
  trendsComparison: {
    current: number;
    previous: number;
    percentChange: number;
  };
}

export interface UserRiskAssessment {
  userId: string;
  riskScore: number; // 0-100, higher = riskier
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: RiskFactor[];
  lastAssessed: Date;
  recommendations: string[];
}

export interface RiskFactor {
  name: string;
  weight: number;
  score: number;
  description: string;
}

export interface SafetyTrend {
  date: string;
  incidents: number;
  resolved: number;
  sosAlerts: number;
  reports: number;
}

export interface AreaSafetyScore {
  region: string;
  score: number;
  incidentCount: number;
  mostCommonIssue: string;
  trend: 'improving' | 'stable' | 'declining';
}

// Safety Analytics Service
export const safetyAnalyticsService = {
  // Incident Tracking
  async recordIncident(
    incident: Omit<SafetyIncident, 'id' | 'createdAt'>
  ): Promise<SafetyIncident> {
    const newIncident: SafetyIncident = {
      ...incident,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };

    try {
      // Persist to database if available
      const { error } = await supabase
        .from('safety_incidents')
        .insert({
          id: newIncident.id,
          type: newIncident.type,
          severity: newIncident.severity,
          user_id: newIncident.userId,
          ride_id: newIncident.rideId,
          description: newIncident.description,
          metadata: newIncident.metadata,
          created_at: newIncident.createdAt.toISOString(),
        });

      if (error) {
        console.warn('Failed to persist incident, using local storage:', error);
        this.storeIncidentLocally(newIncident);
      }
    } catch (error) {
      console.warn('Database unavailable, storing locally:', error);
      this.storeIncidentLocally(newIncident);
    }

    // Send alerts for high severity incidents
    if (incident.severity === 'critical' || incident.severity === 'high') {
      await this.triggerAlerts(newIncident);
    }

    return newIncident;
  },

  async resolveIncident(incidentId: string): Promise<void> {
    try {
      await supabase
        .from('safety_incidents')
        .update({ resolved_at: new Date().toISOString() })
        .eq('id', incidentId);
    } catch (error) {
      console.error('Failed to resolve incident:', error);
    }
  },

  storeIncidentLocally(incident: SafetyIncident): void {
    const key = 'safety_incidents';
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    existing.push(incident);
    localStorage.setItem(key, JSON.stringify(existing.slice(-1000))); // Keep last 1000
  },

  async triggerAlerts(incident: SafetyIncident): Promise<void> {
    console.log('Triggering alert for incident:', incident.id, incident.severity);
    // In production, this would send notifications to admins, trigger SMS, etc.
  },

  // Metrics & Analytics
  async getSafetyMetrics(timeRange: '24h' | '7d' | '30d' | '90d' = '7d'): Promise<SafetyMetrics> {
    const now = new Date();
    const rangeMap = {
      '24h': 1,
      '7d': 7,
      '30d': 30,
      '90d': 90,
    };
    const days = rangeMap[timeRange];
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const previousStart = new Date(startDate.getTime() - days * 24 * 60 * 60 * 1000);

    try {
      // Current period incidents
      const { data: currentIncidents, error } = await supabase
        .from('safety_incidents')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Previous period for comparison
      const { data: previousIncidents } = await supabase
        .from('safety_incidents')
        .select('id')
        .gte('created_at', previousStart.toISOString())
        .lt('created_at', startDate.toISOString());

      const incidents = currentIncidents || [];
      const prevCount = previousIncidents?.length || 0;

      // Calculate metrics
      const incidentsByType: Record<string, number> = {};
      const incidentsBySeverity: Record<string, number> = {};
      let totalResolutionTime = 0;
      let resolvedCount = 0;

      incidents.forEach((incident: any) => {
        // By type
        incidentsByType[incident.type] = (incidentsByType[incident.type] || 0) + 1;

        // By severity
        incidentsBySeverity[incident.severity] =
          (incidentsBySeverity[incident.severity] || 0) + 1;

        // Resolution time
        if (incident.resolved_at) {
          const created = new Date(incident.created_at).getTime();
          const resolved = new Date(incident.resolved_at).getTime();
          totalResolutionTime += (resolved - created) / (1000 * 60 * 60); // hours
          resolvedCount++;
        }
      });

      const percentChange =
        prevCount > 0
          ? ((incidents.length - prevCount) / prevCount) * 100
          : incidents.length > 0
          ? 100
          : 0;

      return {
        totalIncidents: incidents.length,
        incidentsByType,
        incidentsBySeverity,
        averageResolutionTime: resolvedCount > 0 ? totalResolutionTime / resolvedCount : 0,
        activeAlerts: incidents.filter((i: any) => !i.resolved_at).length,
        resolvedThisWeek: resolvedCount,
        trendsComparison: {
          current: incidents.length,
          previous: prevCount,
          percentChange,
        },
      };
    } catch (error) {
      console.error('Failed to get safety metrics:', error);
      return this.getMockMetrics();
    }
  },

  getMockMetrics(): SafetyMetrics {
    return {
      totalIncidents: 47,
      incidentsByType: {
        sos_alert: 3,
        safety_report: 18,
        dispute: 15,
        ban: 2,
        suspension: 5,
        route_deviation: 3,
        missed_checkin: 1,
      },
      incidentsBySeverity: {
        low: 20,
        medium: 18,
        high: 7,
        critical: 2,
      },
      averageResolutionTime: 4.5,
      activeAlerts: 8,
      resolvedThisWeek: 39,
      trendsComparison: {
        current: 47,
        previous: 52,
        percentChange: -9.6,
      },
    };
  },

  // User Risk Assessment
  async assessUserRisk(userId: string): Promise<UserRiskAssessment> {
    try {
      // Gather data for risk assessment
      const [
        { data: incidents },
        { data: reports },
        { data: disputes },
        { data: warnings },
      ] = await Promise.all([
        supabase
          .from('safety_incidents')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('user_reports')
          .select('*')
          .eq('reported_user_id', userId)
          .eq('status', 'resolved'),
        supabase
          .from('disputes')
          .select('*')
          .or(`filed_by.eq.${userId},against_user.eq.${userId}`),
        supabase
          .from('user_warnings')
          .select('*')
          .eq('user_id', userId),
      ]);

      // Calculate risk factors
      const factors: RiskFactor[] = [];

      // Factor 1: Recent incidents
      const recentIncidents = incidents?.filter(
        (i: any) =>
          new Date(i.created_at) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      );
      const incidentScore = Math.min((recentIncidents?.length || 0) * 15, 100);
      factors.push({
        name: 'Recent Incidents',
        weight: 0.3,
        score: incidentScore,
        description: `${recentIncidents?.length || 0} incidents in last 90 days`,
      });

      // Factor 2: Reports against user
      const reportScore = Math.min((reports?.length || 0) * 10, 100);
      factors.push({
        name: 'User Reports',
        weight: 0.25,
        score: reportScore,
        description: `${reports?.length || 0} resolved reports against user`,
      });

      // Factor 3: Dispute involvement
      const disputeScore = Math.min((disputes?.length || 0) * 8, 100);
      factors.push({
        name: 'Dispute History',
        weight: 0.2,
        score: disputeScore,
        description: `${disputes?.length || 0} disputes involving user`,
      });

      // Factor 4: Warning history
      const warningScore = Math.min((warnings?.length || 0) * 20, 100);
      factors.push({
        name: 'Warnings Received',
        weight: 0.25,
        score: warningScore,
        description: `${warnings?.length || 0} warnings issued`,
      });

      // Calculate overall risk score
      const riskScore = Math.round(
        factors.reduce((sum, f) => sum + f.score * f.weight, 0)
      );

      // Determine risk level
      let riskLevel: UserRiskAssessment['riskLevel'];
      if (riskScore >= 75) {
        riskLevel = 'critical';
      } else if (riskScore >= 50) {
        riskLevel = 'high';
      } else if (riskScore >= 25) {
        riskLevel = 'medium';
      } else {
        riskLevel = 'low';
      }

      // Generate recommendations
      const recommendations: string[] = [];
      if (incidentScore > 30) {
        recommendations.push('Review recent safety incidents');
      }
      if (reportScore > 20) {
        recommendations.push('Consider temporary monitoring period');
      }
      if (warningScore > 40) {
        recommendations.push('Evaluate for potential account restrictions');
      }
      if (riskLevel === 'critical') {
        recommendations.push('Immediate review required by safety team');
      }

      return {
        userId,
        riskScore,
        riskLevel,
        factors,
        lastAssessed: new Date(),
        recommendations:
          recommendations.length > 0
            ? recommendations
            : ['No immediate concerns - continue standard monitoring'],
      };
    } catch (error) {
      console.error('Failed to assess user risk:', error);
      return {
        userId,
        riskScore: 0,
        riskLevel: 'low',
        factors: [],
        lastAssessed: new Date(),
        recommendations: ['Unable to assess - check system status'],
      };
    }
  },

  // Safety Trends
  async getSafetyTrends(days: number = 30): Promise<SafetyTrend[]> {
    const trends: SafetyTrend[] = [];
    const now = new Date();

    try {
      const { data: incidents } = await supabase
        .from('safety_incidents')
        .select('*')
        .gte('created_at', new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString());

      // Group by date
      const byDate: Record<string, SafetyTrend> = {};

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        byDate[dateStr] = {
          date: dateStr,
          incidents: 0,
          resolved: 0,
          sosAlerts: 0,
          reports: 0,
        };
      }

      incidents?.forEach((incident: any) => {
        const dateStr = new Date(incident.created_at).toISOString().split('T')[0];
        if (byDate[dateStr]) {
          byDate[dateStr].incidents++;
          if (incident.resolved_at) byDate[dateStr].resolved++;
          if (incident.type === 'sos_alert') byDate[dateStr].sosAlerts++;
          if (incident.type === 'safety_report') byDate[dateStr].reports++;
        }
      });

      return Object.values(byDate);
    } catch (error) {
      console.error('Failed to get safety trends:', error);
      return this.getMockTrends(days);
    }
  },

  getMockTrends(days: number): SafetyTrend[] {
    const trends: SafetyTrend[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      trends.push({
        date: date.toISOString().split('T')[0],
        incidents: Math.floor(Math.random() * 5) + 1,
        resolved: Math.floor(Math.random() * 4),
        sosAlerts: Math.random() > 0.8 ? 1 : 0,
        reports: Math.floor(Math.random() * 3),
      });
    }

    return trends;
  },

  // Area Safety Scores
  async getAreaSafetyScores(): Promise<AreaSafetyScore[]> {
    // In production, this would calculate based on incidents per region
    return [
      {
        region: 'Downtown',
        score: 85,
        incidentCount: 12,
        mostCommonIssue: 'Behavior',
        trend: 'improving',
      },
      {
        region: 'University Area',
        score: 92,
        incidentCount: 5,
        mostCommonIssue: 'No Show',
        trend: 'stable',
      },
      {
        region: 'Suburbs North',
        score: 88,
        incidentCount: 8,
        mostCommonIssue: 'Route Issue',
        trend: 'stable',
      },
      {
        region: 'Suburbs South',
        score: 78,
        incidentCount: 18,
        mostCommonIssue: 'Payment',
        trend: 'declining',
      },
      {
        region: 'Industrial Zone',
        score: 82,
        incidentCount: 10,
        mostCommonIssue: 'Safety',
        trend: 'improving',
      },
    ];
  },

  // Real-time monitoring
  subscribeToIncidents(
    callback: (incident: SafetyIncident) => void
  ): () => void {
    const channel = supabase
      .channel('safety-incidents')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'safety_incidents' },
        (payload) => {
          const incident: SafetyIncident = {
            id: payload.new.id,
            type: payload.new.type,
            severity: payload.new.severity,
            userId: payload.new.user_id,
            rideId: payload.new.ride_id,
            description: payload.new.description,
            metadata: payload.new.metadata,
            createdAt: new Date(payload.new.created_at),
          };
          callback(incident);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  // Export data for reporting
  async exportSafetyReport(
    startDate: Date,
    endDate: Date
  ): Promise<{
    metrics: SafetyMetrics;
    incidents: SafetyIncident[];
    trends: SafetyTrend[];
    generatedAt: Date;
  }> {
    try {
      const { data: incidents } = await supabase
        .from('safety_incidents')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });

      const days = Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)
      );
      const metrics = await this.getSafetyMetrics(
        days <= 1 ? '24h' : days <= 7 ? '7d' : days <= 30 ? '30d' : '90d'
      );
      const trends = await this.getSafetyTrends(days);

      return {
        metrics,
        incidents:
          incidents?.map((i: any) => ({
            id: i.id,
            type: i.type,
            severity: i.severity,
            userId: i.user_id,
            rideId: i.ride_id,
            description: i.description,
            metadata: i.metadata,
            resolvedAt: i.resolved_at ? new Date(i.resolved_at) : undefined,
            createdAt: new Date(i.created_at),
          })) || [],
        trends,
        generatedAt: new Date(),
      };
    } catch (error) {
      console.error('Failed to export safety report:', error);
      throw error;
    }
  },
};
