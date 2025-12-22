# New Features Quick Reference Guide

## 🚀 For Developers

### Smart Matching System

**Create a trip request:**
```typescript
const { error } = await supabase.from('trip_requests').insert({
  rider_id: user.id,
  from_location: 'London',
  to_location: 'Manchester',
  from_lat: 51.5074,
  from_lng: -0.1278,
  to_lat: 53.4808,
  to_lng: -2.2426,
  departure_time: '2024-12-25T09:00:00Z',
  flexible_time: true,
  time_window_start: '2024-12-25T07:00:00Z',
  time_window_end: '2024-12-25T11:00:00Z',
  seats_needed: 2,
  status: 'active'
});

// Run matching
await supabase.rpc('match_trip_requests_to_rides');
```

**Get matches for a trip request:**
```typescript
const { data } = await supabase.rpc('get_matches_for_trip_request', {
  p_trip_request_id: requestId
});

// Returns: match_id, ride details, driver info, match_score, etc.
```

**Get matches for your ride (as driver):**
```typescript
const { data } = await supabase.rpc('get_ride_matches_for_driver', {
  p_ride_id: rideId
});

// Returns: passenger details, match scores, seats requested, etc.
```

**Bulk respond to requests:**
```typescript
const { data } = await supabase.rpc('bulk_respond_to_ride_requests', {
  p_ride_id: rideId,
  p_request_ids: [req1, req2, req3],
  p_action: 'accept' // or 'decline'
});

// Returns: processed count, accepted count, declined count, errors
```

---

### Live Ride Tracking

**Start tracking:**
```typescript
const { data } = await supabase.rpc('start_ride_tracking', {
  p_ride_id: rideId,
  p_initial_lat: 51.5074,
  p_initial_lng: -0.1278
});

// Sets ride status to 'in_progress'
// Notifies all passengers
// Begins location tracking
```

**Update location (call every 30 seconds):**
```typescript
const { data } = await supabase.rpc('update_ride_location', {
  p_ride_id: rideId,
  p_lat: currentLat,
  p_lng: currentLng,
  p_speed_kmh: 60,
  p_heading: 90 // degrees, 0 = North
});
```

**Mark passenger picked up:**
```typescript
const { data } = await supabase.rpc('mark_passenger_picked_up', {
  p_ride_id: rideId,
  p_passenger_id: passengerId
});

// Updates booking status to 'active'
// Records pickup location and time
// Notifies passenger
```

**Mark passenger dropped off:**
```typescript
const { data } = await supabase.rpc('mark_passenger_dropped_off', {
  p_ride_id: rideId,
  p_passenger_id: passengerId
});

// Updates booking status to 'completed'
// Records dropoff location and time
// Prompts for review
```

**Complete ride:**
```typescript
const { data } = await supabase.rpc('complete_ride_tracking', {
  p_ride_id: rideId
});

// Returns: total_duration_minutes
// Updates ride status to 'completed'
// Triggers review notifications
```

**Get active tracking:**
```typescript
const { data } = await supabase.rpc('get_active_ride_tracking', {
  p_ride_id: rideId
});

// Returns: current location, speed, heading, passengers onboard
// Accessible to driver and passengers
```

**Trigger emergency:**
```typescript
const { data } = await supabase.rpc('trigger_ride_emergency', {
  p_ride_id: rideId,
  p_emergency_type: 'general' // or 'accident', 'threat', etc.
});

// Alerts all passengers and driver
// Notifies emergency contacts
// Records GPS location
// Creates alert in database
```

---

### Enhanced Cancellation

**Cancel booking with impact:**
```typescript
const { data } = await supabase.rpc('cancel_booking_with_impact', {
  p_booking_id: bookingId,
  p_reason: 'Medical emergency' // or any reason
});

// Returns:
// - success: boolean
// - reliability_impact: integer (points deducted)
// - new_reliability_score: integer
// - warning_issued: boolean
// - restriction_applied: boolean
// - message: string
```

**Check booking eligibility:**
```typescript
const { data } = await supabase.rpc('check_booking_eligibility', {
  p_user_id: userId // optional, defaults to current user
});

// Returns:
// - is_eligible: boolean
// - reliability_score: integer
// - active_restrictions: integer
// - reason: string (if not eligible)
```

**Get reliability score:**
```typescript
const { data } = await supabase
  .from('reliability_scores')
  .select('*')
  .eq('user_id', userId)
  .single();

// Returns: complete reliability data
// - reliability_score (0-100)
// - total_rides, completed_rides, cancelled_rides
// - completion_ratio, cancellation_ratio
// - warnings_count, grace_rides_remaining
```

---

### Detailed Review System

**Submit review:**
```typescript
const { data } = await supabase.rpc('submit_detailed_review', {
  p_booking_id: bookingId,
  p_overall_rating: 5,
  p_punctuality_rating: 5,
  p_cleanliness_rating: 4,
  p_communication_rating: 5,
  p_safety_rating: 5,
  p_comfort_rating: 4,
  p_review_text: 'Great ride! Very punctual and safe driver.',
  p_would_ride_again: true
});

// Returns:
// - success: boolean
// - review_id: uuid
// - reviewee_new_rating: number
// - achievements_unlocked: text[]
// - message: string
```

