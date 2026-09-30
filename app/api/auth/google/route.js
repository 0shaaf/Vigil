'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from './components/landing/Navbar';
import EmberStormCanvas from './components/landing/EmberStormCanvas';
import ArchNodes from './components/landing/ArchNodes';
import './hero.css';

const CTA_GISTS = [
  'SET YOUR SWITCH',
  'SAVE YOUR FUTURE',
  'LEAVE NOTHING UNSAID',
  'ARM THE FAILSAFE',
  'SECURE YOUR SILENCE',
];

export default function LandingPage() {
  const [gistIndex, setGistIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsFading(true);
      setTimeout(() => {
        setGistIndex((prev) => (prev + 1) % CTA_GISTS.length);
        setIsFading(false);
      }, 240);
    }, 2800);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="hero-root">
      {/* Flush Architectural Header */}
      <Navbar />

      {/* Ember Storm with Button Collision */}
      <EmberStormCanvas />

      {/* Pure CSS Void Base */}
      <div className="void-radial-glow" aria-hidden="true" />

      {/* Centered Main Stage */}
      <main className="hero-stage-container">
        {/* The Choreographed Unfolding Arches */}
        <ArchNodes />

        {/* Central Content */}
        <div className="hero-content-center">
          <h1 className="hero-headline">
            Get help when <br />
            <span className="flame-gradient-text">no one knows you need it.</span>
          </h1>

          <div className="hero-cta-wrapper">
            <Link href="/dashboard" id="hero-cta-btn" className="btn-molten-switch">
              <span className="btn-sheen-beam" />
              <span className="btn-text-content">
                <span className={`gist-rotator ${isFading ? 'fade-out' : 'fade-in'}`}>
                  {CTA_GISTS[gistIndex]}
                </span>
                <svg className="btn-icon" width="15" height="15" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M3 8h10M9 4l4 4-4 4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}