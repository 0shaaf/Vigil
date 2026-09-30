'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import EmberStormCanvas from './components/landing/EmberStormCanvas';
import ArchNodes from './components/landing/ArchNodes';
import './hero.css';

export default function LandingPage() {
  // scrollStep: 0 (Full Hero) | 1 (Daughters In) | 2 (Parents In) | 3 (Text Faded)
  const [scrollStep, setScrollStep] = useState(0);
  const [isIntroDone, setIsIntroDone] = useState(false);
  const isCooldownRef = useRef(false);
  const touchStartY = useRef(0);

  useEffect(() => {
    const handleWheel = (e) => {
      if (!isIntroDone || isCooldownRef.current) return;

      if (e.deltaY > 25) {
        // Scroll Down: advance step up to 3
        setScrollStep((prev) => {
          if (prev < 3) {
            isCooldownRef.current = true;
            setTimeout(() => {
              isCooldownRef.current = false;
            }, 650);
            return prev + 1;
          }
          return prev;
        });
      } else if (e.deltaY < -25) {
        // Scroll Up: reverse step down to 0
        setScrollStep((prev) => {
          if (prev > 0) {
            isCooldownRef.current = true;
            setTimeout(() => {
              isCooldownRef.current = false;
            }, 650);
            return prev - 1;
          }
          return prev;
        });
      }
    };

    const handleTouchStart = (e) => {
      touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e) => {
      if (!isIntroDone || isCooldownRef.current) return;
      const deltaY = touchStartY.current - e.touches[0].clientY;

      if (deltaY > 40) {
        setScrollStep((prev) => {
          if (prev < 3) {
            isCooldownRef.current = true;
            setTimeout(() => {
              isCooldownRef.current = false;
            }, 650);
            return prev + 1;
          }
          return prev;
        });
      } else if (deltaY < -40) {
        setScrollStep((prev) => {
          if (prev > 0) {
            isCooldownRef.current = true;
            setTimeout(() => {
              isCooldownRef.current = false;
            }, 650);
            return prev - 1;
          }
          return prev;
        });
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [isIntroDone]);

  return (
    <div
      className={`hero-root ${
        isIntroDone ? `intro-ready scroll-step-${scrollStep}` : 'intro-playing'
      }`}
    >
      {/* Background Ember Storm: Active only until everything fades out at Step 3 */}
      <EmberStormCanvas active={isIntroDone && scrollStep < 3} />

      {/* Pure Void Pitch-Dark Ambient Base */}
      <div className="void-radial-glow" aria-hidden="true" />

      {/* Main Centered Stage */}
      <main className="hero-stage-container">
        {/* Step-Driven Arch Mitosis */}
        <ArchNodes
          scrollStep={scrollStep}
          isIntroDone={isIntroDone}
          onIntroFinish={() => setIsIntroDone(true)}
        />

        {/* Central Core: Fades out smoothly at Step 3 */}
        <div className={`hero-content-center ${scrollStep === 3 ? 'content-hidden' : ''}`}>
          <h1 className="hero-headline">
            Get help when <br />
            <span className="flame-gradient-text">no one knows you need it.</span>
          </h1>

          <div className="hero-cta-wrapper">
            <Link href="/dashboard" id="hero-cta-btn" className="btn-ripple-action">
              <i className="animation" />
              <span>SET YOUR SWITCH</span>
              <i className="animation" />
            </Link>
          </div>

          {/* Dynamic Scroll Cue based on current step */}
          <div className="scroll-step-cue">
            <span className="cue-line" />
            <span className="cue-text">
              {scrollStep === 0 && 'SCROLL TO DISMANTLE'}
              {scrollStep === 1 && 'SCROLL FOR SINGULARITY'}
              {scrollStep === 2 && 'SCROLL TO FADE'}
              {scrollStep === 3 && '↑ SCROLL UP TO RESTORE'}
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}