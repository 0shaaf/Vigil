import React, { Suspense } from "react";
import CheckInClient from "./CheckInClient";
import "./checkin.css";

export const metadata = {
  title: "Vigil Heartbeat Terminal",
  description: "Acknowledge and reset dead man's switch heartbeat",
};

export default function CheckInPage() {
  return (
    <main className="checkin-wrapper">
      <Suspense
        fallback={
          <div className="checkin-loading">
            <div className="loading-spinner" />
            <p>Initializing Terminal Gateway...</p>
          </div>
        }
      >
        <CheckInClient />
      </Suspense>
    </main>
  );
}