"use client";

import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import LoneWorkerSection from "@/components/landing/LoneWorkerSection";
import ElderlySection from "@/components/landing/ElderlySection";
import BusinessSection from "@/components/landing/BusinessSection";
import ActionsSection from "@/components/landing/ActionsSection";
import Footer from "@/components/landing/Footer";
import EmberCanvas from "@/components/landing/EmberCanvas";

export default function LandingPage() {
  return (
    <main className="relative min-h-screen bg-black text-white selection:bg-[#ff3b19] selection:text-white">
      {/* Subtle ambient ember particles */}
      <EmberCanvas />

      {/* Clean Header */}
      <Navbar />

      {/* Section 1: Hero - Punch line left, iconic graphic right */}
      <HeroSection />

      {/* Section 2: Lone Workers & Remote Operators - Problem left, graphic right */}
      <LoneWorkerSection />

      {/* Section 3: Family Care & Seniors Living Alone - Fades in from middle and settles left & right */}
      <ElderlySection />

      {/* Section 4: Business Leaders & Confidential Information Custody */}
      <BusinessSection />

      {/* Section 5: General Purpose Users & Actions Vigil Performs */}
      <ActionsSection />

      {/* Minimal Footer */}
      <Footer />
    </main>
  );
}