import { supabase } from '@/lib/supabase';

export interface EmergencyContact {
    id: string;
    userId: string;
    name: string;
    phone: string;
    email?: string;
    relationship: string;
    isPrimary: boolean;
    notifyOnRideStart: boolean;
    notifyOnSOS: boolean;
    createdAt: string;
}

export interface SOSAlert {
    id: string;
    rideId: string;
    userId: string;
    latitude: number;
    longitude: number;
    alertType: 'sos' | 'safety_check_failed' | 'route_deviation' | 'manual';
    status: 'active' | 'responded' | 'resolved' | 'false_alarm';
    message?: string;
    respondedAt?: string;
    resolvedAt?: string;
    createdAt: string;
}

export interface LiveTripShare {
    id: string;
    rideId: string;
    shareCode: string;
    sharedWith: string[]; // contact IDs or emails
    expiresAt: string;
    isActive: boolean;
    lastLocationUpdate?: string;
    createdAt: string;
}

export interface SafetyCheckIn {
    id: string;
    rideId: string;
    userId: string;
    scheduledAt: string;
    respondedAt?: string;
    status: 'pending' | 'confirmed' | 'missed' | 'escalated';
    attempts: number;
}

class EmergencyService {
    // ==================== EMERGENCY CONTACTS ====================

    async getEmergencyContacts(userId: string): Promise<EmergencyContact[]> {
        const { data, error } = await supabase
            .from('emergency_contacts')
            .select('*')
            .eq('user_id', userId)
            .order('is_primary', { ascending: false });

        if (error) throw error;
        return data?.map(this.mapContact) || [];
    }

    async addEmergencyContact(
        userId: string,
        contact: Omit<EmergencyContact, 'id' | 'userId' | 'createdAt'>
    ): Promise<EmergencyContact> {
        // If this is primary, unset other primaries
        if (contact.isPrimary) {
            await supabase
                .from('emergency_contacts')
                .update({ is_primary: false })
                .eq('user_id', userId);
        }

        const { data, error } = await supabase
            .from('emergency_contacts')
            .insert({
                user_id: userId,
                name: contact.name,
                phone: contact.phone,
                email: contact.email,
                relationship: contact.relationship,
                is_primary: contact.isPrimary,
                notify_on_ride_start: contact.notifyOnRideStart,
                notify_on_sos: contact.notifyOnSOS,
            })
            .select()
            .single();

        if (error) throw error;
        return this.mapContact(data);
    }

    async updateEmergencyContact(
        contactId: string,
        updates: Partial<EmergencyContact>
    ): Promise<EmergencyContact> {
        const { data, error } = await supabase
            .from('emergency_contacts')
            .update({
                name: updates.name,
                phone: updates.phone,
                email: updates.email,
                relationship: updates.relationship,
                is_primary: updates.isPrimary,
                notify_on_ride_start: updates.notifyOnRideStart,
                notify_on_sos: updates.notifyOnSOS,
            })
            .eq('id', contactId)
            .select()
            .single();

        if (error) throw error;
        return this.mapContact(data);
    }

    async deleteEmergencyContact(contactId: string): Promise<void> {
        const { error } = await supabase
            .from('emergency_contacts')
            .delete()
            .eq('id', contactId);

        if (error) throw error;
    }

    // ==================== SOS ALERTS ====================

    async triggerSOS(
        rideId: string,
        userId: string,
        location: { lat: number; lng: number },
        message?: string
    ): Promise<SOSAlert> {
        const { data, error } = await supabase
            .from('sos_alerts')
            .insert({
                ride_id: rideId,
                user_id: userId,
                latitude: location.lat,
                longitude: location.lng,
                alert_type: 'sos',
                status: 'active',
                message,
            })
            .select()
            .single();

        if (error) throw error;

        // Notify emergency contacts
        await this.notifyEmergencyContacts(userId, data.id, location);

        // Notify platform admins
        await this.notifyAdmins(data.id);

        return this.mapSOSAlert(data);
    }

