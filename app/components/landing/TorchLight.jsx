'use client';

import { useEffect, useRef } from 'react';

export default function TorchLight() {
  const torchRef = useRef(null);

  useEffect(() => {
    const el = torchRef.current;
    if (!el) return;

    let currentX = window.innerWidth * 0.4;
    let currentY = window.innerHeight * 0.5;
    let targetX = currentX;
    let targetY = currentY;
    let vx = 0;
    let vy = 0;

    // Simulated Acceleration Parameters
    const SPRING = 0.042; // Acceleration constant pulling toward pointer
    const DAMPING = 0.81; // Friction decay
    let time = 0;
    let animId;

    const handlePointerMove = (e) => {
      targetX = e.clientX;
      targetY = e.clientY;
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    const updatePhysics = () => {
      time += 0.04;

      // 1. Hooke's Acceleration: a = k * (target - current)
      const ax = (targetX - currentX) * SPRING;
      const ay = (targetY - currentY) * SPRING;

      // 2. Velocity Integration with Resistance
      vx = (vx + ax) * DAMPING;
      vy = (vy + ay) * DAMPING;

      currentX += vx;
      currentY += vy;

      // 3. Flame Micro-Flicker & Dynamic Trail Distortion
      const speed = Math.sqrt(vx * vx + vy * vy);
      const flicker = Math.sin(time * 3) * 0.025 + Math.cos(time * 1.7) * 0.015;
      const dynamicScale = Math.min(1.2, Math.max(0.88, 1 + flicker - speed * 0.0025));

      el.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%) scale(${dynamicScale})`;

      animId = requestAnimationFrame(updatePhysics);
    };

    animId = requestAnimationFrame(updatePhysics);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      cancelAnimationFrame(animId);
    };
  }, []);

  return <div ref={torchRef} className="torch-accelerated-glow" aria-hidden="true" />;
}