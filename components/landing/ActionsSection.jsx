"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BellRing, FileKey2, ShieldBan, Mail, ArrowRight, CheckCircle2 } from "lucide-react";

const ACTIONS = [
  {
    icon: BellRing,
    title: "Multi-Channel Emergency Alerts",
    subtitle: "SMS, Phone Calls & Email",
    description:
      "Dispatches instant alerts to your designated family members, colleagues, or neighbors with custom instructions and emergency details.",
    badge: "Immediate Dispatch",
  },
  {
    icon: FileKey2,
    title: "Encrypted Google Drive Vault",
    subtitle: "Selective File Sharing",
    description:
      "Instantly grants read or download access to pre-selected files in your Google Drive—from legal wills and deeds to password databases.",
    badge: "Zero-Knowledge",
  },
  {
    icon: ShieldBan,
    title: "Automated API Lockdown",
    subtitle: "Webhook Execution",
    description:
      "Sends a secure, authenticated webhook to your cloud or infrastructure to terminate API keys, revoke active sessions, and freeze access.",
    badge: "Instant Revocation",
  },
  {
    icon: Mail,
    title: "Sealed Personal Letters",
    subtitle: "Private Directives",
    description:
      "Delivers deeply personal letters, family videos, or vital instructions prepared for your children and spouse, delivered only when silence is confirmed.",
    badge: "Confidential",
  },
];