    async updateSOSStatus(
        alertId: string,
        status: SOSAlert['status'],
        responderId?: string
    ): Promise<SOSAlert> {
        const updates: Record<string, unknown> = { status };

        if (status === 'responded') {
            updates.responded_at = new Date().toISOString();
            updates.responder_id = responderId;
        } else if (status === 'resolved' || status === 'false_alarm') {
            updates.resolved_at = new Date().toISOString();
        }

        const { data, error } = await supabase
            .from('sos_alerts')
            .update(updates)
            .eq('id', alertId)
            .select()
            .single();

        if (error) throw error;
        return this.mapSOSAlert(data);
    }

    async getActiveSOSAlerts(): Promise<SOSAlert[]> {
        const { data, error } = await supabase
            .from('sos_alerts')
            .select('*')
            .eq('status', 'active')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data?.map(this.mapSOSAlert) || [];
    }

    async getSOSHistory(userId: string): Promise<SOSAlert[]> {
        const { data, error } = await supabase
            .from('sos_alerts')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data?.map(this.mapSOSAlert) || [];
    }

    private async notifyEmergencyContacts(
        userId: string,
        alertId: string,
        location: { lat: number; lng: number }
    ): Promise<void> {
        const contacts = await this.getEmergencyContacts(userId);
        const sosContacts = contacts.filter((c) => c.notifyOnSOS);

        // Get user info
        const { data: user } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', userId)
            .single();

        const locationUrl = `https://www.google.com/maps?q=${location.lat},${location.lng}`;
        const message = `🚨 EMERGENCY ALERT: ${user?.full_name || 'A user'} has triggered an SOS alert. Location: ${locationUrl}`;

        // In production, this would send SMS/email via a service like Twilio
        for (const contact of sosContacts) {
            console.log(`[Emergency] Notifying ${contact.name} at ${contact.phone}: ${message}`);

            // Log notification attempt
            await supabase.from('emergency_notifications').insert({
                alert_id: alertId,
                contact_id: contact.id,
                method: 'sms',
                message,
                status: 'sent',
            });
        }
    }

    private async notifyAdmins(alertId: string): Promise<void> {
        // Get admin users
        const { data: admins } = await supabase
            .from('profiles')
            .select('id')
            .eq('role', 'admin');

        // Create notifications for admins
        for (const admin of admins || []) {
            await supabase.from('notifications').insert({
                user_id: admin.id,
                type: 'sos_alert',
                title: '🚨 SOS Alert Triggered',
                message: 'A user has triggered an emergency SOS. Immediate attention required.',
                data: { alert_id: alertId },
                priority: 'critical',
            });
        }
    }

    // ==================== LIVE TRIP SHARING ====================

    async startTripShare(
        rideId: string,
        userId: string,
        contactIds: string[],
        durationMinutes: number = 240
    ): Promise<LiveTripShare> {
        const shareCode = this.generateShareCode();
        const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();

        const { data, error } = await supabase
            .from('live_trip_shares')
            .insert({
                ride_id: rideId,
                user_id: userId,
                share_code: shareCode,
                shared_with: contactIds,
                expires_at: expiresAt,
                is_active: true,
            })
            .select()
            .single();

        if (error) throw error;

        // Notify contacts
        await this.notifyTripShareContacts(userId, data.id, shareCode);

        return this.mapTripShare(data);
    }

    async updateTripLocation(
        shareId: string,
        location: { lat: number; lng: number }
    ): Promise<void> {
        const { error } = await supabase
            .from('live_trip_shares')
            .update({
                current_latitude: location.lat,
                current_longitude: location.lng,
                last_location_update: new Date().toISOString(),
            })
            .eq('id', shareId);

        if (error) throw error;
    }

    async endTripShare(shareId: string): Promise<void> {
        const { error } = await supabase
            .from('live_trip_shares')
            .update({ is_active: false })
            .eq('id', shareId);

        if (error) throw error;
    }

