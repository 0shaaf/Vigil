"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ArrowRight, ShieldCheck } from "lucide-react";

// Precomputed static points for 16-tooth circular gear (avoids runtime Math.cos/sin SSR hydration mismatch)
const GEAR_POINTS =
  "91.00,50.00 97.77,54.70 97.08,59.36 89.23,61.90 87.88,65.69 92.33,72.63 89.91,76.67 81.69,76.01 78.99,78.99 80.45,87.10 76.67,89.91 69.33,86.16 65.69,87.88 63.93,95.93 59.36,97.08 54.02,90.80 50.00,91.00 45.30,97.77 40.64,97.08 38.10,89.23 34.31,87.88 27.37,92.33 23.33,89.91 23.99,81.69 21.01,78.99 12.90,80.45 10.09,76.67 13.84,69.33 12.12,65.69 4.07,63.93 2.92,59.36 9.20,54.02 9.00,50.00 2.23,45.30 2.92,40.64 10.77,38.10 12.12,34.31 7.67,27.37 10.09,23.33 18.31,23.99 21.01,21.01 19.55,12.90 23.33,10.09 30.67,13.84 34.31,12.12 36.07,4.07 40.64,2.92 45.98,9.20 50.00,9.00 54.70,2.23 59.36,2.92 61.90,10.77 65.69,12.12 72.63,7.67 76.67,10.09 76.01,18.31 78.99,21.01 87.10,19.55 89.91,23.33 86.16,30.67 87.88,34.31 95.93,36.07 97.08,40.64 90.80,45.98";

// Perfectly circular gear icon holder with geared teeth around perimeter and transparent stroke
function SharpTeethedGear() {
  return (
    <div className="relative w-12 h-12 sm:w-14 sm:h-14 shrink-0 flex items-center justify-center transition-transform duration-500 group-hover/card:scale-105">
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 w-full h-full"
      >
        <polygon
          points={GEAR_POINTS}
          fill="#ff3b19"
          stroke="transparent"
          strokeWidth="0"
        />
      </svg>
      {/* Clear checkmark inside */}
      <Check
        size={20}
        strokeWidth={3.2}
        className="relative z-10 text-black stroke-black"
      />
    </div>
  );
}