export default function ActionsSection() {
  const sectionRef = useRef(null);
  const gridRef = useRef(null);
  const cardRefs = useRef([]);
  const activeAnimationsRef = useRef([]);
  const [isHeaderVisible, setIsHeaderVisible] = useState(false);
  const [isAnimationComplete, setIsAnimationComplete] = useState(false);

  // Stop and cancel any running card animations
  const stopAllAnimations = () => {
    activeAnimationsRef.current.forEach((anim) => {
      try {
        anim.cancel();
      } catch (e) {}
    });
    activeAnimationsRef.current = [];
  };

  // Reset all cards to their initial offscreen stack coordinates
  const resetToOffscreen = () => {
    stopAllAnimations();
    setIsAnimationComplete(false);

    if (!gridRef.current || cardRefs.current.length < 4) return;
    const card0 = cardRefs.current[0];
    if (!card0) return;

    const card0Left = card0.offsetLeft;
    const card0Top = card0.offsetTop;
    const offscreenShift = -(typeof window !== "undefined" ? window.innerWidth + 400 : 1600);

    cardRefs.current.forEach((card, idx) => {
      if (!card) return;
      const dx = card0Left - card.offsetLeft;
      const dy = card0Top - card.offsetTop;
      card.style.transform = `translate3d(${dx + offscreenShift}px, ${dy}px, 0px)`;
      card.style.opacity = "0";
      card.style.zIndex = `${40 - idx * 10}`;
    });
  };

  // Play continuous, unified hardware-accelerated animation without any jump or jerk
  const playContinuousCardAnimation = () => {
    if (!gridRef.current || cardRefs.current.length < 4) return;
    const card0 = cardRefs.current[0];
    if (!card0) return;

    stopAllAnimations();
    setIsAnimationComplete(false);

    const card0Left = card0.offsetLeft;
    const card0Top = card0.offsetTop;
    const offscreenShift = -(window.innerWidth + 400);
    const duration = 2000; // Continuous total duration

    cardRefs.current.forEach((card, idx) => {
      if (!card) return;

      const dx = card0Left - card.offsetLeft;
      const dy = card0Top - card.offsetTop;
      const zIndex = 40 - idx * 10;
      card.style.zIndex = `${zIndex}`;

      let keyframes = [];

      if (idx === 0) {
        // Card 0: Slides in together with stack, settles in slot 0, remains anchored
        keyframes = [
          {
            transform: `translate3d(${offscreenShift}px, 0px, 0px)`,
            opacity: 0,
            easing: "cubic-bezier(0.16, 1, 0.3, 1)",
            offset: 0,
          },
          {
            transform: "translate3d(0px, 0px, 0px)",
            opacity: 1,
            offset: 0.44,
          },
          {
            transform: "translate3d(0px, 0px, 0px)",
            opacity: 1,
            offset: 1,
          },
        ];
      } else {
        // Cards 1-3: Aligned perfectly beneath Card 0 as one single card,
        // then smoothly peel off and disperse with staggered continuous timing
        const disperseStart = 0.46 + idx * 0.05; // 0.51, 0.56, 0.61
        const disperseEnd = Math.min(0.80 + idx * 0.06, 1.0); // 0.86, 0.92, 0.98

        keyframes = [
          {
            transform: `translate3d(${dx + offscreenShift}px, ${dy}px, 0px)`,
            opacity: 0,
            easing: "cubic-bezier(0.16, 1, 0.3, 1)",
            offset: 0,
          },
          {
            transform: `translate3d(${dx}px, ${dy}px, 0px)`,
            opacity: 1,
            easing: "ease-in-out",
            offset: 0.44,
          },
          {
            transform: `translate3d(${dx}px, ${dy}px, 0px)`,
            opacity: 1,
            easing: "cubic-bezier(0.16, 1, 0.3, 1)",
            offset: disperseStart,
          },
          {
            transform: "translate3d(0px, 0px, 0px)",
            opacity: 1,
            offset: disperseEnd,
          },
          {
            transform: "translate3d(0px, 0px, 0px)",
            opacity: 1,
            offset: 1,
          },
        ];
      }

      const anim = card.animate(keyframes, {
        duration,
        fill: "forwards",
      });

      activeAnimationsRef.current.push(anim);

      if (idx === 3) {
        anim.onfinish = () => {
          // Clear styles so normal hover and interactions work with zero interference
          cardRefs.current.forEach((c) => {
            if (c) {
              c.style.transform = "";
              c.style.opacity = "";
              c.style.zIndex = "";
            }
          });
          setIsAnimationComplete(true);
        };
      }
    });
  };

  useEffect(() => {
    resetToOffscreen();
    const handleResize = () => {
      if (!isAnimationComplete) resetToOffscreen();
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsHeaderVisible(true);
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              playContinuousCardAnimation();
            });
          });
        } else {
          setIsHeaderVisible(false);
          resetToOffscreen();
        }
      },
      {
        threshold: 0.15,
        rootMargin: "-20px 0px -20px 0px",
      }
    );

    const currentEl = sectionRef.current;
    if (currentEl) observer.observe(currentEl);

    return () => {
      if (currentEl) observer.unobserve(currentEl);
      stopAllAnimations();
    };
  }, []);

  return (
    <section
      id="actions"
      ref={sectionRef}
      className="relative py-28 bg-white text-black border-t-2 border-black overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        {/* Section Header with smooth fade-in animation */}
        <div
          className={`text-center max-w-3xl mx-auto mb-16 transition-opacity duration-1000 ease-out ${
            isHeaderVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          <h2 className="font-['Space_Grotesk'] text-3xl sm:text-5xl font-bold tracking-tight text-black uppercase leading-tight">
            When you go silent, <br />
            <span className="text-[#ff3b19]">Vigil executes your chosen actions.</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-black/70 font-medium">
            You are always in total control. Choose exactly what happens if you miss a check-in, who gets notified, and which documents unlock.
          </p>
        </div>

        {/* 4 Action Cards: Stack in from left as a single card, then smoothly disperse across grid */}
        <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {ACTIONS.map((action, idx) => {
            const Icon = action.icon;
            return (
              <div
                key={idx}
                ref={(el) => {
                  cardRefs.current[idx] = el;
                }}
                className="p-6 rounded-3xl bg-white text-black border-2 border-black flex flex-col justify-between h-full min-h-[340px] shadow-sm hover:shadow-md transition-shadow duration-300 will-change-transform"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-10 h-10 rounded-xl bg-black text-[#ff3b19] flex items-center justify-center font-bold">
                      <Icon size={20} />
                    </div>
                    <span className="text-[10px] font-bold text-black/60 border border-black/20 px-2 py-0.5 rounded-full uppercase">
                      {action.badge}
                    </span>
                  </div>

                  <h3 className="font-['Space_Grotesk'] text-lg font-bold text-black mb-1">
                    {action.title}
                  </h3>
                  <div className="text-xs font-semibold text-[#ff3b19] mb-3">
                    {action.subtitle}
                  </div>
                  <p className="text-xs text-black/70 leading-relaxed">
                    {action.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-black/10 flex items-center gap-1.5 text-[11px] text-black/60 font-medium">
                  <CheckCircle2 size={13} className="text-[#ff3b19]" />
                  <span>Configured in seconds</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* High Conversion Final CTA Banner */}
        <div className="mt-20 p-8 sm:p-12 rounded-3xl bg-black text-white border-2 border-black text-center max-w-4xl mx-auto flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#ff3b19]/20 text-[#ff3b19] text-xs font-bold uppercase tracking-wider mb-4 border border-[#ff3b19]/30">
            Protect What Matters Most
          </div>

          <h3 className="font-['Space_Grotesk'] text-3xl sm:text-5xl font-bold text-white uppercase tracking-tight">
            Never leave your silence to chance.
          </h3>

          <p className="mt-4 text-base sm:text-lg text-white/70 max-w-lg leading-relaxed">
            Whether for your field shift, your aging family, or your company’s survival, setting up your first automated check-in takes less than two minutes.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2.5 px-8 py-4 rounded-xl text-sm font-bold uppercase tracking-wider text-black bg-[#ff3b19] hover:bg-[#ff5233] transition-colors"
            >
              <span>Arm Your First Check-In</span>
              <ArrowRight size={16} />
            </Link>
            <span className="text-xs text-white/60">100% Free to get started • No credit card required</span>
          </div>
        </div>
      </div>
    </section>
  );
}

