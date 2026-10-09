"use client";

import React, { useState, useMemo, useRef } from "react";
import { Plus, User, Search, Trash2, Mail, Users, X, Shield, Camera } from "lucide-react";
import { createContact, deleteContact } from "@/app/actions/contacts";
import "../css/contacts.css";

export default function ContactsClient({ initialContacts = [] }) {
  const [contacts, setContacts] = useState(initialContacts);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Modal form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [fileError, setFileError] = useState("");
  const fileInputRef = useRef(null);

  const filteredContacts = useMemo(() => {
    if (!search.trim()) return contacts;
    const q = search.toLowerCase();
    return contacts.filter(
      (c) =>
        c.contact_name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q)
    );
  }, [contacts, search]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    setFileError("");

    if (!file) {
      return;
    }

    const validExtensions = ["png", "jpg", "jpeg"];
    const fileExtension = file.name.split(".").pop()?.toLowerCase();
    const isValidType =
      validExtensions.includes(fileExtension) &&
      (file.type === "image/png" || file.type === "image/jpeg" || file.type === "image/jpg");

    if (!isValidType) {
      setFileError("Invalid format. Please select a PNG, JPG, or JPEG image.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Generate local preview URL
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleOpenModal = () => {
    setName("");
    setEmail("");
    setAvatarPreview(null);
    setFileError("");
    setErrorMsg("");
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setName("");
    setEmail("");
    setAvatarPreview(null);
    setFileError("");
  };

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
      // Prepend newly created contact to state
      setContacts([{ ...res.contact, switch_contacts: [] }, ...contacts]);
      handleCloseModal();
    }
    setLoading(false);
  };

  const handleDelete = async (id, contactName, boundSwitchesCount) => {
    if (boundSwitchesCount > 0) {
      const confirmWarning = confirm(
        `"${contactName}" is actively bound to ${boundSwitchesCount} switch(es). Deleting this contact will revoke their access. Proceed?`
      );
      if (!confirmWarning) return;
    } else {
      if (!confirm(`Remove contact "${contactName}"?`)) return;
    }

    const res = await deleteContact(id);
    if (res?.error) {
      setErrorMsg(res.error);
    } else {
      setContacts((prev) => prev.filter((c) => c.id !== id));
    }
  };

  return (
    <div className="contacts-page">
      {/* Page Header */}
      <header className="contacts-header">
        <h1 className="contacts-title">Contactbook</h1>
      </header>

      {errorMsg && !showModal && <div className="error-callout">{errorMsg}</div>}

      {/* Filter Toolbar */}
      <div className="contacts-toolbar">
        <div className="contacts-search-box">
          <Search size={15} className="text-white/40" />
          <input
            type="text"
            placeholder={`Search all ${contacts.length} contacts`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="contacts-search-input"
          />
        </div>
      </div>

      {/* Contacts Grid: The first card is ALWAYS the Add Contact card */}
      <div className="contacts-grid">
        {/* Card 1: Add Contact (Plus Card) */}
        <div
          className="e-card create-trigger-card"
          onClick={handleOpenModal}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") handleOpenModal();
          }}
          title="Register new contact"
        >
          <div className="create-trigger-content">
            <div className="plus-icon-circle">
              <Plus size={32} strokeWidth={2.2} />
            </div>
            <span className="create-trigger-title">Add Contact</span>
            <span className="create-trigger-sub">Register Recipient</span>
          </div>
        </div>

        {/* Existing Contacts Cards */}
        {filteredContacts.map((c) => {
          const switchCount = c.switch_contacts?.length || 0;
          const initialLetter = c.contact_name?.trim()?.charAt(0)?.toUpperCase() || "C";

          return (
            <div key={c.id} className="e-card contact-card">
              {/* Background Wave layers: Animation plays slowly only on hover */}
              <div className="card-wave-bg">
                <div className="wave" />
                <div className="wave" />
                <div className="wave" />
              </div>

              {/* Delete trigger */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(c.id, c.contact_name, switchCount);
                }}
                className="contact-card-delete"
                title={`Remove ${c.contact_name}`}
              >
                <Trash2 size={14} />
              </button>

              {/* Card Center Content */}
              <div className="infotop">
                {/* Profile Picture / Initial Placeholder */}
                <div className="contact-avatar-badge">
                  {initialLetter}
                </div>

                <h3 className="contact-card-name" title={c.contact_name}>
                  {c.contact_name}
                </h3>

                <p className="contact-card-email" title={c.email}>
                  {c.email}
                </p>

                <div className="contact-sentinels-pill">
                  <Shield size={10} className="text-[#00ddeb]" />
                  <span>{switchCount === 1 ? "1 Switch" : `${switchCount} Switches`}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Creation Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={handleCloseModal}>
          <div className="contact-modal-card" onClick={(e) => e.stopPropagation()}>
            {/* Same matching wave animated background as the contact card */}
            <div className="card-wave-bg">
              <div className="wave" />
              <div className="wave" />
              <div className="wave" />
            </div>
            <div className="modal-glass-layer" />

            <button
              type="button"
              className="modal-close-btn"
              onClick={handleCloseModal}
              title="Close modal"
            >
              <X size={16} />
            </button>

            <div className="modal-inner-content">
              <h2 className="modal-title">Register Recipient</h2>
              <p className="modal-subtitle">
                Add an escalation contact to receive fail-safe briefings and disclosures.
              </p>

              {errorMsg && <div className="error-callout">{errorMsg}</div>}

              <form onSubmit={handleAdd} className="modal-form">
                {/* Field 1: Profile Picture (Center circle with user icon) */}
                <div className="avatar-picker-wrapper">
                  <span className="avatar-picker-label">Profile Picture</span>

                  <label
                    htmlFor="contact-avatar-file"
                    className="avatar-circle-button"
                    title="Choose PNG, JPG, or JPEG image"
                  >
                    {avatarPreview ? (
                      <>
                        <img
                          src={avatarPreview}
                          alt="Avatar preview"
                          className="avatar-preview-image"
                        />
                        <div className="avatar-change-overlay">Change</div>
                      </>
                    ) : (
                      <>
                        <User size={30} className="avatar-user-icon" />
                        <span className="avatar-upload-subtext">Upload</span>
                      </>
                    )}

                    <input
                      ref={fileInputRef}
                      id="contact-avatar-file"
                      type="file"
                      accept=".png, .jpg, .jpeg, image/png, image/jpeg"
                      onChange={handleFileChange}
                      className="hidden-file-input"
                    />
                  </label>

                  {fileError && <div className="file-error-alert">{fileError}</div>}
                </div>

                {/* Field 2: Name */}
                <div className="form-field-group">
                  <label className="form-label">Name</label>
                  <input
                    type="text"
                    placeholder="Full Name (e.g. Sarah Connor)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="form-input"
                    required
                    autoFocus
                  />
                </div>

                {/* Field 3: Email */}
                <div className="form-field-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    placeholder="recipient@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>

                {/* Modal Action Buttons */}
                <div className="modal-actions">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="btn-modal-cancel"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-modal-submit"
                    disabled={loading}
                  >
                    {loading ? "Registering..." : "Add Contact"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}