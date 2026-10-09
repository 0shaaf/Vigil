"use client";

import { useEffect, useRef } from "react";

export default function EmberCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);

    // Particle pool reduced by 20% in density
    const particleCount = Math.min(65, Math.floor(width / 26));
    const particles = [];

    let lastScrollY = window.scrollY;
    let scrollVelocity = 0;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      scrollVelocity = Math.min(15, Math.abs(currentScrollY - lastScrollY));
      lastScrollY = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 2.6 + 1.1,
        speedY: Math.random() * 0.85 + 0.35,
        speedX: (Math.random() - 0.5) * 0.6,
        opacity: Math.random() * 0.45 + 0.55,
        swaySpeed: Math.random() * 0.02 + 0.01,
        swayAngle: Math.random() * Math.PI * 2,
      });
    }

    // Dynamic Color Interpolation Engine
    let currentRGB = { r: 0, g: 0, b: 0 }; // starts deep black on white hero

    const determineTargetColor = () => {
      const centerX = width / 2;
      const centerY = height / 2;
      const el = document.elementFromPoint(centerX, centerY);

      if (!el) return { r: 0, g: 0, b: 0 };

      const section = el.closest("section") || el.closest("footer") || el.closest("main");
      if (section) {
        const id = section.id;
        // Section 2 (#lone-worker) & Section 4 (#business) are dark -> use Blood Orange / Ember
        if (id === "lone-worker" || id === "business") {
          return { r: 255, g: 65, b: 25 };
        }
        // Section 1 (hero), Section 3 (#seniors, orange), Section 5 (#actions, white) -> use Deep Black
        if (id === "seniors" || id === "actions") {
          return { r: 0, g: 0, b: 0 };
        }
      }

      // Default for top of page (Hero is white -> Deep Black)
      if (window.scrollY < 400) {
        return { r: 0, g: 0, b: 0 };
      }

      return { r: 0, g: 0, b: 0 };
    };

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      scrollVelocity *= 0.94;
      const boost = 1 + scrollVelocity * 0.35;

      const targetRGB = determineTargetColor();
      currentRGB.r += (targetRGB.r - currentRGB.r) * 0.08;
      currentRGB.g += (targetRGB.g - currentRGB.g) * 0.08;
      currentRGB.b += (targetRGB.b - currentRGB.b) * 0.08;

      const r = Math.round(currentRGB.r);
      const g = Math.round(currentRGB.g);
      const b = Math.round(currentRGB.b);

      const isBlack = r < 50 && g < 50 && b < 50;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        p.swayAngle += p.swaySpeed;
        p.x += p.speedX + Math.sin(p.swayAngle) * 0.5;
        p.y -= (p.speedY + scrollVelocity * 0.45) * boost;

        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);

        const gradient = ctx.createRadialGradient(
          p.x,
          p.y,
          0,
          p.x,
          p.y,
          p.size * (isBlack ? 2.0 : 3.5)
        );

        if (isBlack) {
          gradient.addColorStop(0, `rgba(0, 0, 0, ${p.opacity})`);
          gradient.addColorStop(0.65, `rgba(15, 15, 20, ${p.opacity * 0.65})`);
          gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
        } else {
          gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${p.opacity})`);
          gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${p.opacity * 0.5})`);
          gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        }

        ctx.fillStyle = gradient;
        if (!isBlack) {
          ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.6)`;
          ctx.shadowBlur = 8;
        }
        ctx.fill();
        ctx.restore();

        if (p.y < -20 || p.x < -20 || p.x > width + 20) {
          p.x = Math.random() * width;
          p.y = height + 10;
          p.opacity = Math.random() * 0.45 + 0.55;
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 5, // Behind UI content (z-10+), above page background colors
        opacity: 0.95,
      }}
    />
  );
}
