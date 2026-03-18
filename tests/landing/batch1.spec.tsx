// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('lucide-react', () => {
  const React = require('react');
  const s = (n: string) => (props: any) => React.createElement('span', { 'data-testid': `icon-${n}`, ...props });
  return {
    Car: s('Car'), Users: s('Users'), Leaf: s('Leaf'), Shield: s('Shield'),
    UserPlus: s('UserPlus'), Search: s('Search'), MessageCircle: s('MessageCircle'),
    CheckCircle: s('CheckCircle'), Star: s('Star'), Bell: s('Bell'), Lock: s('Lock'), Phone: s('Phone'),
  };
});

import Hero from '../../src/components/landing/Hero';
import HowItWorks from '../../src/components/landing/HowItWorks';
import Safety from '../../src/components/landing/Safety';

afterEach(cleanup);
const wrap = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

/* ═══════════════════════════════════════
   Hero
   ═══════════════════════════════════════ */
describe('Hero', () => {
  it('shows main heading', () => {
    wrap(<Hero />);
    expect(screen.getByText('Share Rides,')).toBeTruthy();
    expect(screen.getAllByText('Build Community').length).toBeGreaterThanOrEqual(1);
  });

  it('shows description text', () => {
    wrap(<Hero />);
    expect(screen.getByText(/Connect with neighbors, reduce your carbon footprint/)).toBeTruthy();
  });

  it('shows Find a Ride link', () => {
    wrap(<Hero />);
    expect(screen.getByText('Find a Ride')).toBeTruthy();
  });

  it('shows Offer a Ride link', () => {
    wrap(<Hero />);
    expect(screen.getByText('Offer a Ride')).toBeTruthy();
  });

  it('shows feature cards', () => {
    wrap(<Hero />);
    expect(screen.getByText('Easy Matching')).toBeTruthy();
    expect(screen.getByText('Eco-Friendly')).toBeTruthy();
    expect(screen.getAllByText('Build Community').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Safe & Secure')).toBeTruthy();
  });

  it('shows feature descriptions', () => {
    wrap(<Hero />);
    expect(screen.getByText(/Smart algorithm finds the best carpooling matches/)).toBeTruthy();
    expect(screen.getByText(/Reduce emissions and traffic congestion/)).toBeTruthy();
  });

  it('shows stats', () => {
    wrap(<Hero />);
    expect(screen.getByText('50K+')).toBeTruthy();
    expect(screen.getByText('Active Users')).toBeTruthy();
    expect(screen.getByText('200K+')).toBeTruthy();
    expect(screen.getByText('Rides Shared')).toBeTruthy();
    expect(screen.getByText('1M+')).toBeTruthy();
    expect(screen.getByText('Miles Saved')).toBeTruthy();
  });

  it('renders lucide icons', () => {
    wrap(<Hero />);
    expect(document.querySelector('[data-testid="icon-Car"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="icon-Leaf"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="icon-Users"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="icon-Shield"]')).toBeTruthy();
  });

  it('Find a Ride links to /find-rides', () => {
    wrap(<Hero />);
    const link = screen.getByText('Find a Ride').closest('a');
    expect(link?.getAttribute('href')).toBe('/find-rides');
  });

  it('Offer a Ride links to /post-ride', () => {
    wrap(<Hero />);
    const link = screen.getByText('Offer a Ride').closest('a');
    expect(link?.getAttribute('href')).toBe('/post-ride');
  });
});

/* ═══════════════════════════════════════
   HowItWorks
   ═══════════════════════════════════════ */
describe('HowItWorks', () => {
  it('shows section heading', () => {
    wrap(<HowItWorks />);
    expect(screen.getByText('How It Works')).toBeTruthy();
  });

  it('shows subtitle', () => {
    wrap(<HowItWorks />);
    expect(screen.getByText(/Getting started with Carpool Network is simple/)).toBeTruthy();
  });

  it('shows all 4 steps', () => {
    wrap(<HowItWorks />);
    expect(screen.getByText('Create Your Profile')).toBeTruthy();
    expect(screen.getByText('Find or Offer Rides')).toBeTruthy();
    expect(screen.getByText('Connect & Coordinate')).toBeTruthy();
    expect(screen.getByText('Share the Journey')).toBeTruthy();
  });

  it('shows step descriptions', () => {
    wrap(<HowItWorks />);
    expect(screen.getByText(/Sign up and tell us about yourself/)).toBeTruthy();
    expect(screen.getByText(/Search for rides that match your schedule/)).toBeTruthy();
    expect(screen.getByText(/Chat with potential carpoolers/)).toBeTruthy();
    expect(screen.getByText(/Meet your carpool partners/)).toBeTruthy();
  });

  it('shows step numbers', () => {
    wrap(<HowItWorks />);
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText('4')).toBeTruthy();
  });

  it('shows Get Started Today CTA', () => {
    wrap(<HowItWorks />);
    expect(screen.getByText('Get Started Today')).toBeTruthy();
  });

  it('Get Started links to /signup', () => {
    wrap(<HowItWorks />);
    const link = screen.getByText('Get Started Today').closest('a');
    expect(link?.getAttribute('href')).toBe('/signup');
  });
});

/* ═══════════════════════════════════════
   Safety
   ═══════════════════════════════════════ */
describe('Safety', () => {
  it('shows main heading', () => {
    wrap(<Safety />);
    expect(screen.getByText('Your Safety is Our Priority')).toBeTruthy();
  });

  it('shows subtitle', () => {
    wrap(<Safety />);
    expect(screen.getByText(/comprehensive safety features/)).toBeTruthy();
  });

  it('shows all 6 features', () => {
    wrap(<Safety />);
    expect(screen.getByText('Verified Profiles')).toBeTruthy();
    expect(screen.getByText('Rating System')).toBeTruthy();
    expect(screen.getByText('Real-Time Tracking')).toBeTruthy();
    expect(screen.getByText('Secure Messaging')).toBeTruthy();
    expect(screen.getByText('Community Trust')).toBeTruthy();
    expect(screen.getByText('Emergency Support')).toBeTruthy();
  });

  it('shows feature descriptions', () => {
    wrap(<Safety />);
    expect(screen.getByText(/All users undergo verification/)).toBeTruthy();
    expect(screen.getByText(/Encrypted in-app communication/)).toBeTruthy();
  });

  it('shows community guidelines section', () => {
    wrap(<Safety />);
    expect(screen.getByText('Community Safety Guidelines')).toBeTruthy();
    expect(screen.getByText(/zero tolerance for harassment/)).toBeTruthy();
  });

  it('shows Read Our Guidelines link', () => {
    wrap(<Safety />);
    expect(screen.getByText('Read Our Guidelines')).toBeTruthy();
  });

  it('guidelines link goes to /help', () => {
    wrap(<Safety />);
    const link = screen.getByText('Read Our Guidelines').closest('a');
    expect(link?.getAttribute('href')).toBe('/help');
  });
});
