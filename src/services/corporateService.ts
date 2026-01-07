// Corporate/Company Pool Service
// Manage company carpools, reports, and employee commute programs

import { supabase } from '@/lib/supabase';

export interface Company {
    id: string;
    name: string;
    domain: string; // email domain for verification
    logo?: string;
    address: string;
    lat: number;
    lng: number;
    settings: CompanySettings;
    createdAt: Date;
    employeeCount: number;
    activePoolsCount: number;
}

export interface CompanySettings {
    allowPublicPools: boolean;
    requireApproval: boolean;
    subsidyEnabled: boolean;
    subsidyAmount: number; // per ride
    maxSubsidyPerMonth: number;
    workingHours: {
        start: string;
        end: string;
    };
    allowWeekendPools: boolean;
}

export interface CompanyEmployee {
    id: string;
    userId: string;
    companyId: string;
    email: string;
    department?: string;
    role: 'employee' | 'admin' | 'super_admin';
    status: 'pending' | 'active' | 'suspended';
    joinedAt: Date;
    profile?: {
        name: string;
        avatar?: string;
    };
}

export interface CompanyPool {
    id: string;
    companyId: string;
    name: string;
    description?: string;
    creatorId: string;
    origin: string;
    originLat: number;
    originLng: number;
    destination: string; // Usually company address
    destinationLat: number;
    destinationLng: number;
    departureTime: string; // HH:mm
    returnTime?: string;
    daysOfWeek: number[];
    maxMembers: number;
    currentMembers: number;
    isRecurring: boolean;
    status: 'active' | 'paused' | 'completed';
    members: CompanyPoolMember[];
}

export interface CompanyPoolMember {
    userId: string;
    role: 'driver' | 'passenger';
    pickupLocation?: string;
    pickupLat?: number;
    pickupLng?: number;
    joinedAt: Date;
    profile?: {
        name: string;
        avatar?: string;
    };
}

export interface CommuteReport {
    companyId: string;
    period: 'week' | 'month' | 'quarter';
    startDate: Date;
    endDate: Date;
    stats: {
        totalTrips: number;
        totalEmployeesParticipating: number;
        participationRate: number;
        co2Saved: number;
        costSaved: number;
        subsidyUsed: number;
        averageOccupancy: number;
        topRoutes: { route: string; trips: number }[];
        departmentBreakdown: { department: string; trips: number; employees: number }[];
    };
}

class CorporateService {
    // Get company by domain
    async getCompanyByDomain(domain: string): Promise<Company | null> {
        const { data, error } = await supabase
            .from('companies')
            .select('*')
            .eq('domain', domain.toLowerCase())
            .maybeSingle();

        if (error || !data) return null;

        return {
            id: data.id,
            name: data.name,
            domain: data.domain,
            logo: data.logo,
            address: data.address,
            lat: data.lat,
            lng: data.lng,
            settings: data.settings || {},
            createdAt: new Date(data.created_at),
            employeeCount: data.employee_count || 0,
            activePoolsCount: data.active_pools_count || 0
        };
    }

    // Get company by ID
    async getCompany(companyId: string): Promise<Company | null> {
        const { data, error } = await supabase
            .from('companies')
            .select('*')
            .eq('id', companyId)
            .maybeSingle();

        if (error || !data) return null;

        return {
            id: data.id,
            name: data.name,
            domain: data.domain,
            logo: data.logo,
            address: data.address,
            lat: data.lat,
            lng: data.lng,
            settings: data.settings || {},
            createdAt: new Date(data.created_at),
            employeeCount: data.employee_count || 0,
            activePoolsCount: data.active_pools_count || 0
        };
    }

