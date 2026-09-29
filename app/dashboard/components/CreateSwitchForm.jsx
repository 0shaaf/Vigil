"use client";

import React, { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSwitch } from "@/app/actions/switches";
import GoogleDrivePickerModal from "@/app/compontents/GoogleDrivePickerModal";
import "../css/switch-form.css";

export default function CreateSwitchForm({ availableContacts = [] }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");

  // Drive Modal State
  const [activeDriveRowIndex, setActiveDriveRowIndex] = useState(null);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);

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
        beacon: true,
        data_release: false,
        purge: false,
        lockdown: false,
      },

      // Contact clearances
      contacts: availableContacts.map((c) => ({
        contact_id: c.id,
        selected: false,
        priority_score: 1,
        trust_score: 50,
      })),

      // ACTION 1: Reach Out / Beacon Engine
      beacon_rows: [
        {
          content: "",
          trust_required: 50,
          target_contact_id: "",
          file_metadata: [],
        },
      ],

      // ACTION 2: Data Releases
      data_releases: [
        {
          title: "",
          download_url: "",
          encryption_key_hint: "",
          trust_required: 75,
        },
      ],

      // ACTION 3: Data Purge Engine
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

  const {
    fields: beaconFields,
    append: appendBeacon,
    remove: removeBeacon,
    update: updateBeacon,
  } = useFieldArray({
    control,
    name: "beacon_rows",
  });

  const {
    fields: releaseFields,
    append: appendRelease,
    remove: removeRelease,
  } = useFieldArray({
    control,
    name: "data_releases",
  });

  const activeModules = watch("action_modules");

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

  const onSubmit = async (formData) => {
    setSubmitting(true);
    setServerError("");

    try {
      // 1. Filter selected contacts and parse scores
      const selectedContacts = (formData.contacts || [])
        .filter((c) => c.selected)
        .map((c) => ({
          contact_id: c.contact_id,
          priority_score: Number(c.priority_score) || 1,
          trust_score: Number(c.trust_score) || 0,
        }));

      // 2. Sanitize countdown interval units
      const sanitizedInterval = {
        months: Number(formData.check_in_interval?.months || 0),
        days: Number(formData.check_in_interval?.days || 0),
        hours: Number(formData.check_in_interval?.hours || 0),
        minutes: Number(formData.check_in_interval?.minutes || 0),
      };

      // 3. Format action modules
      const sanitizedActions = {
        email: true,
        modules: {
          beacon: Boolean(formData.action_modules?.beacon),
          data_release: Boolean(formData.action_modules?.data_release),
          purge: Boolean(formData.action_modules?.purge),
          lockdown: Boolean(formData.action_modules?.lockdown),
        },
        data_releases: formData.action_modules?.data_release
          ? (formData.data_releases || []).filter((r) => r.title || r.download_url)
          : [],
        purge_config: formData.action_modules?.purge ? formData.purge_config : null,
        lockdown_config: formData.action_modules?.lockdown
          ? formData.lockdown_config
          : null,
      };

      // 4. Sanitize beacon disclosures
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

      // 5. Build normalized payload
      const payload = {
        name: formData.name?.trim(),
        description: formData.description?.trim() || null,
        purpose: formData.purpose || "PERSONAL",
        criticality: formData.criticality || "OPERATIONAL",
        check_in_interval: sanitizedInterval,
        actions: sanitizedActions,
        contacts: selectedContacts,
        beacon_rows: sanitizedBeaconRows,
      };

      const res = await createSwitch(payload);

      if (res?.error) {
        setServerError(res.error);
        setSubmitting(false);
      } else if (res?.id) {
        router.push(`/dashboard/switches/${res.id}`);
      }
    } catch (err) {
      console.error("[CreateSwitchForm] Submit Error:", err);
      setServerError(err.message || "Failed to arm switch. Please try again.");
      setSubmitting(false);
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
          {errors.name && (
            <span className="field-validation">{errors.name.message}</span>
          )}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
          }}
        >
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
              <option value="CRITICAL">
                Critical (Catastrophic / Irreversible)
              </option>
              <option value="OPERATIONAL">
                Operational (Standard Vigilance)
              </option>
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

      {/* 2. Check-In Interval */}
      <section className="form-section">
        <span className="section-legend">Trip Interval</span>
        <div
          className="interval-grid"
          style={{ gridTemplateColumns: "repeat(4, 1fr)" }}
        >
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
      </section>

      {/* 3. Authorized Recipients Pool */}
      <section className="form-section">
        <span className="section-legend">Authorized Recipients Pool</span>
        <p className="field-hint">
          Contacts who receive graduated briefings based on Priority and Trust
          clearance ratings.
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
                  <input
                    type="checkbox"
                    {...register(`contacts.${index}.selected`)}
                  />
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
        <p className="field-hint">
          Enable autonomous actions to trigger when this switch trips.
        </p>
        <div className="actions-checkbox-group">
          <label className="checkbox-card">
            <input type="checkbox" {...register("action_modules.beacon")} />
            <div className="checkbox-meta">
              <span className="checkbox-title">
                🚨 Emergency Beacon / Disclosures
              </span>
              <span className="checkbox-desc">
                Graduated briefings & Drive files routed via clearance or sole
                recipient.
              </span>
            </div>
          </label>
          <label className="checkbox-card">
            <input
              type="checkbox"
              {...register("action_modules.data_release")}
            />
            <div className="checkbox-meta">
              <span className="checkbox-title">📦 Data Release Packages</span>
              <span className="checkbox-desc">
                Transmit external archives and encrypted vault links.
              </span>
            </div>
          </label>
          <label className="checkbox-card">
            <input type="checkbox" {...register("action_modules.purge")} />
            <div className="checkbox-meta">
              <span className="checkbox-title">🔥 Remote Purge</span>
              <span className="checkbox-desc">
                Trigger cloud storage shredding or account wipe.
              </span>
            </div>
          </label>
          <label className="checkbox-card">
            <input type="checkbox" {...register("action_modules.lockdown")} />
            <div className="checkbox-meta">
              <span className="checkbox-title">⚡ Infrastructure Lockdown</span>
              <span className="checkbox-desc">
                Fire kill-switch webhooks to revoke tokens & keys.
              </span>
            </div>
          </label>
        </div>
      </section>

      {/* MODULE 1: BRIEFINGS & DRIVE RELEASES */}
      {activeModules.beacon && (
        <section className="form-section">
          <div className="section-legend-bar">
            <div>
              <span className="section-legend">
                Emergency Disclosures & File Releases
              </span>
              <p className="field-hint" style={{ marginTop: "4px" }}>
                Deliver confidential messages and Google Drive assets to
                designated contacts or clearance tiers.
              </p>
            </div>
            <button
              type="button"
              className="btn-add-row"
              onClick={() =>
                appendBeacon({
                  content: "",
                  trust_required: 50,
                  target_contact_id: "",
                  file_metadata: [],
                })
              }
            >
              + Add Disclosure Row
            </button>
          </div>

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
                      Disclosure Package #{idx + 1}
                    </span>
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
                    <label className="field-label">
                      Dispatched Message / Operational Notes
                    </label>
                    <textarea
                      {...register(`beacon_rows.${idx}.content`, {
                        validate: (val) => {
                          if (!activeModules.beacon) return true;
                          const hasFiles =
                            (watch(`beacon_rows.${idx}.file_metadata`) || [])
                              .length > 0;
                          if (!val?.trim() && !hasFiles) {
                            return "Please enter a message or attach at least one Drive asset.";
                          }
                          return true;
                        },
                      })}
                      placeholder="Confidential instructions, master passwords, or notes accompanying attached assets..."
                      className="input-textarea"
                      rows={3}
                    />
                    {errors.beacon_rows?.[idx]?.content && (
                      <span className="field-validation">
                        {errors.beacon_rows[idx].content.message}
                      </span>
                    )}
                  </div>

                  {/* Google Drive Asset Attachments */}
                  <div style={{ marginTop: "12px", marginBottom: "16px" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "8px",
                      }}
                    >
                      <label className="field-label" style={{ margin: 0 }}>
                        Attached Google Drive Assets
                      </label>
                      <button
                        type="button"
                        onClick={() => openDrivePicker(idx)}
                        style={{
                          background: "rgba(56, 189, 248, 0.1)",
                          border: "1px solid rgba(56, 189, 248, 0.3)",
                          color: "#38bdf8",
                          padding: "5px 12px",
                          borderRadius: "4px",
                          fontSize: "12px",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <span>📎</span>
                        {attachedFiles.length > 0
                          ? `Manage Files (${attachedFiles.length})`
                          : "Attach Drive Files"}
                      </button>
                    </div>

                    {attachedFiles.length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "8px",
                          background: "#080b11",
                          border: "1px solid #1e293b",
                          borderRadius: "6px",
                          padding: "10px",
                        }}
                      >
                        {attachedFiles.map((file) => (
                          <div
                            key={file.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              background: "#161b26",
                              border: "1px solid #334155",
                              borderRadius: "4px",
                              padding: "4px 10px",
                              fontSize: "12px",
                              color: "#e2e8f0",
                            }}
                          >
                            {file.iconLink ? (
                              <img
                                src={file.iconLink}
                                alt=""
                                style={{ width: "14px", height: "14px" }}
                              />
                            ) : (
                              <span>📄</span>
                            )}
                            <span
                              style={{
                                maxWidth: "220px",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                              title={file.name}
                            >
                              {file.name}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeDriveFile(idx, file.id)}
                              style={{
                                background: "transparent",
                                border: "none",
                                color: "#94a3b8",
                                cursor: "pointer",
                                fontSize: "14px",
                                lineHeight: 1,
                                padding: "0 2px",
                              }}
                              title="Remove file"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Routing & Clearances */}
                  <div className="payload-routing-grid">
                    <div className="field-group">
                      <label className="field-label">Clearance Tier</label>
                      <select
                        {...register(`beacon_rows.${idx}.trust_required`)}
                        className="select-input"
                      >
                        <option value={75}>High Clearance (Trust &ge; 75)</option>
                        <option value={50}>
                          Medium Clearance (Trust &ge; 50)
                        </option>
                        <option value={25}>Low Clearance (Trust &ge; 25)</option>
                        <option value={-1}>
                          Designated Sole Recipient (-1)
                        </option>
                      </select>
                    </div>

                    {trustValue === -1 && (
                      <div className="field-group">
                        <label className="field-label">Designated Recipient</label>
                        <select
                          {...register(`beacon_rows.${idx}.target_contact_id`, {
                            required:
                              trustValue === -1 ? "Select recipient" : false,
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
              <span className="section-legend">External Vault Archives</span>
              <p className="field-hint" style={{ marginTop: "4px" }}>
                Provide external pre-signed URLs or vault download destinations.
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

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px",
                  }}
                >
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
                      placeholder="https://drive.proton.me/... or S3 URL"
                      className="input-text"
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr",
                    gap: "12px",
                  }}
                >
                  <div className="field-group">
                    <label className="field-label">
                      Decryption Hint / Key Location
                    </label>
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
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 2fr",
              gap: "12px",
            }}
          >
            <div className="field-group">
              <label className="field-label">Target Provider</label>
              <select
                {...register("purge_config.provider")}
                className="select-input"
              >
                <option value="GOOGLE_DRIVE">Google Drive Folder</option>
                <option value="AWS_S3">Amazon AWS S3 Bucket</option>
                <option value="CUSTOM_API">Custom Purge Endpoint</option>
              </select>
            </div>
            <div className="field-group">
              <label className="field-label">
                Target Identifier / Folder ID / Path
              </label>
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
          <span className="section-legend">
            Infrastructure Lockdown: Emergency Webhook
          </span>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "110px 1fr 1fr",
              gap: "12px",
              marginBottom: "12px",
            }}
          >
            <div className="field-group">
              <label className="field-label">Method</label>
              <select
                {...register("lockdown_config.http_method")}
                className="select-input"
              >
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
            <div className="field-group">
              <label className="field-label">Webhook URL</label>
              <input
                type="url"
                {...register("lockdown_config.webhook_url", {
                  required: activeModules.lockdown
                    ? "Webhook URL is required when lockdown is armed"
                    : false,
                })}
                placeholder="https://api.yourcloud.com/v1/emergency-shutdown"
                className="input-text"
              />
              {errors.lockdown_config?.webhook_url && (
                <span className="field-validation">
                  {errors.lockdown_config.webhook_url.message}
                </span>
              )}
            </div>
            <div className="field-group">
              <label className="field-label">Authorization Header</label>
              <input
                type="text"
                {...register("lockdown_config.auth_header")}
                placeholder="Bearer your-secret-token"
                className="input-text"
              />
            </div>
          </div>

          <div className="field-group">
            <label className="field-label">Custom Payload (JSON)</label>
            <textarea
              {...register("lockdown_config.payload_json")}
              placeholder='{\n  "action": "REVOKE_ALL_SESSIONS"\n}'
              className="input-textarea"
              rows={3}
              style={{ fontFamily: "monospace", fontSize: "12px" }}
            />
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
    </form>
  );
}