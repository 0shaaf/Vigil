import Link from "next/link";
import LoginForm from "@/app/components/LoginForm";
import { ArrowLeft } from "lucide-react";
import "@/app/components/CSS/AuthForm.css";

export const metadata = {
  title: "Operator Login — Vigil",
  description: "Authenticate into your Vigil failsafe network",
};

export default function LoginPage() {
  return (
    <main className="auth-page-container">
      <div className="auth-ambient-glow" aria-hidden="true" />
      <div className="auth-grid-overlay" aria-hidden="true" />

      {/* Back to Home Button */}
      <Link
        href="/"
        className="fixed top-6 left-6 z-20 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold uppercase tracking-wider text-white/80 hover:text-white transition-all backdrop-blur-md"
      >
        <ArrowLeft size={14} />
        <span>Return to Home</span>
      </Link>

      <LoginForm />
    </main>
  );
}