**Get user reviews summary:**
```typescript
const { data } = await supabase.rpc('get_user_reviews_summary', {
  p_user_id: userId // optional
});

// Returns aggregate statistics:
// - total_reviews
// - average ratings for all categories
// - would_ride_again_percentage
// - star distribution (5-star, 4-star, etc.)
```

**Get recent reviews:**
```typescript
const { data } = await supabase.rpc('get_recent_reviews', {
  p_user_id: userId,
  p_limit: 10
});

// Returns: reviewer details, all ratings, review text, ride info
```

**Get pending reviews:**
```typescript
const { data } = await supabase.rpc('get_pending_reviews', {
  p_user_id: userId // optional
});

// Returns: bookings awaiting review
// Includes reviewee details and ride information
```

---

### Environmental Impact

**Calculate impact:**
```typescript
const { data } = await supabase.rpc('calculate_environmental_impact', {
  p_user_id: userId // optional
});

// Returns:
// - total_rides: integer
// - total_distance_km: number
// - co2_saved_kg: number
// - trees_equivalent: number
// - cars_off_road_days: number
// - fuel_saved_liters: number
```

**Example usage:**
```typescript
const impact = data[0];
console.log(`You've saved ${impact.co2_saved_kg}kg of CO2!`);
console.log(`That's equivalent to ${impact.trees_equivalent} trees!`);
console.log(`You've saved ${impact.fuel_saved_liters}L of fuel!`);
```

---

### Achievement System

**Check achievements:**
```typescript
const { data } = await supabase.rpc('check_and_award_achievements', {
  p_user_id: userId // optional
});

// Returns array of unlocked achievements:
// [
//   { achievement_name: 'first_ride', achievement_description: '...', unlocked_at: '...' },
//   { achievement_name: 'eco_warrior', achievement_description: '...', unlocked_at: '...' }
// ]
```

**Available achievements:**
- `first_ride` - Completed first ride
- `frequent_carpooler` - 10 rides
- `carpool_champion` - 50 rides
- `carpool_legend` - 100 rides
- `five_star_member` - Maintain 4.8+ rating with 10+ rides
- `helpful_reviewer` - Submit 10+ reviews
- `first_review` - Submit first review
- `5_star_given` - Give a 5-star review
- `eco_warrior` - Save 100kg CO2
- `tree_planter` - Impact equivalent to 5 trees

---

### Notifications

**Queue notification:**
```typescript
await supabase.from('notification_queue').insert({
  user_id: userId,
  notification_type: 'ride_started',
  title: 'Ride Started!',
  message: 'Your driver is on the way',
  data: { ride_id: rideId },
  priority: 'high', // or 'low', 'normal', 'urgent'
  scheduled_for: new Date().toISOString()
});
```

**Get user notifications:**
```typescript
const { data } = await supabase
  .from('notification_queue')
  .select('*')
  .eq('user_id', userId)
  .eq('status', 'pending')
  .order('priority', { ascending: false })
  .order('scheduled_for', { ascending: true });
```

**Mark notification as sent:**
```typescript
await supabase
  .from('notification_queue')
  .update({ status: 'sent', sent_at: new Date().toISOString() })
  .eq('id', notificationId);
```

---

### Favorite Drivers

**Add favorite:**
```typescript
await supabase.from('favorite_drivers').insert({
  passenger_id: userId,
  driver_id: driverId,
  auto_accept_enabled: false
});
```

**Get favorites:**
```typescript
const { data } = await supabase
  .from('favorite_drivers')
  .select(`
    *,
    driver:profiles!favorite_drivers_driver_id_fkey(*)
  `)
  .eq('passenger_id', userId)
  .order('last_ride_at', { ascending: false });
```

**Enable auto-accept:**
```typescript
await supabase
  .from('favorite_drivers')
  .update({ auto_accept_enabled: true })
  .eq('passenger_id', userId)
  .eq('driver_id', driverId);
```

---

### Waitlist Management

**Add to waitlist:**
```typescript
await supabase.from('ride_waitlist').insert({
  ride_id: rideId,
  user_id: userId,
  seats_requested: 2,
  priority_score: 50 // based on user rating
});
```

**Promote from waitlist:**
```typescript
const { data } = await supabase.rpc('promote_from_waitlist', {
  p_ride_id: rideId
});

// Returns: promoted_count
// Automatically notifies promoted users
```

---

## 🎯 Common Use Cases

### Use Case 1: Passenger Books Ride
```typescript
// 1. Check eligibility
const eligible = await supabase.rpc('check_booking_eligibility');
if (!eligible.data[0].is_eligible) {
  alert(eligible.data[0].reason);
  return;
}

// 2. Create booking
const { data: booking } = await supabase.from('ride_bookings').insert({
  ride_id: rideId,
  passenger_id: userId,
  pickup_location: 'London Bridge',
  pickup_lat: 51.5074,
  pickup_lng: -0.1278,
  dropoff_location: 'Kings Cross',
  dropoff_lat: 51.5308,
  dropoff_lng: -0.1238,
  seats_requested: 1
}).select().single();

