"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Users, ArrowRight, FolderLock } from "lucide-react";

export default function BusinessSection() {
  const sectionRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
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

  // Track mouse per individual card for dynamic specular gloss identical to Section 2
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
      id="business"
      ref={sectionRef}
      className="relative py-24 sm:py-28 lg:py-32 bg-[#07070a] text-white border-t border-white/10 overflow-hidden"
    >
      {/* Subtle ambient abyss glow */}
      <div
        className={`absolute top-1/2 right-1/4 -translate-y-1/2 w-[600px] h-[600px] bg-[#ff3b19]/8 rounded-full blur-[180px] pointer-events-none transition-opacity duration-[1200ms] ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Main Content Layout */}
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-14 lg:gap-20 xl:gap-28 items-center">
          
          {/* Left Area: Fades in from the left edge */}
          <div
            className={`lg:col-span-5 xl:col-span-5 flex flex-col justify-center text-left transition-all duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
              isVisible
                ? "opacity-100 translate-x-0"
                : "opacity-0 -translate-x-16 sm:-translate-x-24 pointer-events-none"
            }`}
            style={{ transitionDelay: isVisible ? "80ms" : "0ms" }}
          >
            <h2 className="font-['Space_Grotesk'] text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white uppercase leading-tight">
              What happens to your business <br />
              <span className="text-[#ff3b19]">AFTER YOU?</span>
            </h2>

            <p className="mt-5 text-sm sm:text-base text-white/75 font-normal leading-relaxed">
              Founders and key executives are often the sole custodians of essential corporate intelligence: bank signing powers, cloud root keys, cap table records, and emergency handover directives. If an unforeseen accident occurs, companies freeze.
            </p>

            {/* Safeguard Feature Cards - Half size & Summarized */}
            <div className="mt-7 space-y-3 sm:space-y-3.5">
              <div
                onMouseMove={handleCardMouseMove}
                className="group/card relative shiny-glass-card rounded-xl p-4 sm:p-4.5 transition-all"
              >
                <div className="flex items-start gap-3.5 sm:gap-4">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#ff3b19]/15 border border-[#ff3b19]/30 text-[#ff3b19] flex items-center justify-center shrink-0 transition-transform duration-500 group-hover/card:scale-105 shadow-[0_0_15px_rgba(255,59,25,0.15)]">
                    <FolderLock size={18} className="text-[#ff3b19]" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm sm:text-base font-semibold text-white tracking-tight">
                      Automated Vault Release
                    </h4>
                    <p className="text-xs text-white/70 mt-0.5 leading-relaxed">
                      Sensitive files auto-shared with co-founders only if you fail to check in.
                    </p>
                  </div>
                </div>
              </div>

              <div
                onMouseMove={handleCardMouseMove}
                className="group/card relative shiny-glass-card rounded-xl p-4 sm:p-4.5 transition-all"
              >
                <div className="flex items-start gap-3.5 sm:gap-4">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#ff3b19]/15 border border-[#ff3b19]/30 text-[#ff3b19] flex items-center justify-center shrink-0 transition-transform duration-500 group-hover/card:scale-105 shadow-[0_0_15px_rgba(255,59,25,0.15)]">
                    <Users size={18} className="text-[#ff3b19]" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm sm:text-base font-semibold text-white tracking-tight">
                      Tiered Key Routing
                    </h4>
                    <p className="text-xs text-white/70 mt-0.5 leading-relaxed">
                      Route root credentials to your CTO, legal to counsel, and banking to the Board.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Link */}
            <div className="mt-8">
              <a
                href="#actions"
                className="group inline-flex items-center gap-3 text-sm font-semibold text-[#ff3b19] hover:text-[#ff5233] transition-colors"
              >
                <span>Safeguard your business continuity</span>
                <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1.5" />
              </a>
            </div>
          </div>

          {/* Right Area: Fades in from the right edge */}
          <div
            className={`lg:col-span-7 xl:col-span-7 relative flex items-center justify-start w-full transition-all duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
              isVisible
                ? "opacity-100 translate-x-0"
                : "opacity-0 translate-x-16 sm:translate-x-24 pointer-events-none"
            }`}
            style={{ transitionDelay: isVisible ? "160ms" : "0ms" }}
          >
            <div className="relative w-full lg:w-[130%] xl:w-[145%] max-w-none h-[340px] sm:h-[420px] lg:h-[500px] xl:h-[560px] origin-left">
              <Image
                src="/assets/sec4.jpeg"
                alt="Founder and corporate custodians continuity"
                fill
                priority
                unoptimized
                sizes="(max-width: 1024px) 100vw, 60vw"
                className="object-cover object-left pointer-events-none select-none"
              />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}




