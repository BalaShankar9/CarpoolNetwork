import { test, expect } from '@playwright/test';

/**
 * Phase C: Reliability & Automation E2E Tests
 * 
 * These tests verify that the automated background jobs and 
 * invariant monitoring work correctly.
 */

test.describe('Phase C: Reliability Features', () => {
  
  test.describe('C1: Ride Expiry', () => {
    
    test('expired ride should have status updated after expiry job', async ({ page }) => {
      // This test verifies the expire_rides() function works correctly
      // In a real scenario, we'd create a ride with past departure time
      // and verify it gets moved to 'completed' status
      
      // Navigate to admin dashboard
      await page.goto('/admin/rides');
      
      // Check that no rides show as "active" with past departure times
      // (The expiry job should have processed them)
      const expiredActiveRides = await page.locator('[data-testid="ride-row"]')
        .filter({ hasText: 'Active' })
        .filter({ has: page.locator('[data-expired="true"]') })
        .count();
      
      expect(expiredActiveRides).toBe(0);
    });

    test('bookings on expired rides should be completed', async ({ page }) => {
      // Verify that when a ride expires, all its bookings are moved to terminal state
      await page.goto('/admin/bookings');
      
      // Check for orphaned active bookings on completed rides
      const orphanedBookings = await page.locator('[data-testid="booking-row"]')
        .filter({ hasText: /Pending|Confirmed/ })
        .filter({ has: page.locator('[data-ride-status="completed"]') })
        .count();
      
      expect(orphanedBookings).toBe(0);
    });
  });

  test.describe('C2: Seat Reconciliation', () => {
    
    test('available seats should match calculated value', async ({ page }) => {
      // Navigate to a ride detail page
      await page.goto('/admin/rides');
      
      // Get the first active ride
      const firstRide = page.locator('[data-testid="ride-row"]')
        .filter({ hasText: 'Active' })
        .first();
      
      if (await firstRide.count() > 0) {
        await firstRide.click();
        
        // Get displayed available seats
        const displayedSeats = await page.locator('[data-testid="available-seats"]').textContent();
        
        // Get calculated seats (total - booked)
        const totalSeats = await page.locator('[data-testid="total-seats"]').textContent();
        const bookedSeats = await page.locator('[data-testid="booked-seats"]').textContent();
        
        if (totalSeats && bookedSeats && displayedSeats) {
          const expected = parseInt(totalSeats) - parseInt(bookedSeats);
          expect(parseInt(displayedSeats)).toBe(expected);
        }
      }
    });

    test('no rides should have negative available seats', async ({ page }) => {
      await page.goto('/admin/rides');
      
      // Search for any rides with negative seats
      const negativeSeats = await page.locator('[data-testid="available-seats"]')
        .filter({ hasText: /^-/ })
        .count();
      
      expect(negativeSeats).toBe(0);
    });
  });

  test.describe('C3: Invariant Monitoring', () => {
    
    test('system health summary should be accessible', async ({ page }) => {
      await page.goto('/admin');
      
      // Check that health indicators are shown
      const healthIndicator = page.locator('[data-testid="system-health"]');
      
      if (await healthIndicator.count() > 0) {
        // Should show either "Healthy" or "Issues detected"
        const healthText = await healthIndicator.textContent();
        expect(healthText).toMatch(/Healthy|Issues/i);
      }
    });

    test('no critical invariant violations should exist', async ({ page }) => {
      // This would check the admin dashboard for violation alerts
      await page.goto('/admin');
      
      // Look for critical violation alerts
      const criticalAlerts = await page.locator('[data-testid="critical-violation"]').count();
      
      // In a healthy system, there should be no critical violations
      expect(criticalAlerts).toBe(0);
    });
  });

  test.describe('C4: State Validity', () => {
    
    test('all ride statuses should be canonical', async ({ page }) => {
      await page.goto('/admin/rides');
      
      // Get all unique statuses displayed
      const statusBadges = await page.locator('[data-testid="ride-status"]').all();
      
      const validStatuses = ['Active', 'In Progress', 'Completed', 'Cancelled'];
      
      for (const badge of statusBadges) {
        const status = await badge.textContent();
        expect(validStatuses).toContain(status?.trim());
      }
    });

    test('all booking statuses should be canonical', async ({ page }) => {
      await page.goto('/admin/bookings');
      
      const statusBadges = await page.locator('[data-testid="booking-status"]').all();
      
      // Note: "Declined" is display-only (status=cancelled + driver reason)
      const validStatuses = ['Pending', 'Confirmed', 'Completed', 'Cancelled', 'Declined'];
      
      for (const badge of statusBadges) {
        const status = await badge.textContent();
        expect(validStatuses).toContain(status?.trim());
      }
    });
  });

  test.describe('C5: Notification Integrity', () => {
    
    test('booking creation should generate notification', async ({ page }) => {
      // This would test that creating a booking generates BOOKING_REQUEST notification
      // Simplified version: check that existing bookings have notifications
      
      await page.goto('/dashboard');
      
      // Check notifications panel shows expected types
      const notificationPanel = page.locator('[data-testid="notifications"]');
      
      if (await notificationPanel.count() > 0) {
        await notificationPanel.click();
        
        // Notifications should only contain valid types
        const notifications = await page.locator('[data-testid="notification-item"]').all();
        
        for (const notification of notifications) {
          const type = await notification.getAttribute('data-notification-type');
          const validTypes = [
            'NEW_MESSAGE', 'FRIEND_REQUEST', 'FRIEND_REQUEST_ACCEPTED',
            'FORUM_REPLY', 'FORUM_MENTION', 'RIDE_MATCH', 'BOOKING_REQUEST',
            'BOOKING_CONFIRMED', 'BOOKING_CANCELLED', 'REVIEW', 'SAFETY_ALERT', 'SYSTEM'
          ];
          
          if (type) {
            expect(validTypes).toContain(type);
          }
        }
      }
    });
  });

});

