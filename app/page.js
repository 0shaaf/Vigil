'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import EmberStormCanvas from './components/landing/EmberStormCanvas';
import ArchNodes from './components/landing/ArchNodes';
import RadialVaultDial from './components/landing/RadialVaultDial';
import SceneTwo from './components/landing/SceneTwo';
import './components/CSS/hero.css';
import './components/CSS/arch.css';
import './components/CSS/dial.css';

export default function LandingPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [isIntroDone, setIsIntroDone] = useState(false);
  
  // Desktop Steps: 0 (Full Arch) -> 1 (Daughters In) -> 2 (Parents In) -> 3 (Text Faded)
  const [desktopStep, setDesktopStep] = useState(0);

  // Mobile Steps: 0 to 12 (0: Overview, 1: Node 0 Zoom ... 12: Scene 2)
  const [mobileStep, setMobileStep] = useState(0);

  const isCooldownRef = useRef(false);
  const touchStartY = useRef(0);

  // Detect Viewport on Mount & Resize
  useEffect(() => {
    const checkViewport = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkViewport();
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  const mobileActiveNodeIndex = Math.min(5, Math.floor(mobileStep / 2));
  const mobileIsZoomed = mobileStep % 2 === 1 && mobileStep < 12;

  // Virtual Scroll Engine
  useEffect(() => {
    const handleScrollForward = () => {
      if (!isIntroDone || isCooldownRef.current) return;

      if (isMobile) {
        setMobileStep((prev) => {
          if (prev < 12) {
            isCooldownRef.current = true;
            setTimeout(() => { isCooldownRef.current = false; }, 600);
            return prev + 1;
          }
          return prev;
        });
      } else {
        setDesktopStep((prev) => {
          if (prev < 3) {
            isCooldownRef.current = true;
            setTimeout(() => { isCooldownRef.current = false; }, 650);
            return prev + 1;
          }
          return prev;
        });
      }
    };

    const handleScrollBackward = () => {
      if (!isIntroDone || isCooldownRef.current) return;

      if (isMobile) {
        setMobileStep((prev) => {
          if (prev > 0) {
            isCooldownRef.current = true;
            setTimeout(() => { isCooldownRef.current = false; }, 600);
            return prev - 1;
          }
          return prev;
        });
      } else {
        setDesktopStep((prev) => {
          if (prev > 0) {
            isCooldownRef.current = true;
            setTimeout(() => { isCooldownRef.current = false; }, 650);
            return prev - 1;
          }
          return prev;
        });
      }
    };

    const onWheel = (e) => {
      if (e.deltaY > 25) handleScrollForward();
      else if (e.deltaY < -25) handleScrollBackward();
    };

    const onTouchStart = (e) => {
      touchStartY.current = e.touches[0].clientY;
    };

    const onTouchMove = (e) => {
      const deltaY = touchStartY.current - e.touches[0].clientY;
      if (deltaY > 35) handleScrollForward();
      else if (deltaY < -35) handleScrollBackward();
    };

    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });

    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
    };
  }, [isIntroDone, isMobile]);

  // Determine content visibility based on current view
  const isContentHidden = isMobile ? mobileStep > 0 : desktopStep === 3;

  return (
    <div
      className={`hero-root ${
        isIntroDone ? 'intro-ready' : 'intro-playing'
      } ${
        isMobile
          ? `platform-mobile mobile-step-${mobileStep}`
          : `platform-desktop desktop-step-${desktopStep}`
      }`}
    >
      {/* HUD Telemetry Indicator */}
      <div className="hud-step-telemetry">
        <span className="telemetry-live-dot" />
        <span>
          {!isIntroDone
            ? 'INITIALIZING // FAILSAFE DAEMON'
            : isMobile
            ? mobileStep === 12
              ? 'SECTION 02 // ARCHITECTURE'
              : mobileIsZoomed
              ? `MOBILE INSPECTION // NODE 0${mobileActiveNodeIndex + 1}`
              : `MOBILE VAULT DIAL // ALIGNED 0${mobileActiveNodeIndex + 1}`
            : desktopStep === 0
            ? 'FAILSAFE ACTIVE // ALL NODES LINKED'
            : desktopStep === 1
            ? 'STEP 01 // DAUGHTER NODES COLLAPSED'
            : desktopStep === 2
            ? 'STEP 02 // PARENTS RETRACTED'
            : 'STEP 03 // VOID REVEALED'}
        </span>
      </div>

      {/* Ember Storm Canvas: Active once intro completes and until final section */}
      <EmberStormCanvas
        active={isIntroDone && (isMobile ? mobileStep < 12 : desktopStep < 3)}
      />

      {/* Pitch-Dark Ambient Radial Glow */}
      <div className="void-radial-glow" aria-hidden="true" />

      {/* ================= DESKTOP ENGINE (>= 1024px) ================= */}
      <div className="engine-desktop-only">
        <ArchNodes
          scrollStep={desktopStep}
          onIntroFinish={() => setIsIntroDone(true)}
        />
      </div>

      {/* ================= MOBILE ENGINE (< 1024px) ================= */}
      <div className="engine-mobile-only">
        <RadialVaultDial
          activeNodeIndex={mobileActiveNodeIndex}
          isZoomed={mobileIsZoomed}
          onIntroFinish={() => setIsIntroDone(true)}
        />
      </div>

      {/* ================= CENTER FOREGROUND CONTENT ================= */}
      <main className="hero-stage-container">
        <div className={`hero-content-center ${isContentHidden ? 'content-hidden' : ''}`}>
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

          <div className="scroll-step-cue">
            <span className="cue-line" />
            <span className="cue-text">
              {isMobile
                ? mobileStep === 0
                  ? 'SCROLL TO INSPECT DIAL'
                  : mobileStep < 12
                  ? mobileIsZoomed
                    ? 'SCROLL TO ADVANCE'
                    : 'SCROLL TO ZOOM'
                  : '↑ SCROLL UP TO RETURN'
                : desktopStep === 0
                ? 'SCROLL TO DISMANTLE'
                : desktopStep === 1
                ? 'SCROLL FOR SINGULARITY'
                : desktopStep === 2
                ? 'SCROLL TO FADE'
                : '↑ SCROLL UP TO RESTORE'}
            </span>
          </div>
        </div>
      </main>

      {/* Scene Two: Unlocks when user scrolls past all nodes on mobile */}
      {isMobile && <SceneTwo active={mobileStep === 12} />}
    </div>
  );
}