'use client';

import Link from 'next/link';

export default function SceneTwo({ active }) {
  return (
    <section className={`scene-two-container ${active ? 'scene-active' : 'scene-dormant'}`}>
      <div className="scene-two-inner">
        <div className="scene-label">[ 02 // ARCHITECTURE ]</div>
        <h2 className="scene-heading">
          Engineered for certainty <br />
          <span className="scene-highlight">when time runs out.</span>
        </h2>

        <div className="scene-features-grid">
          <div className="feature-pill-card">
            <span className="feature-step">PHASE 01</span>
            <h3>Periodic Heartbeats</h3>
            <p>
              Set check-in cadences from 24 hours to several months. Acknowledge presence via
              tokenized links without signing in[cite: 1].
            </p>
          </div>

          <div className="feature-pill-card">
            <span className="feature-step">PHASE 02</span>
            <h3>Escalation Buffer</h3>
            <p>
              Missed a pulse? Secondary grace windows trigger priority warnings before any data
              leaves your jurisdiction[cite: 1].
            </p>
          </div>

          <div className="feature-pill-card">
            <span className="feature-step">PHASE 03</span>
            <h3>Zero-Knowledge Release</h3>
            <p>
              If silence persists, your encrypted Google Drive archives, passwords, and final notes
              dispatch autonomously[cite: 1].
            </p>
          </div>
        </div>

        <div className="scene-cta-footer">
          <Link href="/dashboard" className="btn-scene-launch">
            CREATE FIRST SWITCH
          </Link>
          <span className="scene-scroll-hint">↑ SCROLL UP TO RETURN</span>
        </div>
      </div>
    </section>
  );
}