export default function LoneWorkerSection() {
  const sectionRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Bi-directional trigger: fades in when entering view, fades out when leaving view
        setIsVisible(entry.isIntersecting);
      },
      {
        threshold: 0.15,
        rootMargin: "-20px 0px -20px 0px",
      }
    );

    const currentEl = sectionRef.current;
    if (currentEl) {
      observer.observe(currentEl);
    }

    return () => {
      if (currentEl) observer.unobserve(currentEl);
    };
  }, []);

  // Track mouse per individual card for dynamic specular gloss
  const handleCardMouseMove = (e) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    card.style.setProperty("--mouse-x", `${x}%`);
    card.style.setProperty("--mouse-y", `${y}%`);
  };

  return (
    <section
      id="lone-worker"
      ref={sectionRef}
      className="relative py-36 sm:py-48 bg-[#07070a] text-white overflow-hidden"
    >
      {/* Ambient background abyss glow with lengthy 1.4s fade */}
      <div 
        className={`absolute top-1/2 right-1/4 -translate-y-1/2 w-[620px] h-[620px] bg-[#ff3b19]/10 rounded-full blur-[170px] pointer-events-none transition-opacity duration-[1400ms] ${
          isVisible ? "opacity-100" : "opacity-0"
        }`} 
      />

      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24 xl:gap-28 items-center">
          
          {/* Left Column: Problem Statement & Context (Translates parallel with fade) */}
          <div
            className={`lg:col-span-5 flex flex-col justify-center text-left abyss-hidden ${
              isVisible ? "abyss-visible" : ""
            }`}
            style={{ transitionDelay: isVisible ? "80ms" : "0ms" }}
          >
            <h2 className="font-['Space_Grotesk'] text-3xl sm:text-5xl lg:text-5xl font-bold tracking-tight text-white uppercase leading-[1.12]">
              Miles off the grid. <br />
              <span className="text-[#ff3b19]">What if an accident happens?</span>
            </h2>

            <p className="mt-8 text-base sm:text-lg text-white/75 font-normal leading-relaxed max-w-lg">
              When you work in remote wilderness, empty industrial sites, solitary transport, or hazardous environments, an injury or dead battery leaves you completely isolated. Nobody knows you need help until it’s too late.
            </p>

            <div className="mt-10">
              <a
                href="#actions"
                className="group inline-flex items-center gap-3 text-sm sm:text-base font-semibold text-[#ff3b19] hover:text-[#ff5233] transition-colors"
              >
                <span>Protect your next field shift</span>
                <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1.5" />
              </a>
            </div>
          </div>

          {/* Right Column: 3 Degrouped, Unaligned Shiny Glassmorphic Cards (1.5x Spacing + Parallel Right-to-Left Slide & Fade) */}
          <div className="lg:col-span-7 flex flex-col space-y-16 sm:space-y-20 lg:space-y-24 relative">
            
            {/* Card 1: Shift Cadence (Tucked left/center) */}
            <div
              onMouseMove={handleCardMouseMove}
              className={`group/card relative self-start w-full sm:w-[92%] shiny-glass-card rounded-2xl p-7 sm:p-8 sm:translate-x-0 abyss-slide-right-hidden ${
                isVisible ? "abyss-slide-right-visible" : ""
              }`}
              style={{ transitionDelay: isVisible ? "160ms" : "0ms" }}
            >
              <div className="flex items-start gap-5 sm:gap-6">
                <SharpTeethedGear />
                <div className="flex-1">
                  <h4 className="text-base sm:text-lg font-semibold text-white tracking-tight">
                    Simple Shift Cadence
                  </h4>
                  <p className="text-xs sm:text-sm text-white/70 mt-1.5 leading-relaxed">
                    Set a timer before entering the field (e.g. 4 hours or end-of-shift). A single tap on your phone confirms you are safe.
                  </p>
                </div>
              </div>
            </div>

            {/* Card 2: Automatic Escalation (Offset further right arbitrarily) */}
            <div
              onMouseMove={handleCardMouseMove}
              className={`group/card relative self-end w-full sm:w-[94%] shiny-glass-card rounded-2xl p-7 sm:p-8 sm:translate-x-6 lg:translate-x-10 abyss-slide-right-hidden ${
                isVisible ? "abyss-slide-right-visible" : ""
              }`}
              style={{ transitionDelay: isVisible ? "320ms" : "0ms" }}
            >
              <div className="flex items-start gap-5 sm:gap-6">
                <SharpTeethedGear />
                <div className="flex-1">
                  <h4 className="text-base sm:text-lg font-semibold text-white tracking-tight">
                    Automatic Escalation
                  </h4>
                  <p className="text-xs sm:text-sm text-white/70 mt-1.5 leading-relaxed">
                    If you don’t check in, Vigil instantly alerts your dispatch team or loved ones with your route, location notes, and response plan.
                  </p>
                </div>
              </div>
            </div>

            {/* Card 3: Encrypted Field Telemetry (Prop card offset inward) */}
            <div
              onMouseMove={handleCardMouseMove}
              className={`group/card relative self-start w-full sm:w-[88%] shiny-glass-card rounded-2xl p-7 sm:p-8 sm:translate-x-2 lg:translate-x-4 abyss-slide-right-hidden ${
                isVisible ? "abyss-slide-right-visible" : ""
              }`}
              style={{ transitionDelay: isVisible ? "480ms" : "0ms" }}
            >
              <div className="flex items-start gap-5 sm:gap-6">
                <SharpTeethedGear />
                <div className="flex-1">
                  <h4 className="text-base sm:text-lg font-semibold text-white tracking-tight">
                    Zero-Signal Contingency Protocol
                  </h4>
                  <p className="text-xs sm:text-sm text-white/70 mt-1.5 leading-relaxed">
                    Cloud servers actively watch your schedule. Even if your phone runs out of battery or loses tower connectivity, your countdown timer never pauses.
                  </p>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