    async getTripShareByCode(code: string): Promise<LiveTripShare | null> {
        const { data, error } = await supabase
            .from('live_trip_shares')
            .select('*')
            .eq('share_code', code)
            .eq('is_active', true)
            .gt('expires_at', new Date().toISOString())
            .single();

        if (error || !data) return null;
        return this.mapTripShare(data);
    }

    async getActiveTripShares(userId: string): Promise<LiveTripShare[]> {
        const { data, error } = await supabase
            .from('live_trip_shares')
            .select('*')
            .eq('user_id', userId)
            .eq('is_active', true)
            .gt('expires_at', new Date().toISOString());

        if (error) throw error;
        return data?.map(this.mapTripShare) || [];
    }

    private async notifyTripShareContacts(
        userId: string,
        shareId: string,
        shareCode: string
    ): Promise<void> {
        const { data: share } = await supabase
            .from('live_trip_shares')
            .select('shared_with')
            .eq('id', shareId)
            .single();

        const { data: user } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', userId)
            .single();

        const trackUrl = `${window.location.origin}/track/${shareCode}`;
        const message = `${user?.full_name || 'Someone'} is sharing their ride with you. Track their journey: ${trackUrl}`;

        // Get contact details and notify
        for (const contactId of share?.shared_with || []) {
            const { data: contact } = await supabase
                .from('emergency_contacts')
                .select('name, phone, email')
                .eq('id', contactId)
                .single();

            if (contact) {
                console.log(`[TripShare] Notifying ${contact.name}: ${message}`);
            }
        }
    }

    private generateShareCode(): string {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 8; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    // ==================== SAFETY CHECK-INS ====================

    async scheduleSafetyCheckIn(
        rideId: string,
        userId: string,
        intervalMinutes: number = 30
    ): Promise<SafetyCheckIn> {
        const scheduledAt = new Date(Date.now() + intervalMinutes * 60 * 1000).toISOString();

        const { data, error } = await supabase
            .from('safety_checkins')
            .insert({
                ride_id: rideId,
                user_id: userId,
                scheduled_at: scheduledAt,
                status: 'pending',
                attempts: 0,
            })
            .select()
            .single();

        if (error) throw error;
        return this.mapCheckIn(data);
    }

    async respondToCheckIn(checkInId: string): Promise<SafetyCheckIn> {
        const { data, error } = await supabase
            .from('safety_checkins')
            .update({
                responded_at: new Date().toISOString(),
                status: 'confirmed',
            })
            .eq('id', checkInId)
            .select()
            .single();

        if (error) throw error;
        return this.mapCheckIn(data);
    }

    async escalateMissedCheckIn(checkInId: string): Promise<void> {
        const { data: checkIn } = await supabase
            .from('safety_checkins')
            .select('*, ride_id, user_id')
            .eq('id', checkInId)
            .single();

        if (!checkIn) return;

        // Update status
        await supabase
            .from('safety_checkins')
            .update({ status: 'escalated' })
            .eq('id', checkInId);

        // Get current location from ride if available
        const { data: ride } = await supabase
            .from('rides')
            .select('*')
            .eq('id', checkIn.ride_id)
            .single();

        // Trigger SOS-like alert
        await this.triggerSOS(
            checkIn.ride_id,
            checkIn.user_id,
            { lat: ride?.current_lat || 0, lng: ride?.current_lng || 0 },
            'Automated alert: Safety check-in was not responded to'
        );
    }

    async getPendingCheckIns(userId: string): Promise<SafetyCheckIn[]> {
        const { data, error } = await supabase
            .from('safety_checkins')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'pending')
            .lte('scheduled_at', new Date().toISOString());

        if (error) throw error;
        return data?.map(this.mapCheckIn) || [];
    }

    // ==================== ROUTE DEVIATION DETECTION ====================