// 3. Booking confirmed automatically
```

### Use Case 2: Driver Manages Active Ride
```typescript
// 1. Start tracking
await supabase.rpc('start_ride_tracking', {
  p_ride_id: rideId,
  p_initial_lat: currentLat,
  p_initial_lng: currentLng
});

// 2. Update location every 30 seconds
setInterval(async () => {
  await supabase.rpc('update_ride_location', {
    p_ride_id: rideId,
    p_lat: currentLat,
    p_lng: currentLng,
    p_speed_kmh: currentSpeed,
    p_heading: currentHeading
  });
}, 30000);

// 3. Mark passengers picked up
await supabase.rpc('mark_passenger_picked_up', {
  p_ride_id: rideId,
  p_passenger_id: passengerId
});

// 4. Mark passengers dropped off
await supabase.rpc('mark_passenger_dropped_off', {
  p_ride_id: rideId,
  p_passenger_id: passengerId
});

// 5. Complete ride
await supabase.rpc('complete_ride_tracking', {
  p_ride_id: rideId
});
```

### Use Case 3: User Cancels Booking
```typescript
// 1. Cancel with impact
const { data } = await supabase.rpc('cancel_booking_with_impact', {
  p_booking_id: bookingId,
  p_reason: 'Change of plans'
});

// 2. Show impact to user
const result = data[0];
alert(`Booking cancelled.
Reliability Impact: -${result.reliability_impact} points
New Score: ${result.new_reliability_score}/100
${result.warning_issued ? '\n⚠️ Warning issued' : ''}
${result.restriction_applied ? '\n🚫 Account restricted' : ''}`);
```

### Use Case 4: Complete Post-Ride Flow
```typescript
// 1. Ride completes
await supabase.rpc('complete_ride_tracking', { p_ride_id: rideId });

// 2. Both parties submit reviews
// Passenger reviews driver:
await supabase.rpc('submit_detailed_review', {
  p_booking_id: bookingId,
  p_overall_rating: 5,
  p_punctuality_rating: 5,
  p_cleanliness_rating: 5,
  p_communication_rating: 5,
  p_safety_rating: 5,
  p_comfort_rating: 5,
  p_review_text: 'Excellent driver!',
  p_would_ride_again: true
});

// Driver reviews passenger:
await supabase.rpc('submit_detailed_review', {
  p_booking_id: bookingId,
  p_overall_rating: 5,
  p_punctuality_rating: 5,
  p_cleanliness_rating: 5,
  p_communication_rating: 5,
  p_safety_rating: 5,
  p_comfort_rating: 5,
  p_review_text: 'Great passenger!',
  p_would_ride_again: true
});

// 3. Reliability scores updated automatically
// 4. Achievements checked and awarded
// 5. Environmental impact calculated
```

---

## 🔐 Security Notes

1. **All RPC functions check auth.uid()**
   - Users can only access their own data
   - Exceptions: Public reviews, ride search

2. **RLS policies enforce access control**
   - Even if function bypassed, RLS prevents unauthorized access

3. **Sensitive operations require verification**
   - Cancellations check booking ownership
   - Tracking checks driver ownership
   - Reviews check booking participation

4. **Rate limiting in place**
   - Protects against abuse
   - Configured in rate_limits table

5. **Emergency contacts respected**
   - Only shared when share_location_enabled = true
   - Only in emergency situations

---

## 📱 Mobile Considerations

1. **GPS updates should be throttled**
   - Update every 30 seconds during active tracking
   - Stop when ride completes

2. **Background location requires permission**
   - iOS: Request "Always" permission
   - Android: Request background location

3. **Battery optimization**
   - Pause updates when app backgrounded
   - Resume when foregrounded

4. **Offline support**
   - Queue location updates
   - Sync when connection restored

5. **Push notifications**
   - Critical: Emergency alerts
   - High: Ride started, booking confirmed
   - Normal: Reviews, matches

---

## 🐛 Common Errors

### "Booking not found or cannot be cancelled"
- Booking already cancelled
- User is not the passenger
- Booking status doesn't allow cancellation

### "Ride not found or unauthorized"
- User is not the driver
- Ride doesn't exist
- Ride already completed

### "Review already submitted"
- Duplicate review attempt
- Check if review exists before showing form

### "Not eligible to book"
- Low reliability score
- Active restriction
- Call check_booking_eligibility first

### "Tracking not started or unauthorized"
- Ride tracking not initialized
- User is not the driver
- Call start_ride_tracking first

---

## 📊 Performance Tips

1. **Batch operations when possible**
   - Use bulk_respond_to_ride_requests
   - Query multiple rides at once

2. **Cache reliability scores**
   - Update only after significant changes
   - Use client-side cache for display

3. **Limit match calculations**
   - Run on schedule, not on every request
   - Store results in matches tables

4. **Index usage**
   - All common queries use indexes
   - Monitor slow queries

5. **Realtime subscriptions**
   - Subscribe only to relevant channels
   - Unsubscribe when component unmounts

---

Last Updated: 2024-12-22
