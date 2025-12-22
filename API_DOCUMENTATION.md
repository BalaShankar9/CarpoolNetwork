# Carpool Network - API Documentation

## Overview

This document describes the API endpoints, database functions, and edge functions available in the Carpool Network platform.

## Authentication

All API requests require authentication via Supabase Auth. Include the auth token in requests:

```javascript
const { data, error } = await supabase.auth.getSession();
const token = data.session?.access_token;
```

## Database Functions (RPC)

### Ride Management

#### `create_atomic_ride`
Creates a ride with atomic transaction guarantees.

```typescript
const { data, error } = await supabase.rpc('create_atomic_ride', {
  p_origin: 'London',
  p_destination: 'Manchester',
  p_departure_time: '2024-01-15T09:00:00Z',
  p_available_seats: 3,
  p_price_per_seat: 15.00,
  p_vehicle_id: 'uuid',
  p_metadata: {}
});
```

#### `book_ride_atomic`
Books a ride with seat availability check.

```typescript
const { data, error } = await supabase.rpc('book_ride_atomic', {
  p_ride_id: 'ride-uuid',
  p_seats_requested: 2
});
```

#### `cancel_booking_with_penalty`
Cancels a booking and tracks cancellation history.

```typescript
const { data, error } = await supabase.rpc('cancel_booking_with_penalty', {
  p_booking_id: 'booking-uuid',
  p_reason: 'Changed plans'
});
```

### Performance & Monitoring

#### `track_performance_metric`
Log performance metrics.

```typescript
const { data, error } = await supabase.rpc('track_performance_metric', {
  p_metric_type: 'api_call',
  p_metric_name: 'get_rides',
  p_value: 123.45,
  p_unit: 'ms',
  p_endpoint: '/api/rides',
  p_metadata: {}
});
```

#### `get_system_health`
Get overall system health status.

```typescript
const { data, error } = await supabase.rpc('get_system_health');
// Returns: {
//   overall_status: 'healthy',
//   database_status: 'healthy',
//   recent_errors: 2,
//   avg_response_time_ms: 150.5,
//   cache_hit_rate: 85.3,
//   active_users: 42
// }
```

### Smart Recommendations

#### `get_smart_recommendations`
Get personalized ride recommendations.

```typescript
const { data, error } = await supabase.rpc('get_smart_recommendations', {
  p_user_id: 'user-uuid',
  p_limit: 10
});
```

#### `optimize_search_results`
Get ML-optimized search results.

```typescript
const { data, error } = await supabase.rpc('optimize_search_results', {
  p_user_id: 'user-uuid',
  p_origin: 'London',
  p_destination: 'Manchester',
  p_departure_date: '2024-01-15T09:00:00Z'
});
```

### Location Tracking

#### `update_live_location`
Update user's current location.

```typescript
const { data, error } = await supabase.rpc('update_live_location', {
  p_latitude: 51.5074,
  p_longitude: -0.1278,
  p_ride_id: 'ride-uuid'
});
```

### Notifications

#### `queue_notification`
Queue a notification for a user.

```typescript
const { data, error } = await supabase.rpc('queue_notification', {
  p_user_id: 'user-uuid',
  p_type: 'ride_request',
  p_title: 'New Ride Request',
  p_body: 'Someone wants to join your ride!',
  p_data: { ride_id: 'ride-uuid' }
});
```

#### `mark_notification_read`
Mark notification as read.

```typescript
const { data, error } = await supabase.rpc('mark_notification_read', {
  p_notification_id: 'notification-uuid'
});
```

#### `get_unread_notification_count`
Get count of unread notifications.

```typescript
const { data, error } = await supabase.rpc('get_unread_notification_count');
// Returns: 5
```

### Feature Flags

#### `is_feature_enabled`
Check if a feature flag is enabled.

```typescript
const { data, error } = await supabase.rpc('is_feature_enabled', {
  p_flag_key: 'new_matching_algorithm'
});
// Returns: true/false
```

### Admin Functions

#### `toggle_admin_status`
Toggle admin status for a user (admin only).

```typescript
const { data, error } = await supabase.rpc('toggle_admin_status', {
  p_user_id: 'user-uuid',
  p_is_admin: true
});
```

## Edge Functions

### `validate-email`
Validates email addresses using external service.