    // Register user as company employee
    async joinCompany(
        userId: string,
        email: string
    ): Promise<{ success: boolean; message: string; company?: Company }> {
        // Extract domain from email
        const domain = email.split('@')[1]?.toLowerCase();
        if (!domain) {
            return { success: false, message: 'Invalid email address' };
        }

        // Find company with this domain
        const company = await this.getCompanyByDomain(domain);
        if (!company) {
            return { success: false, message: 'No company found with this email domain' };
        }

        // Check if already registered
        const { data: existing } = await supabase
            .from('company_employees')
            .select('id, status')
            .eq('user_id', userId)
            .eq('company_id', company.id)
            .maybeSingle();

        if (existing) {
            if (existing.status === 'active') {
                return { success: false, message: 'You are already a member of this company' };
            } else if (existing.status === 'pending') {
                return { success: false, message: 'Your membership is pending approval' };
            }
        }

        // Create employee record
        const { error } = await supabase
            .from('company_employees')
            .insert({
                user_id: userId,
                company_id: company.id,
                email,
                role: 'employee',
                status: company.settings.requireApproval ? 'pending' : 'active'
            });

        if (error) {
            console.error('Failed to join company:', error);
            return { success: false, message: 'Failed to join company' };
        }

        return {
            success: true,
            message: company.settings.requireApproval
                ? 'Request submitted! Awaiting admin approval.'
                : `Welcome to ${company.name}!`,
            company
        };
    }

    // Get user's company
    async getUserCompany(userId: string): Promise<{ company: Company; role: string } | null> {
        const { data, error } = await supabase
            .from('company_employees')
            .select(`
        role,
        company:companies (*)
      `)
            .eq('user_id', userId)
            .eq('status', 'active')
            .maybeSingle();

        if (error || !data?.company) return null;

        const companyData = data.company as any;
        return {
            company: {
                id: companyData.id,
                name: companyData.name,
                domain: companyData.domain,
                logo: companyData.logo,
                address: companyData.address,
                lat: companyData.lat,
                lng: companyData.lng,
                settings: companyData.settings || {},
                createdAt: new Date(companyData.created_at),
                employeeCount: companyData.employee_count || 0,
                activePoolsCount: companyData.active_pools_count || 0
            },
            role: data.role
        };
    }

    // Get company pools
    async getCompanyPools(companyId: string): Promise<CompanyPool[]> {
        const { data, error } = await supabase
            .from('company_pools')
            .select(`
        *,
        members:company_pool_members (
          user_id,
          role,
          pickup_location,
          pickup_lat,
          pickup_lng,
          joined_at,
          profile:profiles (full_name, avatar_url)
        )
      `)
            .eq('company_id', companyId)
            .eq('status', 'active')
            .order('departure_time', { ascending: true });

        if (error || !data) return [];

        return data.map((pool: any) => ({
            id: pool.id,
            companyId: pool.company_id,
            name: pool.name,
            description: pool.description,
            creatorId: pool.creator_id,
            origin: pool.origin,
            originLat: pool.origin_lat,
            originLng: pool.origin_lng,
            destination: pool.destination,
            destinationLat: pool.destination_lat,
            destinationLng: pool.destination_lng,
            departureTime: pool.departure_time,
            returnTime: pool.return_time,
            daysOfWeek: pool.days_of_week || [],
            maxMembers: pool.max_members,
            currentMembers: pool.members?.length || 0,
            isRecurring: pool.is_recurring,
            status: pool.status,
            members: pool.members?.map((m: any) => ({
                userId: m.user_id,
                role: m.role,
                pickupLocation: m.pickup_location,
                pickupLat: m.pickup_lat,
                pickupLng: m.pickup_lng,
                joinedAt: new Date(m.joined_at),
                profile: m.profile ? {
                    name: m.profile.full_name,
                    avatar: m.profile.avatar_url
                } : undefined
            })) || []
        }));
    }

