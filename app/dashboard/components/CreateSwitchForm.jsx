"use client";

import React, { useState, useRef, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Pencil,
  Plus,
  Heart,
  Briefcase,
  ShieldAlert,
  Timer,
  Flame,
  ShieldCheck,
  Radio,
  Users,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Shield,
  Info,
  ArrowUpRight,
} from "lucide-react";
import { createSwitch, updateSwitch } from "@/app/actions/switches";
import GoogleDrivePickerModal from "@/app/components/GoogleDrivePickerModal";
import "../css/switch-form.css";

const TOTAL_STEPS = 8;

function ClearanceTierSelect({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const options = [
    {
      value: 75,
      label: "High Clearance (Trust ≥ 75)",
      icon: ShieldAlert,
      badge: "≥ 75",
    },
    {
      value: 50,
      label: "Medium Clearance (Trust ≥ 50)",
      icon: Shield,
      badge: "≥ 50",
    },
    {
      value: 25,
      label: "Low Clearance (Trust ≥ 25)",
      icon: ShieldCheck,
      badge: "≥ 25",
    },
    {
      value: -1,
      label: "Designated Sole Recipient",
      icon: Users,
      badge: "Sole",
    },
  ];

  const numValue = Number(value);
  const selectedOption =
    options.find((opt) => opt.value === numValue) || options[0];
  const SelectedIcon = selectedOption.icon;

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="clearance-popup-wrap" ref={containerRef}>
      <button
        type="button"
        className={`clearance-popup-button ${isOpen ? "open" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="clearance-popup-selected-meta">
          <span className="clearance-popup-icons">
            <SelectedIcon size={16} />
          </span>
          <span className="clearance-popup-label">{selectedOption.label}</span>
        </span>
        <ChevronDown
          size={14}
          className={`clearance-chevron ${isOpen ? "rotate" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="clearance-popup-list-container">
          <ul className="clearance-popup-list">
            {options.map((opt) => {
              const IconComponent = opt.icon;
              const isSelected = opt.value === numValue;
              return (
                <li key={opt.value}>
                  <button
                    type="button"
                    className={`clearance-popup-item ${isSelected ? "selected" : ""}`}
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                  >
                    <span className="clearance-popup-item-left">
                      <span className="clearance-popup-icons">
                        <IconComponent size={16} />
                      </span>
                      <span className="clearance-popup-item-name">
                        {opt.label}
                      </span>
                    </span>
                    <span className="clearance-popup-badge">{opt.badge}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

const PURPOSE_OPTIONS = [
  {
    id: "PERSONAL",
    label: "Personal & Legacy",
    icon: Heart,
    description:
      "Estate planning, confidential family documents, and personal directives for next of kin.",
  },
  {
    id: "COMMERCIAL",
    label: "Commercial & Business",
    icon: Briefcase,
    description:
      "Operational redundancy, server credentials, business contracts, and enterprise continuity.",
  },
  {
    id: "SAFETY",
    label: "Field & Personal Safety",
    icon: ShieldAlert,
    description:
      "High-risk assignments, investigative journalism, solo operations, and emergency distress.",
  },
  {
    id: "GENERAL",
    label: "General Countdown",
    icon: Timer,
    description:
      "Routine automated deadlines, recurring verification check-ins, and standard fail-safes.",
  },
];

const CRITICALITY_OPTIONS = [
  {
    id: "CRITICAL",
    label: "Critical",
    icon: Flame,
    description:
      "Catastrophic and irreversible. Full escalation actions trigger immediately if a pulse is missed.",
  },
  {
    id: "OPERATIONAL",
    label: "Operational",
    icon: ShieldCheck,
    description:
      "Standard vigilance threshold. Balanced check-in intervals suitable for everyday protection.",
  },
  {
    id: "SENTINEL",
    label: "Sentinel",
    icon: Radio,
    description:
      "Routine background heartbeat. Low-friction pulses to verify system and personnel health.",
  },
];

export default function CreateSwitchForm({ initialSwitch = null, availableContacts = [] }) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [stepError, setStepError] = useState("");

  // Switch Name inline editing state
  const [isEditingName, setIsEditingName] = useState(false);
  const nameInputRef = useRef(null);

  // Drive Modal State
  const [activeDriveRowIndex, setActiveDriveRowIndex] = useState(null);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);

  // Pre-populate contacts selection and scores
  const initialContacts = availableContacts.map((c) => {
    const linked = initialSwitch?.switch_contacts?.find(
      (sc) => (sc.contact_id || sc.contacts?.id) === c.id
    );
    return {
      contact_id: c.id,
      selected: Boolean(linked),
      priority_score: linked?.priority_score ?? 1,
      trust_score: linked?.trust_score ?? 50,
    };
  });

  // Pre-populate beacon disclosures and files
  const existingBeacons = initialSwitch?.info_to_release || initialSwitch?.beacon_rows;
  const initialBeaconRows =
    Array.isArray(existingBeacons) && existingBeacons.length > 0
      ? existingBeacons.map((r) => ({
          content: r.content || "",
          trust_required: r.trust_required ?? 50,
          target_contact_id: r.target_contact_id ? String(r.target_contact_id) : "",
          file_metadata: Array.isArray(r.file_metadata) ? r.file_metadata : [],
        }))
      : [
          {
            content: "",
            trust_required: 50,
            target_contact_id: "",
            file_metadata: [],
          },
        ];

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: initialSwitch?.name || "My Switch",
      description: initialSwitch?.description || "",
      purpose: initialSwitch?.purpose || "PERSONAL",
      criticality: initialSwitch?.criticality || "OPERATIONAL",
      check_in_interval: {
        months: initialSwitch?.check_in_interval?.months ?? 0,
        days: initialSwitch?.check_in_interval?.days ?? 30,
        hours: initialSwitch?.check_in_interval?.hours ?? 0,
        minutes: initialSwitch?.check_in_interval?.minutes ?? 0,
      },

      action_modules: {
        beacon: Boolean(initialSwitch?.actions?.modules?.beacon ?? true),
        lockdown: Boolean(initialSwitch?.actions?.modules?.lockdown ?? false),
      },

      contacts: initialContacts,
      beacon_rows: initialBeaconRows,

      lockdown_config: {
        webhook_url: initialSwitch?.actions?.lockdown_config?.webhook_url || "",
        auth_header: initialSwitch?.actions?.lockdown_config?.auth_header || "",
        http_method: initialSwitch?.actions?.lockdown_config?.http_method || "POST",
        payload_json:
          initialSwitch?.actions?.lockdown_config?.payload_json ||
          '{\n  "action": "REVOKE_ALL_SESSIONS"\n}',
      },
    },
  });

  const {
    fields: beaconFields,
    append: appendBeacon,
    remove: removeBeacon,
    update: updateBeacon,
  } = useFieldArray({
    control,
    name: "beacon_rows",
  });

  const activeModules = watch("action_modules");
  const switchName = watch("name");
  const selectedPurpose = watch("purpose");
  const selectedCriticality = watch("criticality");
  const intervalValues = watch("check_in_interval");
  const contactsValues = watch("contacts") || [];

  const openDrivePicker = (idx) => {
    setActiveDriveRowIndex(idx);
    setIsDriveModalOpen(true);
  };

  const handleDriveFilesConfirmed = (selectedFiles) => {
    if (activeDriveRowIndex !== null) {
      const currentRow = watch(`beacon_rows.${activeDriveRowIndex}`) || {};
      updateBeacon(activeDriveRowIndex, {
        ...currentRow,
        file_metadata: selectedFiles,
      });
    }
  };

  const removeDriveFile = (rowIndex, fileId) => {
    const currentRow = watch(`beacon_rows.${rowIndex}`) || {};
    const currentFiles = currentRow.file_metadata || [];
    updateBeacon(rowIndex, {
      ...currentRow,
      file_metadata: currentFiles.filter((f) => f.id !== fileId),
    });
  };

  const handleStartNameEdit = () => {
    setIsEditingName(true);
    setTimeout(() => {
      nameInputRef.current?.focus();
    }, 40);
  };

  // Step Validation before "Next"
  const validateCurrentStep = async () => {
    setStepError("");

    if (!switchName?.trim()) {
      setStepError("Switch name cannot be empty.");
      return false;
    }

    // Step 5: Beacon validation if enabled
    if (currentStep === 5 && activeModules?.beacon) {
      const rows = watch("beacon_rows") || [];
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const hasContent = Boolean(row.content?.trim());
        const hasFiles =
          Array.isArray(row.file_metadata) && row.file_metadata.length > 0;
        if (!hasContent && !hasFiles) {
          setStepError(
            `Disclosure package #${i + 1} requires a message or attached files.`
          );
          return false;
        }
        if (Number(row.trust_required) === -1 && !row.target_contact_id) {
          setStepError(
            `Please select a designated recipient for disclosure package #${i + 1}.`
          );
          return false;
        }
      }
    }

    // Step 6: Lockdown validation if enabled
    if (currentStep === 6 && activeModules?.lockdown) {
      const valid = await trigger("lockdown_config.webhook_url");
      const url = watch("lockdown_config.webhook_url");
      if (!valid || !url?.trim()) {
        setStepError("Webhook URL is required when Infrastructure Lockdown is armed.");
        return false;
      }
    }

    // Step 7: Interval validation
    if (currentStep === 7) {
      const totalMinutes =
        Number(intervalValues?.months || 0) * 43200 +
        Number(intervalValues?.days || 0) * 1440 +
        Number(intervalValues?.hours || 0) * 60 +
        Number(intervalValues?.minutes || 0);

      if (totalMinutes <= 0) {
        setStepError("Trip interval duration must be greater than 0 minutes.");
        return false;
      }
    }

    return true;
  };

  // Handle "Next" with 1-second crisp spinner
  const handleNext = async () => {
    const isValid = await validateCurrentStep();
    if (!isValid) return;

    setIsTransitioning(true);
    setStepError("");

    setTimeout(() => {
      setCurrentStep((prev) => Math.min(prev + 1, TOTAL_STEPS));
      setIsTransitioning(false);
    }, 1000);
  };

  // Handle "Previous" (instant)
  const handlePrev = () => {
    setStepError("");
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const applyIntervalPreset = (days) => {
    setValue("check_in_interval", { months: 0, days, hours: 0, minutes: 0 });
  };

  const toggleAllContacts = (select) => {
    availableContacts.forEach((_, idx) => {
      setValue(`contacts.${idx}.selected`, select);
    });
  };

  const onSubmit = async (formData) => {
    setSubmitting(true);
    setServerError("");

    try {
      const selectedContacts = (formData.contacts || [])
        .filter((c) => c.selected)
        .map((c) => ({
          contact_id: c.contact_id,
          priority_score: Number(c.priority_score) || 1,
          trust_score: Number(c.trust_score) || 0,
        }));

      const sanitizedInterval = {
        months: Number(formData.check_in_interval?.months || 0),
        days: Number(formData.check_in_interval?.days || 0),
        hours: Number(formData.check_in_interval?.hours || 0),
        minutes: Number(formData.check_in_interval?.minutes || 0),
      };

      const sanitizedActions = {
        email: true,
        modules: {
          beacon: Boolean(formData.action_modules?.beacon),
          lockdown: Boolean(formData.action_modules?.lockdown),
        },
        lockdown_config: formData.action_modules?.lockdown
          ? formData.lockdown_config
          : null,
      };

      const sanitizedBeaconRows = formData.action_modules?.beacon
        ? (formData.beacon_rows || [])
            .filter(
              (row) =>
                row.content?.trim() ||
                (Array.isArray(row.file_metadata) && row.file_metadata.length > 0)
            )
            .map((row) => {
              const trustVal = Number(row.trust_required);
              return {
                content: row.content?.trim() || "",
                trust_required: trustVal,
                target_contact_id:
                  trustVal === -1 && row.target_contact_id
                    ? row.target_contact_id
                    : null,
                file_metadata: Array.isArray(row.file_metadata)
                  ? row.file_metadata
                  : [],
              };
            })
        : [];

      const payload = {
        name: formData.name?.trim() || (initialSwitch ? initialSwitch.name : "My Switch"),
        description: formData.description?.trim() || null,
        purpose: formData.purpose || "PERSONAL",
        criticality: formData.criticality || "OPERATIONAL",
        check_in_interval: sanitizedInterval,
        actions: sanitizedActions,
        contacts: selectedContacts,
        beacon_rows: sanitizedBeaconRows,
      };

      if (initialSwitch?.id) {
        const res = await updateSwitch(initialSwitch.id, payload);
        if (res?.error) {
          setServerError(res.error);
          setSubmitting(false);
        } else {
          router.push("/dashboard/switches");
          router.refresh();
        }
      } else {
        const res = await createSwitch(payload);
        if (res?.error) {
          setServerError(res.error);
          setSubmitting(false);
        } else if (res?.id) {
          router.push("/dashboard/switches");
          router.refresh();
        }
      }
    } catch (err) {
      console.error("[CreateSwitchForm] Submit Error:", err);
      setServerError(err.message || "Failed to save switch configuration. Please try again.");
      setSubmitting(false);
    }
  };

  const progressPercent = Math.round((currentStep / TOTAL_STEPS) * 100);
  const selectedContactsCount = contactsValues.filter((c) => c?.selected).length;

  const currentPurposeMeta =
    PURPOSE_OPTIONS.find((p) => p.id === selectedPurpose) || PURPOSE_OPTIONS[0];
  const currentCriticalityMeta =
    CRITICALITY_OPTIONS.find((c) => c.id === selectedCriticality) ||
    CRITICALITY_OPTIONS[1];

  const { ref: formNameRef, ...restNameRegister } = register("name", {
    required: "Switch name is required",
  });

  return (
    <div className="switch-wizard-container">
      {/* Header Bar with Plain Text Switch Name & Pencil Edit Icon */}
      <div className="wizard-header-bar">
        <div className="wizard-inline-name-group">
          <input
            {...restNameRegister}
            ref={(e) => {
              formNameRef(e);
              nameInputRef.current = e;
            }}
            type="text"
            className="wizard-plain-name-input"
            readOnly={!isEditingName}
            onBlur={() => setIsEditingName(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                setIsEditingName(false);
              }
            }}
            placeholder={initialSwitch?.name || "My Switch"}
          />
          <button
            type="button"
            className="btn-edit-pencil"
            onClick={handleStartNameEdit}
            title="Edit switch name"
          >
            <Pencil size={15} />
          </button>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="wizard-progress-section">
        <div className="wizard-progress-header">
          <span className="wizard-step-badge">
            {initialSwitch
              ? `Editing Switch #${initialSwitch.id} — Step ${currentStep} of ${TOTAL_STEPS}`
              : `Step ${currentStep} of ${TOTAL_STEPS}`}
          </span>
          <div className="wizard-step-pills">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((stepNum) => (
              <button
                key={stepNum}
                type="button"
                onClick={() => {
                  setStepError("");
                  setCurrentStep(stepNum);
                }}
                className={`wizard-step-dot ${currentStep === stepNum ? "active" : ""}`}
                title={`Jump to Step ${stepNum}`}
              >
                {stepNum}
              </button>
            ))}
          </div>
        </div>
        <div className="wizard-progress-track">
          <div
            className="wizard-progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {serverError && <div className="form-error-banner">{serverError}</div>}
      {stepError && <div className="form-error-banner">{stepError}</div>}

      {/* Wizard Step Body */}
      <div className="wizard-body">
        {isTransitioning ? (
          <div className="wizard-step-transition">
            <div className="wizard-transition-spinner" />
            <div className="wizard-transition-title">Configuring Step...</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="wizard-form">
            {/* STEP 1: Split Question 1 - Purpose Domain */}
            {currentStep === 1 && (
              <div className="wizard-step-pane">
                <div className="wizard-step-title-group">
                  <h2 className="wizard-step-title">
                    What is the primary purpose of this switch?
                  </h2>
                </div>

                <div className="radio-inputs-grid">
                  {PURPOSE_OPTIONS.map((opt) => {
                    const IconComp = opt.icon;
                    const isChecked = selectedPurpose === opt.id;
                    return (
                      <label key={opt.id} className="radio-card-wrapper">
                        <input
                          type="radio"
                          value={opt.id}
                          checked={isChecked}
                          {...register("purpose")}
                          className="radio-hidden-input"
                        />
                        <span className={`radio-tile ${isChecked ? "active" : ""}`}>
                          <span className="radio-icon">
                            <IconComp size={24} />
                          </span>
                          <span className="radio-label">{opt.label}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>

                {/* Active Card Description Box */}
                <div className="active-card-description">
                  <Info size={16} className="active-desc-icon" />
                  <span>{currentPurposeMeta.description}</span>
                </div>
              </div>
            )}

            {/* STEP 2: Split Question 2 - Criticality / Importance */}
            {currentStep === 2 && (
              <div className="wizard-step-pane">
                <div className="wizard-step-title-group">
                  <h2 className="wizard-step-title">How important is this switch?</h2>
                </div>

                <div className="radio-inputs-grid">
                  {CRITICALITY_OPTIONS.map((opt) => {
                    const IconComp = opt.icon;
                    const isChecked = selectedCriticality === opt.id;
                    return (
                      <label key={opt.id} className="radio-card-wrapper">
                        <input
                          type="radio"
                          value={opt.id}
                          checked={isChecked}
                          {...register("criticality")}
                          className="radio-hidden-input"
                        />
                        <span className={`radio-tile ${isChecked ? "active" : ""}`}>
                          <span className="radio-icon">
                            <IconComp size={24} />
                          </span>
                          <span className="radio-label">{opt.label}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>

                {/* Active Card Description Box */}
                <div className="active-card-description">
                  <Info size={16} className="active-desc-icon" />
                  <span>{currentCriticalityMeta.description}</span>
                </div>
              </div>
            )}

            {/* STEP 3: Split Question 3 - Operational Notes */}
            {currentStep === 3 && (
              <div className="wizard-step-pane">
                <div className="wizard-step-title-group">
                  <h2 className="wizard-step-title">
                    Any operational notes or instructions?
                  </h2>
                </div>

                <div className="operational-notes-card">
                  <textarea
                    {...register("description")}
                    placeholder="Add operational notes, runbook guidance, or context for this switch..."
                    className="operational-notes-textarea"
                    rows={6}
                  />
                </div>
              </div>
            )}

            {/* STEP 4: Authorized Contacts */}
            {currentStep === 4 && (
              <div className="wizard-step-pane">
                <div className="wizard-step-title-group">
                  <h2 className="wizard-step-title">Authorized Contacts</h2>
                  <p className="wizard-step-desc wizard-step-desc-highlight">
                    Select contacts you&apos;d like to inform when this switch trips. You&apos;ll be able to specify the info they receive in next prompts.
                  </p>
                </div>

                {availableContacts.length === 0 ? (
                  <div className="contacts-empty-box">
                    <div className="contacts-empty-icon-wrap">
                      <Users size={26} style={{ color: "#ff3b19" }} />
                    </div>
                    <h3 className="contacts-empty-title">
                      No Contacts Found
                    </h3>
                    <p className="contacts-empty-desc">
                      You haven&apos;t added any recipients to your contactbook yet.
                    </p>
                    <Link
                      href="/dashboard/contacts"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-manage-contactbook"
                    >
                      <span>Manage Contactbook</span>
                      <ArrowUpRight size={15} />
                    </Link>
                  </div>
                ) : (
                  <div>
                    <div className="contacts-quick-actions">
                      <div className="contacts-bulk-buttons">
                        <button
                          type="button"
                          className="btn-contact-action"
                          onClick={() => toggleAllContacts(true)}
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          className="btn-contact-action"
                          onClick={() => toggleAllContacts(false)}
                        >
                          Clear
                        </button>
                      </div>
                      <span className="contacts-selected-count">
                        {selectedContactsCount} of {availableContacts.length} selected
                      </span>
                    </div>

                    <div className="contacts-tiles-stack">
                      {availableContacts.map((contact, index) => {
                        const isSelected = Boolean(watch(`contacts.${index}.selected`));
                        const initial = (contact.contact_name?.trim()?.[0] || "U").toUpperCase();

                        return (
                          <div
                            key={contact.id}
                            className={`contact-item-tile ${isSelected ? "selected" : ""}`}
                            onClick={() => {
                              setValue(`contacts.${index}.selected`, !isSelected);
                            }}
                          >
                            <input
                              type="hidden"
                              {...register(`contacts.${index}.contact_id`)}
                              value={contact.id}
                            />
                            <input
                              type="hidden"
                              {...register(`contacts.${index}.selected`)}
                            />

                            <div className="contact-tile-left">
                              <span className="contact-name-text">{contact.contact_name}</span>
                              <div className="contact-avatar-badge" title={contact.contact_name}>
                                {initial}
                              </div>
                            </div>

                            <div className="contact-tile-right" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="number"
                                min="1"
                                max="10"
                                placeholder="Priority"
                                {...register(`contacts.${index}.priority_score`)}
                                className="contact-score-input"
                                title="Priority Score (1-10)"
                              />

                              <input
                                type="number"
                                min="0"
                                max="100"
                                placeholder="Trust"
                                {...register(`contacts.${index}.trust_score`)}
                                className="contact-score-input"
                                title="Trust Clearance (0-100)"
                              />

                              <div className="contact-tooltip-wrapper">
                                <div className="btn-info-tooltip">
                                  <Info size={15} />
                                </div>
                                <div className="contact-tooltip-popup">
                                  <div className="tooltip-title">Scoring Guide</div>
                                  <div><strong>Priority (1–10):</strong> Who gets notified first during escalation.</div>
                                  <div style={{ marginTop: "4px" }}><strong>Trust (0–100):</strong> Required clearance score for disclosures.</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 5: Module 1 - Emergency Beacon */}
            {currentStep === 5 && (
              <div className="wizard-step-pane">
                <div className="module-toggle-header">
                  <h2 className="module-toggle-title">Emergency Beacon / Disclosures</h2>
                  <div className="checkbox-apple">
                    <input
                      id="toggle-beacon"
                      type="checkbox"
                      {...register("action_modules.beacon")}
                    />
                    <label htmlFor="toggle-beacon" />
                  </div>
                </div>

                {activeModules?.beacon && (
                  <div className="module-content-area">
                    <div className="payloads-stack">
                      {beaconFields.map((field, idx) => {
                        const trustValue = Number(
                          watch(`beacon_rows.${idx}.trust_required`)
                        );
                        const attachedFiles =
                          watch(`beacon_rows.${idx}.file_metadata`) || [];

                        return (
                          <div key={field.id} className="payload-card">
                            <div className="payload-card-header">
                              <span className="payload-index-label">
                                Package #{idx + 1}
                              </span>
                              {beaconFields.length > 1 && (
                                <button
                                  type="button"
                                  className="btn-remove-row"
                                  onClick={() => removeBeacon(idx)}
                                >
                                  Remove
                                </button>
                              )}
                            </div>

                            <div className="form-group">
                              <label className="form-label">
                                Dispatched Message / Sensitive Instructions
                              </label>
                              <textarea
                                {...register(`beacon_rows.${idx}.content`)}
                                placeholder="Confidential instructions, master passwords, or notes accompanying attached assets..."
                                className="form-textarea"
                                rows={3}
                              />
                            </div>

                            {/* Google Drive Asset Attachments */}
                            <div className="drive-attach-section">
                              <div className="drive-attach-header">
                                <label className="form-label" style={{ margin: 0 }}>
                                  Attached Google Drive Assets
                                </label>
                                <button
                                  type="button"
                                  onClick={() => openDrivePicker(idx)}
                                  className="btn-drive-picker"
                                >
                                  <span>📎</span>
                                  {attachedFiles.length > 0
                                    ? `Manage Drive Files (${attachedFiles.length})`
                                    : "Attach Google Drive Files"}
                                </button>
                              </div>

                              {attachedFiles.length > 0 && (
                                <div className="drive-files-chips-grid">
                                  {attachedFiles.map((file) => (
                                    <div key={file.id} className="drive-file-chip">
                                      {file.iconLink ? (
                                        <img
                                          src={file.iconLink}
                                          alt=""
                                          style={{ width: "14px", height: "14px" }}
                                        />
                                      ) : (
                                        <span>📄</span>
                                      )}
                                      <span className="drive-file-chip-name" title={file.name}>
                                        {file.name}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => removeDriveFile(idx, file.id)}
                                        className="btn-chip-remove"
                                        title="Remove file"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Clearance Routing */}
                            <div className="form-grid-2">
                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Clearance Tier</label>
                                <input
                                  type="hidden"
                                  {...register(`beacon_rows.${idx}.trust_required`)}
                                  value={trustValue}
                                />
                                <ClearanceTierSelect
                                  isBeacon={true}
                                  value={trustValue}
                                  onChange={(newVal) =>
                                    setValue(`beacon_rows.${idx}.trust_required`, newVal, {
                                      shouldValidate: true,
                                    })
                                  }
                                />
                              </div>

                              {trustValue === -1 && (
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                  <label className="form-label">Designated Recipient</label>
                                  <select
                                    {...register(`beacon_rows.${idx}.target_contact_id`)}
                                    className="form-select"
                                  >
                                    <option value="">Choose designated contact...</option>
                                    {availableContacts.map((c) => (
                                      <option key={c.id} value={c.id}>
                                        {c.contact_name} ({c.email})
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Intuitive Plus Button at Bottom */}
                    <button
                      type="button"
                      className="btn-add-bottom"
                      onClick={() =>
                        appendBeacon({
                          content: "",
                          trust_required: 50,
                          target_contact_id: "",
                          file_metadata: [],
                        })
                      }
                    >
                      <Plus size={16} />
                      <span>Add Disclosure Package</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* STEP 6: Module 2 - Infrastructure Lockdown */}
            {currentStep === 6 && (
              <div className="wizard-step-pane">
                <div className="module-toggle-header">
                  <h2 className="module-toggle-title">Infrastructure Lockdown</h2>
                  <div className="checkbox-apple">
                    <input
                      id="toggle-lockdown"
                      type="checkbox"
                      {...register("action_modules.lockdown")}
                    />
                    <label htmlFor="toggle-lockdown" />
                  </div>
                </div>

                {activeModules?.lockdown && (
                  <div className="module-content-area">
                    <div className="payload-card">
                      <div className="form-grid-2">
                        <div className="form-group">
                          <label className="form-label">HTTP Method</label>
                          <select
                            {...register("lockdown_config.http_method")}
                            className="form-select"
                          >
                            <option value="POST">POST</option>
                            <option value="PUT">PUT</option>
                            <option value="DELETE">DELETE</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Webhook URL</label>
                          <input
                            type="url"
                            {...register("lockdown_config.webhook_url")}
                            placeholder="https://api.yourcloud.com/v1/emergency-shutdown"
                            className="form-input"
                          />
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Authorization Header</label>
                        <input
                          type="text"
                          {...register("lockdown_config.auth_header")}
                          placeholder="Bearer your-secret-token"
                          className="form-input"
                        />
                      </div>

                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Custom Payload (JSON)</label>
                        <textarea
                          {...register("lockdown_config.payload_json")}
                          placeholder='{\n  "action": "REVOKE_ALL_SESSIONS"\n}'
                          className="form-textarea"
                          rows={3}
                          style={{ fontFamily: "monospace", fontSize: "12px" }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 7: Trip Interval */}
            {currentStep === 7 && (
              <div className="wizard-step-pane">
                <div className="wizard-step-title-group">
                  <h2 className="wizard-step-title">
                    How often should Vigil check in on you before tripping?
                  </h2>
                </div>

                <div className="interval-presets-bar">
                  <span className="interval-presets-label">Quick Presets:</span>
                  <button
                    type="button"
                    className="interval-preset-btn"
                    onClick={() => applyIntervalPreset(7)}
                  >
                    7 Days
                  </button>
                  <button
                    type="button"
                    className="interval-preset-btn"
                    onClick={() => applyIntervalPreset(14)}
                  >
                    14 Days
                  </button>
                  <button
                    type="button"
                    className="interval-preset-btn"
                    onClick={() => applyIntervalPreset(30)}
                  >
                    30 Days
                  </button>
                  <button
                    type="button"
                    className="interval-preset-btn"
                    onClick={() => applyIntervalPreset(90)}
                  >
                    90 Days
                  </button>
                </div>

                <div className="interval-grid">
                  <div className="interval-box">
                    <label>Months</label>
                    <input
                      type="number"
                      min="0"
                      max="24"
                      {...register("check_in_interval.months")}
                    />
                  </div>
                  <div className="interval-box">
                    <label>Days</label>
                    <input
                      type="number"
                      min="0"
                      max="365"
                      {...register("check_in_interval.days")}
                    />
                  </div>
                  <div className="interval-box">
                    <label>Hours</label>
                    <input
                      type="number"
                      min="0"
                      max="23"
                      {...register("check_in_interval.hours")}
                    />
                  </div>
                  <div className="interval-box">
                    <label>Minutes</label>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      {...register("check_in_interval.minutes")}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 8: Review & Arm Switch */}
            {currentStep === 8 && (
              <div className="wizard-step-pane">
                <div className="wizard-step-title-group">
                  <h2 className="wizard-step-title">Review & Arm Switch</h2>
                </div>

                <div className="confirmation-summary-card">
                  <div className="summary-row">
                    <span className="summary-label">Switch Name:</span>
                    <span className="summary-value highlight">{watch("name") || "Untitled"}</span>
                  </div>
                  <div className="summary-row">
                    <span className="summary-label">Purpose & Criticality:</span>
                    <span className="summary-value">
                      {currentPurposeMeta.label} &bull; {currentCriticalityMeta.label}
                    </span>
                  </div>
                  <div className="summary-row">
                    <span className="summary-label">Trip Interval:</span>
                    <span className="summary-value">
                      {[
                        watch("check_in_interval.months") > 0 ? `${watch("check_in_interval.months")}mo` : null,
                        watch("check_in_interval.days") > 0 ? `${watch("check_in_interval.days")}d` : null,
                        watch("check_in_interval.hours") > 0 ? `${watch("check_in_interval.hours")}h` : null,
                        watch("check_in_interval.minutes") > 0 ? `${watch("check_in_interval.minutes")}m` : null,
                      ].filter(Boolean).join(" ") || "0m"}
                    </span>
                  </div>
                  <div className="summary-row">
                    <span className="summary-label">Authorized Contacts:</span>
                    <span className="summary-value">
                      {selectedContactsCount} selected
                    </span>
                  </div>
                  <div className="summary-row">
                    <span className="summary-label">Active Modules:</span>
                    <div className="summary-modules-tags">
                      {activeModules?.beacon && <span className="module-tag">🚨 Beacon</span>}
                      {activeModules?.lockdown && <span className="module-tag">⚡ Lockdown</span>}
                      {!activeModules?.beacon && !activeModules?.lockdown && (
                        <span className="module-tag" style={{ color: "rgba(255,255,255,0.4)" }}>None</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="confirmation-warning-box">
                  <Shield size={22} style={{ color: "#ffffff", flexShrink: 0 }} />
                  <div>
                    <span style={{ fontWeight: 700, color: "#ffffff", display: "block", fontSize: "14px" }}>
                      {initialSwitch ? "Switch Reconfiguration Notice" : "Fail-Safe Safeguard Notice"}
                    </span>
                    <span style={{ fontSize: "13px", color: "#e2e8f0" }}>
                      {initialSwitch
                        ? "Saving changes updates your trigger rules, interval, contacts, and disclosure modules without resetting your current heartbeat cycle."
                        : "Once armed, this switch begins tracking your check-in pulse immediately. Keep your authentication credentials accessible."}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </form>
        )}
      </div>

      {/* Wizard Footer Controls */}
      <div className="wizard-footer-controls">
        <button
          type="button"
          onClick={handlePrev}
          disabled={currentStep === 1 || isTransitioning || submitting}
          className="btn-wizard-prev"
        >
          <ChevronLeft size={16} />
          <span>Previous</span>
        </button>

        <div className="wizard-footer-right">
          <Link
            href={initialSwitch ? `/dashboard/switches/${initialSwitch.id}` : "/dashboard/switches"}
            className="btn-wizard-cancel"
          >
            Cancel
          </Link>

          {currentStep < TOTAL_STEPS ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={isTransitioning}
              className="btn-wizard-next"
            >
              <span>Next</span>
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit(onSubmit)}
              disabled={submitting}
              className="btn-wizard-arm"
            >
              {submitting
                ? initialSwitch
                  ? "Saving Configuration..."
                  : "Arming Protocol..."
                : initialSwitch
                ? "Save Configuration Changes"
                : "Arm Dead Man's Switch"}
            </button>
          )}
        </div>
      </div>

      {/* Google Drive Selector Modal */}
      <GoogleDrivePickerModal
        isOpen={isDriveModalOpen}
        onClose={() => {
          setIsDriveModalOpen(false);
          setActiveDriveRowIndex(null);
        }}
        initialSelected={
          activeDriveRowIndex !== null
            ? watch(`beacon_rows.${activeDriveRowIndex}.file_metadata`) || []
            : []
        }
        onConfirm={handleDriveFilesConfirmed}
      />
    </div>
  );
}