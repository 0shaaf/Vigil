"use client";

import { useEffect, useRef, useState } from "react";
import { Heart, Bell, PhoneCall } from "lucide-react";

export default function ElderlySection() {
  const [tapped, setTapped] = useState(false);
  const sectionRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Bi-directional bottom-to-top scroll reveal: animates in when scrolling into view, resets when scrolling away
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

  return (
    <section 
      id="seniors" 
      ref={sectionRef}
      className="relative py-28 sm:py-36 bg-[#ff3b19] text-black border-t-2 border-black overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        {/* Section Header (Translates bottom-to-top with fade) */}
        <div 
          className={`text-center max-w-3xl mx-auto mb-16 slide-up-reveal-hidden ${
            isVisible ? "slide-up-reveal-visible" : ""
          }`}
          style={{ transitionDelay: isVisible ? "80ms" : "0ms" }}
        >
          <h2 className="font-['Space_Grotesk'] text-3xl sm:text-5xl font-bold tracking-tight text-black uppercase leading-tight">
            Independent living shouldn’t mean <br />
            <span>days of silence go unnoticed.</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-black/80 font-medium">
            For older family members living on their own, the fear of an unseen fall or sudden medical emergency weighs heavily on loved ones.
          </p>
        </div>

        {/* Content Splitting into Left and Right Partitions (Translates bottom-to-top with staggered delays) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-stretch">
          {/* Left Partition: The Problem & The Worry */}
          <div 
            className={`p-8 sm:p-10 rounded-3xl bg-black text-white border-2 border-black flex flex-col justify-between slide-up-reveal-hidden ${
              isVisible ? "slide-up-reveal-visible" : ""
            }`}
            style={{ transitionDelay: isVisible ? "220ms" : "0ms" }}
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-[#ff3b19] text-black flex items-center justify-center mb-6 font-bold">
                <Heart size={24} />
              </div>
              <div className="text-xs font-bold text-[#ff3b19] uppercase tracking-widest mb-2">
                The Silent Worry
              </div>
              <h3 className="font-['Space_Grotesk'] text-2xl sm:text-3xl font-bold text-white mb-4">
                What if they slip, and nobody knows?
              </h3>
              <p className="text-sm sm:text-base text-white/75 leading-relaxed">
                Busy work schedules mean children can’t call every single morning. When an aging parent falls or faces a sudden health event, they may be unable to reach a phone. Hours quietly turn into devastating days without anyone checking in.
              </p>
            </div>

            <div className="mt-8 pt-6 border-t border-white/10 text-xs text-white/60 space-y-2.5 font-medium">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ff3b19]" />
                <span>Over 3 million elderly adults are treated for emergency falls each year.</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ff3b19]" />
                <span>Cameras and microphones feel invasive and take away independence.</span>
              </div>
            </div>
          </div>

          {/* Right Partition: The Solution & Peace of Mind */}
          <div 
            className={`p-8 sm:p-10 rounded-3xl bg-black text-white border-2 border-black flex flex-col justify-between slide-up-reveal-hidden ${
              isVisible ? "slide-up-reveal-visible" : ""
            }`}
            style={{ transitionDelay: isVisible ? "380ms" : "0ms" }}
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-[#ff3b19] text-black flex items-center justify-center mb-6 font-bold">
                <Bell size={24} />
              </div>
              <div className="text-xs font-bold text-[#ff3b19] uppercase tracking-widest mb-2">
                The Vigil Reassurance
              </div>
              <h3 className="font-['Space_Grotesk'] text-2xl sm:text-3xl font-bold text-white mb-4">
                A simple morning tap. Total relief.
              </h3>
              <p className="text-sm sm:text-base text-white/75 leading-relaxed mb-6">
                No surveillance. No intrusive monitoring. Just a gentle daily prompt sent to their phone or tablet at breakfast time. If they don’t tap by afternoon, their children or designated neighbors receive an immediate alert.
              </p>

              {/* Interactive Mockup Banner */}
              <div className="p-5 rounded-2xl bg-[#111116] text-white border border-white/10">
                <div className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-2">
                  Daily Check-In Notification Preview
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-bold text-white">Good Morning!</div>
                    <div className="text-xs text-white/70">Confirm you are up and doing well today.</div>
                  </div>
                  <button
                    onClick={() => setTapped(true)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shrink-0 ${
                      tapped
                        ? "bg-emerald-400 text-black"
                        : "bg-[#ff3b19] text-white hover:bg-[#ff5233]"
                    }`}
                  >
                    {tapped ? "✓ All Good Today" : "I'm Safe (Tap)"}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/10 flex items-center gap-2 text-xs text-[#ff3b19] font-semibold">
              <PhoneCall size={15} />
              <span>Direct SMS &amp; Phone call dispatch to up to 5 family contacts.</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
