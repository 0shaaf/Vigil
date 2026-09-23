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
      check_in_interval: { months: 0, days: 30, hours: 0 },
      actions: { email: true, call: false, forwardData: false },
      // Initialize available contacts with default scores
      contacts: availableContacts.map((c) => ({
        contact_id: c.id,
        selected: false,
        priority_score: 1,
        trust_score: 50,
      })),
      // Default to one empty info row
      info_rows: [
        {
          content: "",
          trust_required: 50,
          target_contact_id: "",
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "info_rows",
  });

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

      {/* 1. Identity */}
      <section className="form-section">
        <span className="section-legend">Identity & Parameters</span>

        <div className="field-group">
          <label className="field-label">Switch Name</label>
          <input
            {...register("name", { required: "Name is required" })}
            placeholder="e.g. Master Vault Credentials & Keys"
            className="input-text"
          />
          {errors.name && <span className="field-validation">{errors.name.message}</span>}
        </div>

        <div className="field-group">
          <label className="field-label">Operational Notes</label>
          <textarea
            {...register("description")}
            placeholder="Internal context for this trigger..."
            className="input-textarea"
            rows={2}
          />
        </div>
      </section>

      {/* 2. Actions & Escalation Channels */}
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
        <div className="interval-grid">
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
        </div>
      </section>

      {/* 4. Link Contacts to Switch (switch_contacts) */}
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

      {/* 5. Dynamic Compartmentalized Payloads (info_to_release) */}
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

                {/* Content Payload */}
                <div className="field-group">
                  <label className="field-label">Release Payload / Secrets</label>
                  <textarea
                    {...register(`info_rows.${idx}.content`, {
                      required: "Payload cannot be empty",
                    })}
                    placeholder="Encrypted data, private note, account credentials, or instructions..."
                    className="input-textarea"
                    rows={4}
                  />
                </div>

                {/* Routing Rules: Trust Clearance or Exception */}
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

                  {/* Isolated Target Selector: Only active if trust_required = -1 */}
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
          {submitting ? "Arming Switch..." : "Arm Dead Man's Switch"}
        </button>
      </div>
    </form>
  );
}