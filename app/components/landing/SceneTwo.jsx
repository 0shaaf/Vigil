'use client';

import Link from 'next/link';
import '../CSS/hero.css';

export default function SceneTwo({ active }) {
  return (
    <section
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: active ? 'auto' : 'none',
        opacity: active ? 1 : 0,
        transform: active ? 'translateY(0) scale(1)' : 'translateY(40px) scale(0.95)',
        transition: 'opacity 0.9s cubic-bezier(0.16, 1, 0.3, 1), transform 0.9s cubic-bezier(0.16, 1, 0.3, 1)',
        backgroundColor: '#000000',
      }}
    >
      <div style={{ maxWidth: '960px', width: '100%', padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', letterSpacing: '0.2em', color: 'var(--accent-teal)', marginBottom: '0.6rem' }}>
          [ 02 // LIFECYCLE FAILSAFE ]
        </div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 4vw, 3.2rem)', fontWeight: 800, color: '#fff', marginBottom: '2.5rem' }}>
          Your data remains silent. <br />
          <span className="flame-gradient-text">Until silence breaks.</span>
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.04)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '1.8rem', textAlign: 'left' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.15em', color: 'var(--accent-teal)', display: 'block', marginBottom: '0.6rem' }}>
              STEP 01
            </span>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>Configured Intervals</h3>
            <p style={{ fontSize: '0.82rem', lineHeight: '1.6', color: 'var(--text-muted)', margin: 0 }}>
              Specify check-in frequencies from every 12 hours to 6 months. Verify your heartbeat seamlessly[cite: 1].
            </p>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.04)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '1.8rem', textAlign: 'left' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.15em', color: 'var(--accent-teal)', display: 'block', marginBottom: '0.6rem' }}>
              STEP 02
            </span>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>Multi-Node Escrow</h3>
            <p style={{ fontSize: '0.82rem', lineHeight: '1.6', color: 'var(--text-muted)', margin: 0 }}>
              Split file permissions, drive directories, and cryptographic tokens among multiple trusted contacts[cite: 1].
            </p>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.04)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '1.8rem', textAlign: 'left' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.15em', color: 'var(--accent-teal)', display: 'block', marginBottom: '0.6rem' }}>
              STEP 03
            </span>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>Zero Trace</h3>
            <p style={{ fontSize: '0.82rem', lineHeight: '1.6', color: 'var(--text-muted)', margin: 0 }}>
              Payloads remain encrypted in cold storage. No third party or master key can read your payload prematurely[cite: 1].
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <Link href="/dashboard" className="btn-ripple-action" style={{ textDecoration: 'none' }}>
            <i className="animation" />
            <span>CREATE FIRST SWITCH</span>
            <i className="animation" />
          </Link>
          <span style={{ fontSize: '0.68rem', letterSpacing: '0.2em', color: 'var(--text-muted)', opacity: 0.6 }}>
            ↑ SCROLL UP TO REVISIT DIAL
          </span>
        </div>
      </div>
    </section>
  );
}