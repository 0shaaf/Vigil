"use client";

export default function Footer() {
  return (
    <footer className="relative bg-black text-white border-t border-white/10 py-12">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 bg-[#ff3b19] rotate-45" />
          <span className="font-['Space_Grotesk'] text-base font-bold tracking-tight text-white">
            VIGIL
          </span>
          <span className="text-xs text-white/40 ml-2">
            The Automated Check-In &amp; Safety Sentinel
          </span>
        </div>

        <div className="flex items-center gap-6 text-xs text-white/60">
          <a href="#lone-worker" className="hover:text-white transition-colors">
            Lone Workers
          </a>
          <a href="#seniors" className="hover:text-white transition-colors">
            Family Care
          </a>
          <a href="#business" className="hover:text-white transition-colors">
            Business
          </a>
          <a href="#actions" className="hover:text-white transition-colors">
            Actions
          </a>
        </div>

        <div className="text-xs text-white/40">
          &copy; {new Date().getFullYear()} Vigil. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