    // Create company pool
    async createCompanyPool(
        companyId: string,
        creatorId: string,
        pool: {
            name: string;
            description?: string;
            origin: string;
            originLat: number;
            originLng: number;
            destination: string;
            destinationLat: number;
            destinationLng: number;
            departureTime: string;
            returnTime?: string;
            daysOfWeek: number[];
            maxMembers: number;
            isRecurring: boolean;
        }
    ): Promise<{ success: boolean; poolId?: string; message: string }> {
        const { data, error } = await supabase
            .from('company_pools')
            .insert({
                company_id: companyId,
                creator_id: creatorId,
                name: pool.name,
                description: pool.description,
                origin: pool.origin,
                origin_lat: pool.originLat,
                origin_lng: pool.originLng,
                destination: pool.destination,
                destination_lat: pool.destinationLat,
                destination_lng: pool.destinationLng,
                departure_time: pool.departureTime,
                return_time: pool.returnTime,
                days_of_week: pool.daysOfWeek,
                max_members: pool.maxMembers,
                is_recurring: pool.isRecurring,
                status: 'active'
            })
            .select('id')
            .single();

        if (error) {
            console.error('Failed to create pool:', error);
            return { success: false, message: 'Failed to create pool' };
        }

        // Add creator as first member (driver)
        await supabase
            .from('company_pool_members')
            .insert({
                pool_id: data.id,
                user_id: creatorId,
                role: 'driver'
            });

        return { success: true, poolId: data.id, message: 'Pool created successfully!' };
    }

    // Join company pool
    async joinCompanyPool(
        poolId: string,
        userId: string,
        role: 'driver' | 'passenger',
        pickupLocation?: { address: string; lat: number; lng: number }
    ): Promise<{ success: boolean; message: string }> {
        // Check if pool exists and has space
        const { data: pool } = await supabase
            .from('company_pools')
            .select('max_members, members:company_pool_members(count)')
            .eq('id', poolId)
            .single();

        if (!pool) {
            return { success: false, message: 'Pool not found' };
        }

        const currentMembers = (pool.members as any)?.[0]?.count || 0;
        if (currentMembers >= pool.max_members) {
            return { success: false, message: 'Pool is full' };
        }

        // Check if already a member
        const { data: existing } = await supabase
            .from('company_pool_members')
            .select('id')
            .eq('pool_id', poolId)
            .eq('user_id', userId)
            .maybeSingle();

        if (existing) {
            return { success: false, message: 'You are already in this pool' };
        }

        // Add member
        const { error } = await supabase
            .from('company_pool_members')
            .insert({
                pool_id: poolId,
                user_id: userId,
                role,
                pickup_location: pickupLocation?.address,
                pickup_lat: pickupLocation?.lat,
                pickup_lng: pickupLocation?.lng
            });

        if (error) {
            console.error('Failed to join pool:', error);
            return { success: false, message: 'Failed to join pool' };
        }

        return { success: true, message: 'Joined pool successfully!' };
    }

    // Generate commute report
    async generateCommuteReport(
        companyId: string,
        period: 'week' | 'month' | 'quarter'
    ): Promise<CommuteReport | null> {
        const endDate = new Date();
        let startDate = new Date();

        switch (period) {
            case 'week':
                startDate.setDate(startDate.getDate() - 7);
                break;
            case 'month':
                startDate.setMonth(startDate.getMonth() - 1);
                break;
            case 'quarter':
                startDate.setMonth(startDate.getMonth() - 3);
                break;
        }

        // Get all company pools and their rides
        const { data: pools } = await supabase
            .from('company_pools')
            .select(`
        id,
        members:company_pool_members (
          user_id,
          profile:profiles (
            department
          )
        )
      `)
            .eq('company_id', companyId);

        if (!pools) return null;

        // Get employee count
        const { count: employeeCount } = await supabase
            .from('company_employees')
            .select('id', { count: 'exact', head: true })
            .eq('company_id', companyId)
            .eq('status', 'active');

        // Get ride data for this period
        const { data: rides } = await supabase
            .from('rides')
            .select('id, origin, destination, driver_id, bookings(passenger_id)')
            .eq('company_id', companyId)
            .gte('departure_time', startDate.toISOString())
            .lte('departure_time', endDate.toISOString())
            .eq('status', 'completed');

        const totalTrips = rides?.length || 0;
        const uniqueParticipants = new Set<string>();
        const routeCounts = new Map<string, number>();
        const departmentStats = new Map<string, { trips: number; employees: Set<string> }>();

        rides?.forEach((ride: any) => {
            uniqueParticipants.add(ride.driver_id);
            ride.bookings?.forEach((b: any) => uniqueParticipants.add(b.passenger_id));

            const route = `${ride.origin?.split(',')[0]} → ${ride.destination?.split(',')[0]}`;
            routeCounts.set(route, (routeCounts.get(route) || 0) + 1);
        });

        // Calculate stats
        const co2Saved = totalTrips * 2.3; // kg per shared trip
        const costSaved = totalTrips * 5; // £5 average saved per trip
        const participationRate = employeeCount
            ? (uniqueParticipants.size / employeeCount) * 100
            : 0;

        const topRoutes = Array.from(routeCounts.entries())
            .map(([route, trips]) => ({ route, trips }))
            .sort((a, b) => b.trips - a.trips)
            .slice(0, 5);

        return {
            companyId,
            period,
            startDate,
            endDate,
            stats: {
                totalTrips,
                totalEmployeesParticipating: uniqueParticipants.size,
                participationRate: Math.round(participationRate),
                co2Saved: Math.round(co2Saved),
                costSaved: Math.round(costSaved),
                subsidyUsed: 0, // Calculate from actual subsidy usage
                averageOccupancy: totalTrips > 0 ? 2.5 : 0, // Simplified
                topRoutes,
                departmentBreakdown: []
            }
        };
    }