    async checkRouteDeviation(
        rideId: string,
        currentLocation: { lat: number; lng: number },
        expectedRoute: Array<{ lat: number; lng: number }>
    ): Promise<{ deviated: boolean; distance: number }> {
        // Find minimum distance from current location to expected route
        let minDistance = Infinity;

        for (const point of expectedRoute) {
            const distance = this.calculateDistance(
                currentLocation.lat,
                currentLocation.lng,
                point.lat,
                point.lng
            );
            minDistance = Math.min(minDistance, distance);
        }

        // Deviation threshold: 500 meters
        const DEVIATION_THRESHOLD = 0.5; // km
        const deviated = minDistance > DEVIATION_THRESHOLD;

        if (deviated) {
            // Log deviation
            await supabase.from('route_deviations').insert({
                ride_id: rideId,
                latitude: currentLocation.lat,
                longitude: currentLocation.lng,
                deviation_distance: minDistance,
            });
        }

        return { deviated, distance: minDistance };
    }

    async handleRouteDeviation(
        rideId: string,
        userId: string,
        location: { lat: number; lng: number },
        deviationKm: number
    ): Promise<void> {
        // Get ride passengers
        const { data: bookings } = await supabase
            .from('bookings')
            .select('user_id')
            .eq('ride_id', rideId)
            .eq('status', 'confirmed');

        // Notify passengers
        for (const booking of bookings || []) {
            await supabase.from('notifications').insert({
                user_id: booking.user_id,
                type: 'route_deviation',
                title: '⚠️ Route Deviation Detected',
                message: `The driver has deviated ${deviationKm.toFixed(1)}km from the expected route.`,
                data: { ride_id: rideId, latitude: location.lat, longitude: location.lng },
                priority: 'high',
            });
        }

        // If significant deviation (> 2km), auto-trigger alert
        if (deviationKm > 2) {
            await supabase.from('sos_alerts').insert({
                ride_id: rideId,
                user_id: userId,
                latitude: location.lat,
                longitude: location.lng,
                alert_type: 'route_deviation',
                status: 'active',
                message: `Automatic alert: Significant route deviation of ${deviationKm.toFixed(1)}km detected`,
            });
        }
    }

    private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371; // Earth's radius in km
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    private toRad(deg: number): number {
        return deg * (Math.PI / 180);
    }

    // ==================== MAPPERS ====================

    private mapContact(data: Record<string, unknown>): EmergencyContact {
        return {
            id: data.id as string,
            userId: data.user_id as string,
            name: data.name as string,
            phone: data.phone as string,
            email: data.email as string | undefined,
            relationship: data.relationship as string,
            isPrimary: data.is_primary as boolean,
            notifyOnRideStart: data.notify_on_ride_start as boolean,
            notifyOnSOS: data.notify_on_sos as boolean,
            createdAt: data.created_at as string,
        };
    }

    private mapSOSAlert(data: Record<string, unknown>): SOSAlert {
        return {
            id: data.id as string,
            rideId: data.ride_id as string,
            userId: data.user_id as string,
            latitude: data.latitude as number,
            longitude: data.longitude as number,
            alertType: data.alert_type as SOSAlert['alertType'],
            status: data.status as SOSAlert['status'],
            message: data.message as string | undefined,
            respondedAt: data.responded_at as string | undefined,
            resolvedAt: data.resolved_at as string | undefined,
            createdAt: data.created_at as string,
        };
    }

    private mapTripShare(data: Record<string, unknown>): LiveTripShare {
        return {
            id: data.id as string,
            rideId: data.ride_id as string,
            shareCode: data.share_code as string,
            sharedWith: data.shared_with as string[],
            expiresAt: data.expires_at as string,
            isActive: data.is_active as boolean,
            lastLocationUpdate: data.last_location_update as string | undefined,
            createdAt: data.created_at as string,
        };
    }

    private mapCheckIn(data: Record<string, unknown>): SafetyCheckIn {
        return {
            id: data.id as string,
            rideId: data.ride_id as string,
            userId: data.user_id as string,
            scheduledAt: data.scheduled_at as string,
            respondedAt: data.responded_at as string | undefined,
            status: data.status as SafetyCheckIn['status'],
            attempts: data.attempts as number,
        };
    }
}

export const emergencyService = new EmergencyService();