**Endpoint:** `POST /functions/v1/validate-email`

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "valid": true,
  "disposable": false,
  "score": 0.95
}
```

### `vehicle-lookup`
Looks up UK vehicle details by registration.

**Endpoint:** `POST /functions/v1/vehicle-lookup`

**Request:**
```json
{
  "registration": "AB12CDE"
}
```

**Response:**
```json
{
  "make": "Ford",
  "model": "Focus",
  "year": 2020,
  "color": "Blue",
  "fuel_type": "Petrol"
}
```

### `gemini-proxy`
Proxies requests to Google Gemini AI API.

**Endpoint:** `POST /functions/v1/gemini-proxy`

**Request:**
```json
{
  "prompt": "How can I reduce my carbon footprint?",
  "context": "carpooling"
}
```

**Response:**
```json
{
  "response": "Here are some ways to reduce your carbon footprint...",
  "confidence": 0.95
}
```

## Real-time Subscriptions

### Live Locations
Subscribe to real-time location updates for a ride.

```typescript
const channel = supabase
  .channel('ride_locations_123')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'live_locations',
      filter: 'ride_id=eq.ride-uuid'
    },
    (payload) => {
      console.log('Location updated:', payload);
    }
  )
  .subscribe();
```

### Messages
Subscribe to new messages in a conversation.

```typescript
const channel = supabase
  .channel('messages_456')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: 'ride_id=eq.ride-uuid'
    },
    (payload) => {
      console.log('New message:', payload);
    }
  )
  .subscribe();
```

### Notifications
Subscribe to notification updates.

```typescript
const channel = supabase
  .channel('notifications')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'notification_history',
      filter: `user_id=eq.${userId}`
    },
    (payload) => {
      console.log('New notification:', payload);
    }
  )
  .subscribe();
```

## Direct Table Access

### Rides

**Get all active rides:**
```typescript
const { data, error } = await supabase
  .from('rides')
  .select('*, driver:profiles(*), vehicle:vehicles(*)')
  .eq('status', 'active')
  .gte('departure_time', new Date().toISOString())
  .order('departure_time', { ascending: true });
```

**Create a ride:**
```typescript
const { data, error } = await supabase
  .from('rides')
  .insert({
    origin: 'London',
    destination: 'Manchester',
    departure_time: '2024-01-15T09:00:00Z',
    available_seats: 3,
    price_per_seat: 15.00,
    vehicle_id: 'vehicle-uuid'
  })
  .select();
```

### Bookings

**Get user's bookings:**
```typescript
const { data, error } = await supabase
  .from('bookings')
  .select(`
    *,
    ride:rides(*),
    driver:rides(driver:profiles(*))
  `)
  .eq('passenger_id', userId)
  .order('created_at', { ascending: false });
```

**Create booking:**
```typescript
const { data, error } = await supabase
  .from('bookings')
  .insert({
    ride_id: 'ride-uuid',
    seats_booked: 2,
    total_price: 30.00
  })
  .select();
```

### Profiles

**Get profile:**
```typescript
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .single();
```

**Update profile:**
```typescript
const { data, error } = await supabase
  .from('profiles')
  .update({
    full_name: 'John Doe',
    bio: 'Love carpooling!',
    preferences: {
      smoking: false,
      pets: true,
      music: true
    }
  })
  .eq('id', userId);
```

## Error Handling

All API calls should handle errors appropriately:

```typescript
const { data, error } = await supabase.rpc('some_function');

if (error) {
  console.error('API Error:', error);

  // Log error
  await supabase.rpc('log_error', {
    p_error_type: 'api_error',
    p_error_message: error.message,
    p_severity: 'error'
  });

  // Show user-friendly message
  toast.error('Something went wrong. Please try again.');

  return;
}

// Process data
console.log('Success:', data);
```

## Rate Limiting

API requests are rate-limited per user:
- **Standard users:** 100 requests per minute
- **Verified users:** 200 requests per minute
- **Admin users:** Unlimited

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000
```

## Best Practices

1. **Always handle errors** - Never assume API calls will succeed
2. **Use RPC functions** for complex operations requiring transactions
3. **Batch requests** when possible to reduce round trips
4. **Cache data** appropriately to reduce API calls
5. **Subscribe to real-time** for live data instead of polling
6. **Use select()** to only fetch needed columns
7. **Implement pagination** for large datasets
8. **Log errors** for debugging and monitoring
9. **Validate input** before making API calls
10. **Use TypeScript** types for type safety

## Support

For API issues or questions:
- Check error logs in admin dashboard
- Review Supabase logs
- Contact support team
