"use client";

import React, { useState } from "react";
import { createContact, deleteContact } from "@/app/actions/contacts";
import "../css/contacts.css";

export default function ContactsClient({ initialContacts = [] }) {
  const [contacts, setContacts] = useState(initialContacts);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    setLoading(true);
    setErrorMsg("");

    const res = await createContact({
      contact_name: name,
      email: email,
    });

    if (res?.error) {
      setErrorMsg(res.error);
    } else if (res?.contact) {
      setContacts([{ ...res.contact, switch_contacts: [] }, ...contacts]);
      setName("");
      setEmail("");
    }
    setLoading(false);
  };

  const handleDelete = async (id, name, boundSwitchesCount) => {
    if (boundSwitchesCount > 0) {
      const confirmWarning = confirm(
        `"${name}" is actively bound to ${boundSwitchesCount} switch(es). Deleting this contact will remove their clearance and reset any targeted exceptions to NULL. Proceed?`
      );
      if (!confirmWarning) return;
    } else {
      if (!confirm(`Delete contact "${name}"?`)) return;
    }

    const res = await deleteContact(id);
    if (res?.error) {
      setErrorMsg(res.error);
    } else {
      setContacts(contacts.filter((c) => c.id !== id));
    }
  };

  return (
    <>
    <div className="contacts-page">
      <header className="contacts-header">
        <div>
          <h1 className="contacts-title">Trusted Contacts</h1>
          <p className="contacts-subtitle">
            Base pool of authorized recipients for fail-safe trigger escalation.
          </p>
        </div>
      </header>

      {errorMsg && <div className="error-callout">{errorMsg}</div>}

      {/* Quick Add Interface */}
      <section className="contact-create-card">
        <span className="create-card-title">Register Recipient</span>
        <form onSubmit={handleAdd} className="contact-quick-form">
          <input
            type="text"
            placeholder="Full Name / Moniker"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-contact"
            required
          />
          <input
            type="email"
            placeholder="recipient@domain.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-contact"
            required
          />
          <button type="submit" disabled={loading} className="btn-add-contact">
            {loading ? "Adding..." : "+ Add Contact"}
          </button>
        </form>
      </section>

      {/* Recipient Roster */}
      <div className="contacts-table-wrapper">
        {contacts.length === 0 ? (
          <div className="contacts-empty">
            No recipients registered yet. Add one above to begin assigning clearances.
          </div>
        ) : (
          <table className="contacts-table">
            <thead>
              <tr>
                <th>Identity</th>
                <th>Channel / Email</th>
                <th>Assigned Switches</th>
                <th style={{ width: "48px", textAlign: "right" }}></th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => {
                const switchCount = c.switch_contacts?.length || 0;
                return (
                  <tr key={c.id}>
                    <td className="contact-cell-name">{c.contact_name}</td>
                    <td className="contact-cell-email">{c.email}</td>
                    <td>
                      <span className="contact-switches-pill">
                        {switchCount === 1 ? "1 Switch" : `${switchCount} Switches`}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        onClick={() => handleDelete(c.id, c.contact_name, switchCount)}
                        className="btn-delete-contact"
                        title="Delete contact"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
    </>
  );
}