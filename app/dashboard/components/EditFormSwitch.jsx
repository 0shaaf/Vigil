"use client";

import React, { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  updateSwitch,
  removeSwitch,
  checkInSingleSwitch,
} from "@/app/actions/switches";
import "../css/switch-form.css";

function calculateDeadline(lastCheckIn, interval) {
  if (!lastCheckIn) return { text: "Uninitialized", isArmed: false };
  const deadline = new Date(lastCheckIn);
  if (interval?.months) deadline.setMonth(deadline.getMonth() + Number(interval.months));
  if (interval?.days) deadline.setDate(deadline.getDate() + Number(interval.days));
  if (interval?.hours) deadline.setHours(deadline.getHours() + Number(interval.hours));
  if (interval?.minutes) deadline.setMinutes(deadline.getMinutes() + Number(interval.minutes));

  const diffMs = deadline.getTime() - Date.now();
  if (diffMs <= 0) return { text: "TRIP EXPIRED", isArmed: false, isTripped: true };

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  let text = "";
  if (days > 0) text = `${days}d ${hours}h remaining`;
  else if (hours > 0) text = `${hours}h ${minutes}m remaining`;
  else text = `${minutes}m remaining`;

  return { text, isArmed: true, isTripped: false };
}


export default function EditSwitchForm({ switchData, availableContacts = [] }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [pulsing, setPulsing] = useState(false);

  // Map existing switch_contacts into a lookup map
  const activeContactsMap = new Map(
    (switchData.switch_contacts || []).map((sc) => [sc.contact_id, sc])
  );

  // Pre-seed contacts selection table with saved priority & trust scores
  const initialContacts = availableContacts.map((c) => {
    const existing = activeContactsMap.get(c.id);
    return {
      contact_id: c.id,
      selected: Boolean(existing),
      priority_score: existing ? existing.priority_score : 1,
      trust_score: existing ? existing.trust_score : 50,
    };
  });

  // Pre-seed existing info_to_release rows
  const initialInfoRows =
    switchData.info_to_release && switchData.info_to_release.length > 0
      ? switchData.info_to_release.map((row) => ({
        content: row.content,
        trust_required: row.trust_required,
        target_contact_id: row.target_contact_id || "",
      }))
      : [{ content: "", trust_required: 50, target_contact_id: "" }];

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: switchData.name || "",
      description: switchData.description || "",
      purpose: switchData.purpose || "PERSONAL",
      criticality: switchData.criticality || "OPERATIONAL",
      check_in_interval: {
        months: switchData.check_in_interval?.months || 0,
        days: switchData.check_in_interval?.days || 0,
        hours: switchData.check_in_interval?.hours || 0,
        minutes: switchData.check_in_interval?.minutes || 0,
      },
      actions: {
        email: Boolean(switchData.actions?.email),
        call: Boolean(switchData.actions?.call),
        forwardData: Boolean(switchData.actions?.forwardData),
      },
      contacts: initialContacts,
      info_rows: initialInfoRows,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "info_rows",
  });

  // Current timer status calculation
  const deadline = calculateDeadline(
    switchData.last_check_in,
    switchData.check_in_interval
  );

  const onSubmit = async (formData) => {
    setSubmitting(true);
    setServerError("");

    const res = await updateSwitch(switchData.id, formData);

    if (res?.error) {
      setServerError(res.error);
      setSubmitting(false);
    } else {
      router.push("/dashboard/switches");
      router.refresh();
    }
  };

  const handlePulse = async () => {
    setPulsing(true);
    await checkInSingleSwitch(switchData.id);
    setPulsing(false);
    router.refresh();
  };

  const handleDelete = async () => {
    if (
      !confirm(
        `Are you sure you want to permanently delete "${switchData.name}"? All assigned disclosures will be removed.`
      )
    ) {
      return;
    }

    const res = await removeSwitch(switchData.id);
    if (res?.error) {
      setServerError(res.error);
    } else {
      router.push("/dashboard/switches");
      router.refresh();
    }
  };

  return (
    <div className="switch-form-wrapper">
      {/* Telemetry Status Banner & Individual Pulse Button */}
      <div className="status-banner">
        <div className="status-pill-group">
          <div
            className={`status-indicator ${deadline.isTripped ? "is-tripped" : deadline.isArmed ? "is-armed" : ""
              }`}
          />
          <span className="status-label">
            {deadline.isTripped ? "TRIPPED" : deadline.isArmed ? "ARMED" : "INACTIVE"}
          </span>
          <span className="status-timer-text">
            {deadline.text} — Last pulse:{" "}
            {switchData.last_check_in
              ? new Date(switchData.last_check_in).toLocaleString()
              : "Never"}
          </span>
        </div>

        <button
          type="button"
          onClick={handlePulse}
          disabled={pulsing}
          className="btn-secondary"
          title="Reset timer countdown for this switch"
        >
          {pulsing ? "Pulsing..." : "Pulse Check-In"}
        </button>
      </div>

      {serverError && <div className="form-error-banner">{serverError}</div>}

      <form onSubmit={handleSubmit(onSubmit)} className="switch-form">
        {/* 1. Identity & Parameters */}
        <section className="form-section">
          <span className="section-legend">Identity & Parameters</span>

          <div className="field-group">
            <label className="field-label">Switch Name</label>
            <input
              {...register("name", { required: "Name is required" })}
              className="input-text"
            />
            {errors.name && (
              <span className="field-validation">{errors.name.message}</span>
            )}
          </div>

          <div className="field-group">
            <label className="field-label">Operational Notes</label>
            <textarea
              {...register("description")}
              className="input-textarea"
              rows={2}
            />
          </div>
        </section>

        {/* 2. Escalation Channels */}
        <section className="form-section">
          <span className="section-legend">Escalation Channels (Actions Matrix)</span>
          <div className="actions-checkbox-group">
            <label className="checkbox-card">
              <input type="checkbox" {...register("actions.email")} />
              <div className="checkbox-meta">
                <span className="checkbox-title">Email Dispatch</span>
                <span className="checkbox-desc">Transmit encrypted payloads via email.</span>
              </div>
            </label>

            <label className="checkbox-card">
              <input type="checkbox" {...register("actions.call")} />
              <div className="checkbox-meta">
                <span className="checkbox-title">Voice Call Alert</span>
                <span className="checkbox-desc">Initiate automated telephonic escalation.</span>
              </div>
            </label>

            <label className="checkbox-card">
              <input type="checkbox" {...register("actions.forwardData")} />
              <div className="checkbox-meta">
                <span className="checkbox-title">Data Forwarding</span>
                <span className="checkbox-desc">Route payload streams to auxiliary webhooks.</span>
              </div>
            </label>
          </div>
        </section>

        {/* 3. Check-In Interval */}
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

        {/* 4. Contact Clearances */}
        <section className="form-section">
          <span className="section-legend">Authorized Recipients Pool</span>
          <p className="field-hint">
            Assign priority and trust ratings to determine clearance order.
          </p>

          {availableContacts.length === 0 ? (
            <div className="contacts-empty-box">
              No contacts registered.{" "}
              <Link href="/dashboard/contacts" className="inline-link">
                Create contacts first →
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

        {/* 5. Dynamic Payloads / Disclosures */}
        <section className="form-section">
          <div className="section-legend-bar">
            <span className="section-legend">Compartmentalized Disclosures (Payloads)</span>
            <button
              type="button"
              className="btn-add-row"
              onClick={() =>
                append({ content: "", trust_required: 50, target_contact_id: "" })
              }
            >
              + Add Disclosure Row
            </button>
          </div>

          <div className="payloads-stack">
            {fields.map((field, idx) => {
              const trustValue = Number(watch(`info_rows.${idx}.trust_required`));

              return (
                <div key={field.id} className="payload-card">
                  <div className="payload-card-header">
                    <span className="payload-index-label">Disclosure #{idx + 1}</span>
                    {fields.length > 1 && (
                      <button
                        type="button"
                        className="btn-remove-row"
                        onClick={() => remove(idx)}
                      >
                        Delete
                      </button>
                    )}
                  </div>

                  <div className="field-group">
                    <label className="field-label">Release Payload / Secrets</label>
                    <textarea
                      {...register(`info_rows.${idx}.content`, {
                        required: "Payload cannot be empty",
                      })}
                      className="input-textarea"
                      rows={4}
                    />
                  </div>

                  <div className="payload-routing-grid">
                    <div className="field-group">
                      <label className="field-label">Delivery Rule</label>
                      <select
                        {...register(`info_rows.${idx}.trust_required`)}
                        className="select-input"
                      >
                        <option value={75}>High Clearance (Trust ≥ 75)</option>
                        <option value={50}>Medium Clearance (Trust ≥ 50)</option>
                        <option value={25}>Low Clearance (Trust ≥ 25)</option>
                        <option value={-1}>Specific Contact Exception (-1)</option>
                      </select>
                    </div>

                    {trustValue === -1 && (
                      <div className="field-group">
                        <label className="field-label">Designated Sole Recipient</label>
                        <select
                          {...register(`info_rows.${idx}.target_contact_id`, {
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

        {/* Actions */}
        <div className="form-actions">
          <Link href="/dashboard/switches" className="btn-secondary">
            Cancel
          </Link>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? "Saving Changes..." : "Save Modifications"}
          </button>
        </div>
      </form>

      {/* Danger Zone: Cascade Delete */}
      <div className="danger-zone">
        <div>
          <h3 className="danger-title">Disarm and Destroy Switch</h3>
          <p className="danger-desc">
            Permanently purges this switch along with all linked disclosure rows.
          </p>
        </div>
        <button type="button" onClick={handleDelete} className="btn-danger">
          Delete Switch
        </button>
      </div>
    </div>
  );
}