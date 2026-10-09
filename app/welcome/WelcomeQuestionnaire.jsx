"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Loader2,
  Sparkles
} from "lucide-react";
import SentinelVector from "@/components/landing/SentinelVector";
import { completeOnboarding } from "@/app/actions/onboarding";

const PROFESSION_PRESETS = [
  "Software Engineer / Tech",
  "Field Operations / Solo Worker",
  "Executive / Management",
  "Healthcare & Medicine",
  "Finance & Legal",
  "Independent / Freelancer",
];

export default function WelcomeQuestionnaire({ userEmail, initialMetadata = {} }) {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState(initialMetadata.full_name || "");
  const [age, setAge] = useState(initialMetadata.age ? String(initialMetadata.age) : "");
  const [profession, setProfession] = useState(initialMetadata.profession || "");
  
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCalibrated, setIsCalibrated] = useState(false);

  const nameInputRef = useRef(null);
  const ageInputRef = useRef(null);
  const profInputRef = useRef(null);

  // Load draft from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("vigil_welcome_draft");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.fullName && !fullName) setFullName(parsed.fullName);
        if (parsed.age && !age) setAge(parsed.age);
        if (parsed.profession && !profession) setProfession(parsed.profession);
        if (parsed.step && parsed.step > 1 && parsed.step <= 3) setStep(parsed.step);
      }
    } catch (e) {
      // Ignore localStorage errors
    }
  }, []);

  // Save draft to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        "vigil_welcome_draft",
        JSON.stringify({ fullName, age, profession, step })
      );
    } catch (e) {
      // Ignore localStorage errors
    }
  }, [fullName, age, profession, step]);

  // Auto focus input when step changes
  useEffect(() => {
    setErrorMsg("");
    const timer = setTimeout(() => {
      if (step === 1 && nameInputRef.current) nameInputRef.current.focus();
      if (step === 2 && ageInputRef.current) ageInputRef.current.focus();
      if (step === 3 && profInputRef.current) profInputRef.current.focus();
    }, 150);
    return () => clearTimeout(timer);
  }, [step]);

  const handleNextStep1 = () => {
    const trimmed = fullName.trim();
    if (!trimmed || trimmed.length < 2) {
      setErrorMsg("Please enter your name to continue.");
      return;
    }
    setErrorMsg("");
    setStep(2);
  };

  const handleNextStep2 = () => {
    const num = parseInt(age, 10);
    if (!age || isNaN(num) || num < 13 || num > 125) {
      setErrorMsg("Please enter a valid age between 13 and 125.");
      return;
    }
    setErrorMsg("");
    setStep(3);
  };

  const handleNextStep3 = () => {
    const trimmed = profession.trim();
    if (!trimmed || trimmed.length < 2) {
      setErrorMsg("Please select or enter your profession or role.");
      return;
    }
    setErrorMsg("");
    setStep(4);
  };

  const handleKeyDown = (e, nextFn) => {
    if (e.key === "Enter") {
      e.preventDefault();
      nextFn();
    }
  };

  const handleFinalSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const res = await completeOnboarding({
        fullName,
        age,
        profession,
      });

      if (res?.error) {
        setErrorMsg(res.error);
        setIsSubmitting(false);
        return;
      }

      // Success sequence
      setIsCalibrated(true);
      try {
        localStorage.removeItem("vigil_welcome_draft");
      } catch (e) {}

      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 1200);
    } catch (err) {
      console.error("[WelcomeQuestionnaire] Submission error:", err);
      setErrorMsg("Failed to save profile. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="welcome-card-wrapper">
      {/* Top Introduction Header */}
      <div className="welcome-header-meta">
        <div className="welcome-insignia">
          <SentinelVector
            className="w-8 h-8 object-contain"
            primaryColor="#ff3b19"
            secondaryColor="#ffffff"
          />
        </div>
        <h1 className="welcome-main-title">Tell us a bit about yourself</h1>
      </div>

      {/* Stepper Progress Bar */}
      <div className="welcome-stepper-bar">
        <div className="stepper-track">
          <div 
            className="stepper-fill" 
            style={{ width: `${((step - 1) / 3) * 100}%` }} 
          />
        </div>
        <div className="stepper-counter">
          Step {Math.min(step, 3)} of 3
        </div>
      </div>

      {/* Question Stages */}
      <div className="welcome-stage-container">
        {/* ================= STEP 1: FULL NAME ================= */}
        {step === 1 && (
          <div className="question-stage active">
            <div className="question-text-group">
              <h2 className="question-title">What is your full name?</h2>
              <p className="question-subtitle">
                We&apos;ll use this to personalize your dashboard and emergency notifications.
              </p>
            </div>

            <div className="question-input-wrapper">
              <input
                ref={nameInputRef}
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, handleNextStep1)}
                placeholder="e.g. Alexander Vance"
                className="question-text-input"
                autoComplete="name"
              />
            </div>

            {errorMsg && <div className="question-error">{errorMsg}</div>}

            <div className="question-actions">
              <button
                type="button"
                onClick={handleNextStep1}
                className="btn-question-next ml-auto"
              >
                <span>Continue</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 2: AGE ================= */}
        {step === 2 && (
          <div className="question-stage active">
            <div className="question-text-group">
              <h2 className="question-title">How old are you?</h2>
              <p className="question-subtitle">
                Helps configure appropriate monitoring cadences and emergency profiles.
              </p>
            </div>

            <div className="question-input-wrapper">
              <input
                ref={ageInputRef}
                type="number"
                min="13"
                max="125"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, handleNextStep2)}
                placeholder="e.g. 28"
                className="question-text-input age-input"
              />
            </div>

            {errorMsg && <div className="question-error">{errorMsg}</div>}

            <div className="question-actions">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="btn-question-back"
              >
                <ArrowLeft size={14} />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={handleNextStep2}
                className="btn-question-next"
              >
                <span>Continue</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 3: PROFESSION ================= */}
        {step === 3 && (
          <div className="question-stage active">
            <div className="question-text-group">
              <h2 className="question-title">What is your profession or role?</h2>
              <p className="question-subtitle">
                Select from common scenarios or type your custom occupation below.
              </p>
            </div>

            {/* Quick Preset Chips */}
            <div className="profession-presets-grid">
              {PROFESSION_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setProfession(preset);
                    setErrorMsg("");
                  }}
                  className={`preset-chip ${profession === preset ? "selected" : ""}`}
                >
                  <span>{preset}</span>
                  {profession === preset && <Check size={13} className="text-[#ff3b19]" />}
                </button>
              ))}
            </div>

            <div className="question-input-wrapper">
              <input
                ref={profInputRef}
                type="text"
                value={profession}
                onChange={(e) => setProfession(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, handleNextStep3)}
                placeholder="Or type a custom role (e.g. Field Geologist, Commercial Pilot)..."
                className="question-text-input"
              />
            </div>

            {errorMsg && <div className="question-error">{errorMsg}</div>}

            <div className="question-actions">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="btn-question-back"
              >
                <ArrowLeft size={14} />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={handleNextStep3}
                className="btn-question-next"
              >
                <span>Review Details</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 4: REVIEW & CONFIRM ================= */}
        {step === 4 && (
          <div className="question-stage active review-stage">
            <div className="question-text-group">
              <h2 className="question-title">Review your details</h2>
              <p className="question-subtitle">
                Make sure everything looks good before heading to your dashboard.
              </p>
            </div>

            {/* Parameter Review Cards */}
            <div className="calibration-summary-grid">
              <div className="summary-card" onClick={() => setStep(1)} title="Click to edit name">
                <span className="summary-card-label">Full Name</span>
                <span className="summary-card-val">{fullName}</span>
                <span className="summary-card-edit">Edit</span>
              </div>

              <div className="summary-card" onClick={() => setStep(2)} title="Click to edit age">
                <span className="summary-card-label">Age</span>
                <span className="summary-card-val">{age} years</span>
                <span className="summary-card-edit">Edit</span>
              </div>

              <div className="summary-card summary-card-wide" onClick={() => setStep(3)} title="Click to edit profession">
                <span className="summary-card-label">Profession / Role</span>
                <span className="summary-card-val">{profession}</span>
                <span className="summary-card-edit">Edit</span>
              </div>
            </div>

            {errorMsg && <div className="question-error">{errorMsg}</div>}

            {isCalibrated ? (
              <div className="calibrating-success-banner">
                <Sparkles size={16} className="text-[#10b981]" />
                <span>Profile saved! Redirecting to dashboard...</span>
              </div>
            ) : (
              <div className="question-actions review-actions">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  disabled={isSubmitting}
                  className="btn-question-back"
                >
                  <ArrowLeft size={14} />
                  <span>Modify</span>
                </button>

                <button
                  type="button"
                  onClick={handleFinalSubmit}
                  disabled={isSubmitting}
                  className="btn-question-submit"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Saving profile...</span>
                    </>
                  ) : (
                    <>
                      <span>Complete & Enter Dashboard</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
