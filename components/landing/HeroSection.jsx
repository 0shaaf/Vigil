"use client";

import Link from "next/link";
import SentinelVector from "@/components/landing/SentinelVector";

export default function HeroSection() {
  return (
    <section className="relative min-h-screen bg-white text-black px-4 sm:px-8 lg:px-12 pt-24 sm:pt-28 pb-16 sm:pb-20 flex flex-col justify-between overflow-hidden">
      {/* Main Body Grid: Left Content + Right Vector Graphic */}
      <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center my-auto py-6 sm:py-8 z-10">
        
        {/* Left Column: Vertically balanced copy and CTAs with dedicated left padding */}
        <div className="lg:col-span-6 xl:col-span-6 flex flex-col justify-center text-left pl-2 sm:pl-4 lg:pl-6 xl:pl-8 pr-2 sm:pr-4">
          
          {/* Punchy Headline (scaled up) */}
          <h1 className="font-['Space_Grotesk'] text-3xl sm:text-5xl lg:text-[3.25rem] xl:text-[3.85rem] font-bold tracking-tight text-black leading-[1.08] uppercase">
            When you go silent, <br />
            <span className="text-[#ff3b19]">
              Vigil speaks for you.
            </span>
          </h1>

          {/* Short Descriptive Line (kept identical size) */}
          <p className="mt-4 sm:mt-5 text-sm sm:text-base lg:text-base text-black/75 font-normal leading-relaxed max-w-lg">
            Vigil is your automated safety guardian. It checks in at the intervals you define. If you don’t respond, it immediately takes the actions you chose—alerting your family, notifying your partners, or releasing critical instructions to trusted hands.
          </p>

          {/* High-Converting Action Stack with 'or' divider and non-breaking button texts */}
          <div className="mt-7 sm:mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
            <Link
              href="/signup"
              className="animated-cta-button whitespace-nowrap"
            >
              <svg viewBox="0 0 24 24" className="arr-2" xmlns="http://www.w3.org/2000/svg">
                <path d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z" />
              </svg>
              <span className="text whitespace-nowrap">Arm Your First Check-In</span>
              <span className="circle" />
              <svg viewBox="0 0 24 24" className="arr-1" xmlns="http://www.w3.org/2000/svg">
                <path d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z" />
              </svg>
            </Link>

            <span className="text-black/35 font-semibold text-xs uppercase tracking-widest text-center select-none py-1 sm:py-0 px-1 whitespace-nowrap">
              or
            </span>

            <a
              href="#lone-worker"
              className="inline-flex items-center justify-center px-6 py-3.5 rounded-full text-xs sm:text-sm font-semibold text-black/80 hover:text-black border border-black/20 hover:border-black/50 transition-colors whitespace-nowrap shrink-0"
            >
              Explore Scenarios ↓
            </a>
          </div>
        </div>

        {/* Right Column: Prominent 1.5x Scaled Sentinel Insignia Logo */}
        <div className="lg:col-span-6 xl:col-span-6 flex items-center justify-center lg:justify-end p-2 sm:p-4">
          <div className="relative w-full max-w-[700px] xl:max-w-[780px] flex items-center justify-center">
            <SentinelVector className="w-full h-auto drop-shadow-sm scale-105" />
          </div>
        </div>
      </div>

      {/* Non-Flat SVG Section Divider (Sharp V-Wedge transitioning into Section 2) */}
      <div className="absolute bottom-0 left-0 right-0 w-full overflow-hidden leading-none pointer-events-none z-20">
        <svg
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
          className="relative block w-full h-12 sm:h-16 lg:h-20 text-[#07070a]"
        >
          {/* Blood-Orange Hairline Accent along the chevron edge */}
          <path
            d="M0,0 L600,90 L1200,0"
            fill="none"
            stroke="#ff3b19"
            strokeWidth="2"
            strokeOpacity="0.5"
          />
          {/* Solid Black Fill merging seamlessly into Section 2 */}
          <path
            d="M0,0 L600,90 L1200,0 L1200,120 L0,120 Z"
            fill="currentColor"
          />
        </svg>
      </div>
    </section>
  );
}