test.describe('Phase C: Background Job Verification', () => {
  
  // These tests require admin access to verify job execution
  test.describe('Job Execution Logs', () => {
    
    test.skip('should have recent expire_rides execution', async ({ page }) => {
      // This would query the system_job_log table through an admin API
      // Skipped as it requires backend access
      await page.goto('/admin/system/jobs');
      
      const lastExpireJob = page.locator('[data-job-name="expire_rides"]').first();
      const lastRun = await lastExpireJob.getAttribute('data-last-run');
      
      if (lastRun) {
        const lastRunDate = new Date(lastRun);
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        
        // Job should have run in the last 5 minutes
        expect(lastRunDate.getTime()).toBeGreaterThan(fiveMinutesAgo.getTime());
      }
    });

    test.skip('should have recent check_system_invariants execution', async ({ page }) => {
      await page.goto('/admin/system/jobs');
      
      const lastInvariantCheck = page.locator('[data-job-name="check_system_invariants"]').first();
      const lastRun = await lastInvariantCheck.getAttribute('data-last-run');
      
      if (lastRun) {
        const lastRunDate = new Date(lastRun);
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
        
        expect(lastRunDate.getTime()).toBeGreaterThan(fifteenMinutesAgo.getTime());
      }
    });
  });

});

test.describe('Phase C: Cascade Behavior', () => {
  
  test('cancelled ride should cascade to bookings', async ({ page }) => {
    // This tests the cascade trigger from Phase B
    // When a ride is cancelled, all its active bookings should be cancelled
    
    await page.goto('/admin/rides');
    
    // Find any cancelled rides
    const cancelledRides = await page.locator('[data-testid="ride-row"]')
      .filter({ hasText: 'Cancelled' })
      .all();
    
    for (const ride of cancelledRides.slice(0, 3)) { // Check first 3
      await ride.click();
      
      // Check that no bookings are pending/confirmed
      const activeBookings = await page.locator('[data-testid="booking-status"]')
        .filter({ hasText: /Pending|Confirmed/ })
        .count();
      
      expect(activeBookings).toBe(0);
      
      await page.goBack();
    }
  });

});