    // Get company employees
    async getCompanyEmployees(
        companyId: string,
        status?: 'pending' | 'active' | 'suspended'
    ): Promise<CompanyEmployee[]> {
        let query = supabase
            .from('company_employees')
            .select(`
        *,
        profile:profiles (full_name, avatar_url)
      `)
            .eq('company_id', companyId);

        if (status) {
            query = query.eq('status', status);
        }

        const { data, error } = await query.order('joined_at', { ascending: false });

        if (error || !data) return [];

        return data.map((emp: any) => ({
            id: emp.id,
            userId: emp.user_id,
            companyId: emp.company_id,
            email: emp.email,
            department: emp.department,
            role: emp.role,
            status: emp.status,
            joinedAt: new Date(emp.joined_at),
            profile: emp.profile ? {
                name: emp.profile.full_name,
                avatar: emp.profile.avatar_url
            } : undefined
        }));
    }

    // Update employee status (admin only)
    async updateEmployeeStatus(
        companyId: string,
        employeeId: string,
        status: 'pending' | 'active' | 'suspended'
    ): Promise<{ success: boolean; message: string }> {
        const { error } = await supabase
            .from('company_employees')
            .update({ status })
            .eq('id', employeeId)
            .eq('company_id', companyId);

        if (error) {
            return { success: false, message: 'Failed to update status' };
        }

        return { success: true, message: `Employee ${status === 'active' ? 'approved' : status === 'suspended' ? 'suspended' : 'set to pending'}` };
    }

    // Update employee role (admin only)
    async updateEmployeeRole(
        companyId: string,
        employeeId: string,
        role: 'employee' | 'admin' | 'super_admin'
    ): Promise<{ success: boolean; message: string }> {
        const { error } = await supabase
            .from('company_employees')
            .update({ role })
            .eq('id', employeeId)
            .eq('company_id', companyId);

        if (error) {
            return { success: false, message: 'Failed to update role' };
        }

        return { success: true, message: `Employee role updated to ${role}` };
    }

    // Invite employees by email
    async inviteEmployees(
        companyId: string,
        emails: string[],
        department?: string
    ): Promise<{ success: boolean; invited: number; failed: string[] }> {
        const failed: string[] = [];
        let invited = 0;

        for (const email of emails) {
            try {
                // Check if employee already exists
                const { data: existing } = await supabase
                    .from('company_employees')
                    .select('id')
                    .eq('company_id', companyId)
                    .eq('email', email)
                    .single();

                if (existing) {
                    failed.push(email);
                    continue;
                }

                // Create pending employee record
                const { error } = await supabase
                    .from('company_employees')
                    .insert({
                        company_id: companyId,
                        email: email.toLowerCase(),
                        department,
                        role: 'employee',
                        status: 'pending',
                        joined_at: new Date().toISOString()
                    });

                if (error) {
                    failed.push(email);
                } else {
                    invited++;
                }
            } catch {
                failed.push(email);
            }
        }

        return { success: invited > 0, invited, failed };
    }
}

export const corporateService = new CorporateService();
export default corporateService;
