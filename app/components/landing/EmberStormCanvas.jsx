'use client';

import { useEffect, useRef } from 'react';

export default function EmberStormCanvas({ active = false }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const mouse = {
      x: -1000,
      y: -1000,
      prevX: -1000,
      prevY: -1000,
      vx: 0,
      vy: 0,
      radius: 130,
    };

    const handleMouseMove = (e) => {
      mouse.prevX = mouse.x;
      mouse.prevY = mouse.y;
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.vx = mouse.x - mouse.prevX;
      mouse.vy = mouse.y - mouse.prevY;
    };

    window.addEventListener('mousemove', handleMouseMove);

    const PARTICLE_COUNT = 180;
    const particles = [];

    class Ember {
      constructor() {
        this.reset(true);
      }

      reset(init = false) {
        this.x = Math.random() * width;
        this.y = init ? Math.random() * height : height + 15 + Math.random() * 25;

        const seed = Math.random();
        if (seed > 0.8) {
          this.r = 255; this.g = 220; this.b = 140;
          this.size = Math.random() * 2.2 + 1.2;
          this.baseAlpha = 0.9;
        } else if (seed > 0.3) {
          this.r = 255; this.g = 110; this.b = 30;
          this.size = Math.random() * 2.0 + 0.8;
          this.baseAlpha = 0.75;
        } else {
          this.r = 230; this.g = 45; this.b = 15;
          this.size = Math.random() * 1.6 + 0.6;
          this.baseAlpha = 0.6;
        }

        this.baseVy = -(Math.random() * 1.3 + 0.6);
        this.baseVx = (Math.random() - 0.5) * 0.9;
        this.vx = this.baseVx;
        this.vy = this.baseVy;

        this.deflected = false;
        this.oscOffset = Math.random() * Math.PI * 2;
        this.oscSpeed = Math.random() * 0.03 + 0.01;
        this.maxLife = Math.random() * 320 + 160;
        this.life = init ? Math.random() * this.maxLife : 0;
      }

      update(buttonRect) {
        this.life++;
        this.oscOffset += this.oscSpeed;

        this.vx += Math.sin(this.oscOffset) * 0.08;
        this.vy += Math.cos(this.oscOffset) * 0.02;

        if (buttonRect) {
          const btnPadding = 18;
          const left = buttonRect.left - btnPadding;
          const right = buttonRect.right + btnPadding;
          const top = buttonRect.top - btnPadding;
          const bottom = buttonRect.bottom + btnPadding;

          if (this.x >= left && this.x <= right && this.y >= top && this.y <= bottom) {
            const btnCenterX = (buttonRect.left + buttonRect.right) / 2;
            const btnCenterY = (buttonRect.top + buttonRect.bottom) / 2;

            const dx = this.x - btnCenterX;
            const dy = this.y - btnCenterY;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;

            const deflectForce = 3.6;
            this.vx = (dx / dist) * deflectForce + (Math.random() - 0.5) * 1.5;
            this.vy = (dy / dist) * deflectForce - 1.2;

            this.r = 255;
            this.g = 240;
            this.b = 180;
            this.deflected = true;
          }
        }

        const mdx = this.x - mouse.x;
        const mdy = this.y - mouse.y;
        const mDist = Math.sqrt(mdx * mdx + mdy * mdy);

        if (mDist < mouse.radius && mDist > 0) {
          const push = (1 - mDist / mouse.radius) * 3.2;
          this.vx += (mdx / mDist) * push + mouse.vx * 0.12;
          this.vy += (mdy / mDist) * push + mouse.vy * 0.12;
        }

        this.vx *= 0.98;
        this.vy = Math.min(this.vy, -0.4);

        this.x += this.vx;
        this.y += this.vy;

        if (this.life >= this.maxLife || this.y < -30 || this.x < -30 || this.x > width + 30) {
          this.reset(false);
        }
      }

      draw() {
        const progress = this.life / this.maxLife;
        const opacity = progress < 0.12
          ? (progress / 0.12) * this.baseAlpha
          : Math.max(0, (1 - progress) * this.baseAlpha);

        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${this.r}, ${this.g}, ${this.b}, ${opacity})`;
        ctx.shadowBlur = this.deflected ? this.size * 5 : this.size * 3;
        ctx.shadowColor = `rgba(${this.r}, ${this.g}, ${this.b}, 0.9)`;
        ctx.fill();
        ctx.restore();
      }
    }

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push(new Ember());
    }

    const render = () => {
      mouse.vx *= 0.85;
      mouse.vy *= 0.85;

      const btnEl = document.getElementById('hero-cta-btn');
      const buttonRect = btnEl ? btnEl.getBoundingClientRect() : null;

      ctx.clearRect(0, 0, width, height);

      // Only calculate & draw particles if active
      if (active) {
        for (let i = 0; i < particles.length; i++) {
          particles[i].update(buttonRect);
          particles[i].draw();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      className={`ember-deflect-canvas ${active ? 'canvas-active' : 'canvas-dormant'}`}
      aria-hidden="true"
    />
  );
}