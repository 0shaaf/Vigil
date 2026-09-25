import React, { Suspense } from "react";
import CheckInClient from "./CheckInClient";

export const metadata = {
  title: "Vigil Heartbeat Terminal",
  description: "Acknowledge and reset dead man's switch heartbeat",
};

export default function CheckInPage() {
  return (
    <main className="min-h-screen bg-[#07090e] text-slate-100 flex items-center justify-center p-4 selection:bg-sky-500/30">
      <Suspense
        fallback={
          <div className="flex items-center gap-3 text-xs tracking-widest text-slate-500 uppercase font-mono">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            Initializing Terminal Gateway...
          </div>
        }
      >
        <CheckInClient />
      </Suspense>
    </main>
  );
}