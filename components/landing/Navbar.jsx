"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, ArrowRight, Shield, User, LogIn } from "lucide-react";
import { getSupabaseBrowserClient } from "@/app/lib/supabase/browser-client";

export default function Navbar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check initial session
    try {
      const sp = getSupabaseBrowserClient();
      sp.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user ?? null);
      }).catch(() => {});

      const { data: { subscription } } = sp.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
      });

      return () => {
        subscription?.unsubscribe();
      };
    } catch (e) {
      // Env variables might be loading
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const shouldCollapse = window.scrollY > 40;
      setIsCollapsed(shouldCollapse);
      if (!shouldCollapse) {
        setMenuOpen(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  return (
    <div
      id="vigil-unified-navbar"
      className="fixed top-4 sm:top-6 left-1/2 z-50 pointer-events-none"
      style={{
        transform: isCollapsed
          ? "translateX(calc(50vw - var(--dock-right-offset, 1.5rem) - 100%))"
          : "translateX(-50%)",
        width: isCollapsed
          ? "280px"
          : "min(calc(100vw - 2rem), 1280px)",
        transition:
          "transform 500ms cubic-bezier(0.16, 1, 0.3, 1), width 500ms cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <header
        className={`pointer-events-auto relative w-full rounded-full flex items-center transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] backdrop-blur-xl backdrop-saturate-150 ${
          isCollapsed
            ? "bg-black/80 text-white border border-white/25 shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.25)] pl-2 pr-2.5 py-1.5 justify-end gap-2"
            : "bg-black/75 text-white border border-white/20 shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.2)] px-5 sm:px-8 py-3.5 justify-between"
        }`}
      >
        {/* Brand */}
        <Link
          href="/"
          className={`flex items-center gap-3.5 group shrink-0 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isCollapsed
              ? "opacity-0 max-w-0 pointer-events-none overflow-hidden"
              : "opacity-100 max-w-[300px]"
          }`}
        >
          <div className="w-5 h-5 sm:w-6 sm:h-6 bg-[#ff3b19] rotate-45 group-hover:scale-110 transition-transform shrink-0" />
          <span className="font-['Space_Grotesk'] text-2xl sm:text-3xl font-extrabold tracking-tight text-white whitespace-nowrap">
            VIGIL
          </span>
        </Link>

        {/* Center Nav Links */}
        <nav
          className={`hidden md:flex items-center gap-7 text-xs font-semibold uppercase tracking-wider text-white/80 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isCollapsed
              ? "opacity-0 max-w-0 pointer-events-none overflow-hidden"
              : "opacity-100 max-w-xl"
          }`}
        >
          <a
            href="#lone-worker"
            className="hover:text-[#ff3b19] transition-colors whitespace-nowrap"
          >
            Lone Workers
          </a>
          <a
            href="#seniors"
            className="hover:text-[#ff3b19] transition-colors whitespace-nowrap"
          >
            Family &amp; Seniors
          </a>
          <a
            href="#business"
            className="hover:text-[#ff3b19] transition-colors whitespace-nowrap"
          >
            Business
          </a>
          <a
            href="#actions"
            className="hover:text-[#ff3b19] transition-colors whitespace-nowrap"
          >
            Actions
          </a>
          <Link
            href="/checkin"
            className="text-white/60 hover:text-white transition-colors whitespace-nowrap flex items-center gap-1"
          >
            <Shield size={12} className="text-[#ff3b19]" />
            Pulse
          </Link>
        </nav>

        {/* Right Section: Dock items or Full CTA */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Uncollapsed Login Link */}
          {!isCollapsed && !user && (
            <Link
              href="/login"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/80 hover:text-white px-3 py-1.5 rounded-full hover:bg-white/10 transition-colors"
            >
              <LogIn size={13} />
              <span>Log In</span>
            </Link>
          )}

          {/* Hamburger Menu Button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle navigation menu"
            className={`w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 backdrop-blur-md text-white flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] shrink-0 ${
              isCollapsed
                ? "opacity-100 scale-100 pointer-events-auto"
                : "opacity-0 scale-75 w-0 pointer-events-none overflow-hidden"
            }`}
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          {/* Action Button: Dashboard if logged in, or Arm Check-in if logged out */}
          {user ? (
            <Link
              href="/dashboard"
              onClick={() => setMenuOpen(false)}
              className={`inline-flex items-center gap-1.5 font-bold uppercase tracking-wider text-black bg-[#ff3b19] hover:bg-[#ff5233] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] shrink-0 rounded-full ${
                isCollapsed
                  ? "px-3.5 py-2 text-[11px] sm:text-xs"
                  : "px-4 sm:px-5 py-2 text-xs"
              }`}
            >
              <User size={13} className="shrink-0" />
              <span>Dashboard</span>
              <ArrowRight size={13} className="shrink-0" />
            </Link>
          ) : (
            <Link
              href="/signup"
              onClick={() => setMenuOpen(false)}
              className={`inline-flex items-center gap-1.5 font-bold uppercase tracking-wider text-black bg-[#ff3b19] hover:bg-[#ff5233] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] shrink-0 rounded-full ${
                isCollapsed
                  ? "px-3.5 py-2 text-[11px] sm:text-xs"
                  : "px-4 sm:px-5 py-2 text-xs"
              }`}
            >
              <span>Arm Sentinel</span>
              <ArrowRight size={13} className="shrink-0" />
            </Link>
          )}
        </div>

        {/* Hamburger Dropdown Drawer */}
        {isCollapsed && menuOpen && (
          <div className="absolute top-14 right-0 w-64 bg-black/90 backdrop-blur-2xl backdrop-saturate-150 border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.8)] rounded-2xl p-4 flex flex-col gap-2 animate-fadeIn text-xs font-semibold uppercase tracking-wider z-50">
            <a
              href="#lone-worker"
              onClick={() => setMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-all"
            >
              Lone Workers
            </a>
            <a
              href="#seniors"
              onClick={() => setMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-all"
            >
              Family &amp; Seniors
            </a>
            <a
              href="#business"
              onClick={() => setMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-all"
            >
              Business Custody
            </a>
            <a
              href="#actions"
              onClick={() => setMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-all"
            >
              Actions &amp; Features
            </a>
            <Link
              href="/checkin"
              onClick={() => setMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-all flex items-center justify-between"
            >
              <span>Heartbeat Pulse</span>
              <Shield size={13} className="text-[#ff3b19]" />
            </Link>
            <div className="h-px bg-white/10 my-1" />
            {user ? (
              <Link
                href="/dashboard"
                onClick={() => setMenuOpen(false)}
                className="px-3 py-2 rounded-lg bg-[#ff3b19] text-black font-bold text-center transition-all hover:bg-[#ff5233]"
              >
                Open Terminal (Dashboard)
              </Link>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="px-3 py-2 rounded-lg bg-white/10 text-white text-center hover:bg-white/20 transition-all"
                >
                  Log In
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMenuOpen(false)}
                  className="px-3 py-2 rounded-lg bg-[#ff3b19] text-black font-bold text-center hover:bg-[#ff5233] transition-all"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        )}
      </header>
    </div>
  );
}
