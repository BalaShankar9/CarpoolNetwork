/**
 * profileNavigation.spec.ts — Tests for profile navigation utility
 */
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import {
  getUserProfilePath,
  navigateToUserProfile,
  openProfileInNewTab,
} from '../../src/utils/profileNavigation';

describe('getUserProfilePath', () => {
  it('returns /profile when viewing own profile', () => {
    expect(getUserProfilePath('user-123', 'user-123')).toBe('/profile');
  });

  it('returns /user/:id for other users', () => {
    expect(getUserProfilePath('user-456', 'user-123')).toBe('/user/user-456');
  });

  it('returns /user/:id when currentUserId is null', () => {
    expect(getUserProfilePath('user-456', null)).toBe('/user/user-456');
  });

  it('returns /user/:id when currentUserId is undefined', () => {
    expect(getUserProfilePath('user-456', undefined)).toBe('/user/user-456');
  });
});

describe('navigateToUserProfile', () => {
  it('calls navigate with /profile for own profile', () => {
    const nav = vi.fn();
    navigateToUserProfile('u1', 'u1', nav);
    expect(nav).toHaveBeenCalledWith('/profile');
  });

  it('calls navigate with /user/:id for other users', () => {
    const nav = vi.fn();
    navigateToUserProfile('u2', 'u1', nav);
    expect(nav).toHaveBeenCalledWith('/user/u2');
  });
});

describe('openProfileInNewTab', () => {
  it('opens correct URL in new tab with noopener', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    openProfileInNewTab('user-789');
    expect(openSpy).toHaveBeenCalledWith(
      expect.stringContaining('/user/user-789'),
      '_blank',
      'noopener,noreferrer',
    );
    openSpy.mockRestore();
  });
});
