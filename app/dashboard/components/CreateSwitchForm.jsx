"use client";

import React, { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSwitch } from "@/app/actions/switches";
import "../css/switch-form.css";

export default function CreateSwitchForm({ availableContacts = [] }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: "",
      description: "",
      purpose: "PERSONAL",
      criticality: "OPERATIONAL",
      check_in_interval: { months: 0, days: 30, hours: 0, minutes: 0 },
      
      // Enabled Action Modules
      action_modules: {
        beacon: true,      // Reach Out / Clearance-based briefings
        data_release: false, // File & payload downloads
        purge: false,       // Cloud data wiping
        lockdown: false,    // Key revocation & kill-switch webhooks
      },

      // Contact clearances
      contacts: availableContacts.map((c) => ({
        contact_id: c.id,
        selected: false,
        priority_score: 1,
        trust_score: 50,
      })),

      // ACTION 1: Full Compartmentalized Reach Out / Beacon Engine (Preserved)
      beacon_rows: [
        {
          content: "",
          trust_required: 50,
          target_contact_id: "",
        },
      ],

      // ACTION 2: Data Release Engine (Files / Vault Archives)
      data_releases: [
        {
          title: "",
          download_url: "",
          encryption_key_hint: "",
          trust_required: 75,
        },
      ],

      // ACTION 3: Data Purge Engine (Cloud Wipe)
      purge_config: {
        provider: "GOOGLE_DRIVE",
        target_resource_id: "",
        deletion_mode: "PERMANENT_SHRED",
      },

      // ACTION 4: Infrastructure Lockdown (Webhook Kill-Switch)
      lockdown_config: {
        webhook_url: "",
        auth_header: "",
        http_method: "POST",
        payload_json: '{\n  "action": "REVOKE_ALL_SESSIONS"\n}',
      },
    },
  });

  // Dynamic Array for Action 1: Reach Out / Beacon Disclosures
  const {
    fields: beaconFields,
    append: appendBeacon,
    remove: removeBeacon,
  } = useFieldArray({
    control,
    name: "beacon_rows",
  });

  // Dynamic Array for Action 2: Data Releases
  const {
    fields: releaseFields,
    append: appendRelease,
    remove: removeRelease,
  } = useFieldArray({
    control,
    name: "data_releases",
  });

  const activeModules = watch("action_modules");

  const onSubmit = async (formData) => {
    setSubmitting(true);
    setServerError("");
    const res = await createSwitch(formData);
    if (res?.error) {
      setServerError(res.error);
      setSubmitting(false);
    } else {
      router.push(`/dashboard/switches/${res.id}`);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="switch-form">
      {serverError && <div className="form-error-banner">{serverError}</div>}

      {/* 1. Identity & Classification */}
      <section className="form-section">
        <span className="section-legend">Identity & Classification</span>

        <div className="field-group">
          <label className="field-label">Switch Name</label>
          <input
            {...register("name", { required: "Name is required" })}
            placeholder="e.g. Master Vault Credentials & Infrastructure"
            className="input-text"
          />
          {errors.name && <span className="field-validation">{errors.name.message}</span>}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div className="field-group">
            <label className="field-label">Purpose Domain</label>
            <select {...register("purpose")} className="select-input">
              <option value="PERSONAL">Personal & Legacy</option>
              <option value="COMMERCIAL">Commercial & Business</option>
              <option value="SAFETY">Field & Personal Safety</option>
              <option value="GENERAL">General Countdown</option>
            </select>
          </div>

          <div className="field-group">
            <label className="field-label">Criticality Tier</label>
            <select {...register("criticality")} className="select-input">
              <option value="CRITICAL">Critical (Catastrophic / Irreversible)</option>
              <option value="OPERATIONAL">Operational (Standard Vigilance)</option>
              <option value="SENTINEL">Sentinel (Routine Heartbeat)</option>
            </select>
          </div>
        </div>

        <div className="field-group">
          <label className="field-label">Operational Notes</label>
          <textarea
            {...register("description")}
            placeholder="Context or runbook notes for this switch..."
            className="input-textarea"
            rows={2}
          />
        </div>
      </section>

      {/* 2. Check-In Interval with Minutes */}
      <section className="form-section">
        <span className="section-legend">Trip Interval</span>
        <div className="interval-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
          <div className="interval-box">
            <label>Months</label>
            <input type="number" min="0" max="24" {...register("check_in_interval.months")} />
          </div>
          <div className="interval-box">
            <label>Days</label>
            <input type="number" min="0" max="365" {...register("check_in_interval.days")} />
          </div>
          <div className="interval-box">
            <label>Hours</label>
            <input type="number" min="0" max="23" {...register("check_in_interval.hours")} />
          </div>
          <div className="interval-box">
            <label>Minutes</label>
            <input type="number" min="0" max="59" {...register("check_in_interval.minutes")} />
          </div>
        </div>
      </section>

      {/* 3. Authorized Contacts Pool */}
      <section className="form-section">
        <span className="section-legend">Authorized Recipients Pool</span>
        <p className="field-hint">
          Contacts who receive graduated briefings based on Priority and Trust clearance ratings.
        </p>
        {availableContacts.length === 0 ? (
          <div className="contacts-empty-box">
            No contacts registered.{" "}
            <Link href="/dashboard/contacts" className="inline-link">
              Create contacts first
            </Link>
          </div>
        ) : (
          <div className="contacts-selection-table">
            <div className="c-table-header">
              <span>Link</span>
              <span>Contact</span>
              <span>Email</span>
              <span>Priority (1-10)</span>
              <span>Trust (0-100)</span>
            </div>
            {availableContacts.map((contact, index) => (
              <div key={contact.id} className="c-table-row">
                <input
                  type="hidden"
                  {...register(`contacts.${index}.contact_id`)}
                  value={contact.id}
                />
                <div className="c-col-check">
                  <input type="checkbox" {...register(`contacts.${index}.selected`)} />
                </div>
                <div className="c-col-name">{contact.contact_name}</div>
                <div className="c-col-email">{contact.email}</div>
                <div className="c-col-num">
                  <input
                    type="number"
                    min="1"
                    max="10"
                    {...register(`contacts.${index}.priority_score`)}
                    className="input-num-sm"
                  />
                </div>
                <div className="c-col-num">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    {...register(`contacts.${index}.trust_score`)}
                    className="input-num-sm"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 4. Action Modules Selector */}
      <section className="form-section">
        <span className="section-legend">Escalation Action Modules</span>
        <p className="field-hint">Enable the autonomous actions to trigger when this switch trips.</p>
        <div className="actions-checkbox-group">
          <label className="checkbox-card">
            <input type="checkbox" {...register("action_modules.beacon")} />
            <div className="checkbox-meta">
              <span className="checkbox-title">🚨 Emergency Beacon / Reach Out</span>
              <span className="checkbox-desc">Graduated briefings & disclosures routed via Trust scores.</span>
            </div>
          </label>
          <label className="checkbox-card">
            <input type="checkbox" {...register("action_modules.data_release")} />
            <div className="checkbox-meta">
              <span className="checkbox-title">📦 Data Release Packages</span>
              <span className="checkbox-desc">Transmit file archives and encrypted download links.</span>
            </div>
          </label>
          <label className="checkbox-card">
            <input type="checkbox" {...register("action_modules.purge")} />
            <div className="checkbox-meta">
              <span className="checkbox-title">🔥 Remote Purge</span>
              <span className="checkbox-desc">Trigger cloud storage shredding or account wipe.</span>
            </div>
          </label>
          <label className="checkbox-card">
            <input type="checkbox" {...register("action_modules.lockdown")} />
            <div className="checkbox-meta">
              <span className="checkbox-title">⚡ Infrastructure Lockdown</span>
              <span className="checkbox-desc">Fire kill-switch webhooks to revoke tokens & keys.</span>
            </div>
          </label>
        </div>
      </section>

      {/* MODULE 1: COMPARTMENTALIZED EMERGENCY BEACON (PRESERVED FULL STRUCTURE) */}
      {activeModules.beacon && (
        <section className="form-section">
          <div className="section-legend-bar">
            <div>
              <span className="section-legend">Emergency Beacon: Compartmentalized Briefings</span>
              <p className="field-hint" style={{ marginTop: "4px" }}>
                Multi-tier intelligence routing. Deliver specific instructions to exceptions or clearance tiers.
              </p>
            </div>
            <button
              type="button"
              className="btn-add-row"
              onClick={() =>
                appendBeacon({ content: "", trust_required: 50, target_contact_id: "" })
              }
            >
              + Add Briefing Row
            </button>
          </div>

          <div className="payloads-stack">
            {beaconFields.map((field, idx) => {
              const trustValue = Number(watch(`beacon_rows.${idx}.trust_required`));

              return (
                <div key={field.id} className="payload-card">
                  <div className="payload-card-header">
                    <span className="payload-index-label">Briefing Item #{idx + 1}</span>
                    {beaconFields.length > 1 && (
                      <button
                        type="button"
                        className="btn-remove-row"
                        onClick={() => removeBeacon(idx)}
                      >
                        Delete
                      </button>
                    )}
                  </div>

                  <div className="field-group">
                    <label className="field-label">Dispatched Content / Instructions</label>
                    <textarea
                      {...register(`beacon_rows.${idx}.content`, {
                        required: activeModules.beacon ? "Briefing content cannot be empty" : false,
                      })}
                      placeholder="Confidential instructions, status alert, credentials, or situation report..."
                      className="input-textarea"
                      rows={3}
                    />
                  </div>

                  <div className="payload-routing-grid">
                    <div className="field-group">
                      <label className="field-label">Clearance Tier</label>
                      <select
                        {...register(`beacon_rows.${idx}.trust_required`)}
                        className="select-input"
                      >
                        <option value={75}>High Clearance (Trust &ge; 75)</option>
                        <option value={50}>Medium Clearance (Trust &ge; 50)</option>
                        <option value={25}>Low Clearance (Trust &ge; 25)</option>
                        <option value={-1}>Designated Sole Recipient (-1)</option>
                      </select>
                    </div>

                    {trustValue === -1 && (
                      <div className="field-group">
                        <label className="field-label">Target Recipient</label>
                        <select
                          {...register(`beacon_rows.${idx}.target_contact_id`, {
                            required: trustValue === -1 ? "Select recipient" : false,
                          })}
                          className="select-input"
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
        </section>
      )}

      {/* MODULE 2: DATA RELEASES */}
      {activeModules.data_release && (
        <section className="form-section">
          <div className="section-legend-bar">
            <div>
              <span className="section-legend">Data Releases: External Archives & Packages</span>
              <p className="field-hint" style={{ marginTop: "4px" }}>
                Provide secure links or vault archives to be distributed upon switch expiration.
              </p>
            </div>
            <button
              type="button"
              className="btn-add-row"
              onClick={() =>
                appendRelease({
                  title: "",
                  download_url: "",
                  encryption_key_hint: "",
                  trust_required: 75,
                })
              }
            >
              + Add Data Package
            </button>
          </div>

          <div className="payloads-stack">
            {releaseFields.map((field, idx) => (
              <div key={field.id} className="payload-card">
                <div className="payload-card-header">
                  <span className="payload-index-label">Package #{idx + 1}</span>
                  {releaseFields.length > 1 && (
                    <button
                      type="button"
                      className="btn-remove-row"
                      onClick={() => removeRelease(idx)}
                    >
                      Delete
                    </button>
                  )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div className="field-group">
                    <label className="field-label">Package Label</label>
                    <input
                      {...register(`data_releases.${idx}.title`)}
                      placeholder="e.g. Offsite Cold Storage Backup"
                      className="input-text"
                    />
                  </div>
                  <div className="field-group">
                    <label className="field-label">Download / Vault URL</label>
                    <input
                      {...register(`data_releases.${idx}.download_url`)}
                      placeholder="https://drive.proton.me/... or S3 Presigned URL"
                      className="input-text"
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "12px" }}>
                  <div className="field-group">
                    <label className="field-label">Decryption Hint / Key Location</label>
                    <input
                      {...register(`data_releases.${idx}.encryption_key_hint`)}
                      placeholder="e.g. Master GPG key on hardware YubiKey"
                      className="input-text"
                    />
                  </div>
                  <div className="field-group">
                    <label className="field-label">Min Trust Required</label>
                    <select
                      {...register(`data_releases.${idx}.trust_required`)}
                      className="select-input"
                    >
                      <option value={75}>Trust &ge; 75</option>
                      <option value={50}>Trust &ge; 50</option>
                      <option value={25}>Trust &ge; 25</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* MODULE 3: REMOTE PURGE */}
      {activeModules.purge && (
        <section className="form-section">
          <span className="section-legend">Remote Purge: Storage Shredding</span>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "12px" }}>
            <div className="field-group">
              <label className="field-label">Target Provider</label>
              <select {...register("purge_config.provider")} className="select-input">
                <option value="GOOGLE_DRIVE">Google Drive Folder</option>
                <option value="AWS_S3">Amazon AWS S3 Bucket</option>
                <option value="CUSTOM_API">Custom Purge Endpoint</option>
              </select>
            </div>
            <div className="field-group">
              <label className="field-label">Target Identifier / Folder ID / Path</label>
              <input
                {...register("purge_config.target_resource_id")}
                placeholder="Folder ID, Bucket Name, or Directory Path to shred"
                className="input-text"
              />
            </div>
          </div>
        </section>
      )}

      {/* MODULE 4: INFRASTRUCTURE LOCKDOWN */}
      {activeModules.lockdown && (
        <section className="form-section">
          <span className="section-legend">Infrastructure Lockdown: Emergency Webhook</span>
          <div style={{ display: "grid", gridTemplateColumns: "100px 1fr 1fr", gap: "12px" }}>
            <div className="field-group">
              <label className="field-label">Method</label>
              <select {...register("lockdown_config.http_method")} className="select-input">
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
            <div className="field-group">
              <label className="field-label">Webhook URL</label>
              <input
                {...register("lockdown_config.webhook_url")}
                placeholder="https://api.yourcloud.com/v1/emergency-shutdown"
                className="input-text"
              />
            </div>
            <div className="field-group">
              <label className="field-label">Authorization Header</label>
              <input
                {...register("lockdown_config.auth_header")}
                placeholder="Bearer your-secret-token"
                className="input-text"
              />
            </div>
          </div>
        </section>
      )}

      {/* Form Submission */}
      <div className="form-actions">
        <Link href="/dashboard/switches" className="btn-secondary">
          Cancel
        </Link>
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? "Arming Switch..." : "Arm Dead Man's Switch"}
        </button>
      </div>
    </form>
  );
}