"use client";
import React, { useCallback, useEffect, useState } from "react";
import "../switches.css";
import { useForm } from "react-hook-form";
import { createSwitch, readTableData } from "@/app/actions";

function ContactSelectorModal({ contacts, onSelectContact, onClose }) {
  return (
    <div className="contact-selection-modal">
      <div className="overlay" onClick={onClose}></div>
      <div className="modal-selection-list">
        {contacts.map((c) => (
          <div key={c.id} onClick={() => onSelectContact(c)}>
            Contact : {c.contact_name}
          </div>
        ))}
      </div>
    </div>
  );
}

function AddInfo({ contacts, infoRows, setInfoRows }) {
  const [activeRowModalIndex, setActiveRowModalIndex] = useState(null);

  const { register } = useForm();

  const handleRowUpdate = useCallback((updateType, val, ind) => {
    setInfoRows((prev) =>
      prev.map((r, i) => {
        if (i === ind) {
          if (updateType === "info") return { ...r, value: val };
          if (updateType === "minTrust") {
            return { ...r, minTrust: val, exceptionContactID: null };
          }
          if (updateType === "exceptionContactID")
            return { ...r, exceptionContactID: val };
        }
        return r;
      })
    );
  }, [setInfoRows]);

  const handleContactSelect = (contact) => {
    if (activeRowModalIndex !== null) {
      handleRowUpdate("exceptionContactID", contact.id, activeRowModalIndex);
      setActiveRowModalIndex(null);
    }
  };

  return (
    <div className="add-info">
      <fieldset>
        {infoRows.map((row, ind) => {
          const selectedContact = contacts.find(
            (c) => c.id === row.exceptionContactID
          );

          return (
            <div key={ind} className="info-row">
              <input
                className="info-content"
                defaultValue={row.value}
                {...register(`InfoRows.${ind}.value`, {
                  onChange: (e) => handleRowUpdate("info", e.target.value, ind),
                })}
              />

              <div className="priority-selector">
                <label>
                  Minimum Trust Required
                  <br />
                </label>

                <label>
                  <input
                    type="radio"
                    value="75"
                    {...register(`InfoRows.${ind}.minTrust`, {
                      onChange: (e) =>
                        handleRowUpdate("minTrust", e.target.value, ind),
                    })}
                  />
                  High
                </label>

                <label>
                  <input
                    type="radio"
                    value="50"
                    {...register(`InfoRows.${ind}.minTrust`, {
                      onChange: (e) =>
                        handleRowUpdate("minTrust", e.target.value, ind),
                    })}
                  />
                  Medium
                </label>

                <label>
                  <input
                    type="radio"
                    value="25"
                    {...register(`InfoRows.${ind}.minTrust`, {
                      onChange: (e) =>
                        handleRowUpdate("minTrust", e.target.value, ind),
                    })}
                  />
                  Low
                </label>

                <label>
                  <input
                    type="radio"
                    value="-1"
                    onClick={() => setActiveRowModalIndex(ind)}
                    {...register(`InfoRows.${ind}.minTrust`, {
                      onChange: (e) =>
                        handleRowUpdate("minTrust", e.target.value, ind),
                    })}
                  />
                  Exception
                </label>

                {row.exceptionContactID && selectedContact && (
                  <div className="exception-contact">
                    Exception For:{" "}
                    <strong>{selectedContact.contact_name}</strong>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        <button
          type="button"
          onClick={() =>
            setInfoRows((prev) => [
              ...prev,
              { value: "", minTrust: 0, exceptionContactID: null },
            ])
          }
        >
          Add Info
        </button>
      </fieldset>

      {activeRowModalIndex !== null && (
        <ContactSelectorModal
          contacts={contacts}
          onSelectContact={handleContactSelect}
          onClose={() => setActiveRowModalIndex(null)}
        />
      )}
    </div>
  );
}

export default function Create() {
  const {
    handleSubmit,
    register,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: "My Switch",
      months: 0,
      days: 0,
      hours: 1,
      contactsIncluded: [],
      contactMetrics: {},
    },
  });

  const [contactsData, setContactsData] = useState(null);
  const [infoRows, setInfoRows] = useState([
    { value: "Hello", minTrust: 0, exceptionContactID: null },
  ]);

  useEffect(() => {
    const getData = async () => {
      const { error, data } = await readTableData("contacts");
      if (error) {
        console.log("[ERR] Could Not Read Contacts in Switch Creation Menu");
      } else {
        setContactsData(data);
      }
    };

    getData();
  }, []);

  const onFormSubmit = async (data) => {
    const selectedContacts = data.contactsIncluded.map((id) => ({
      contact_id: parseInt(id, 10),
      priority_score: data.contactMetrics?.[id]?.priority ?? 1,
      trust_score: data.contactMetrics?.[id]?.trust ?? 1,
    }));

    const payload = {
      name: data.name,
      contacts: selectedContacts,
      check_in_interval: {
        months: data.months,
        days: data.days,
        hours: data.hours,
      },
      info_to_release: infoRows,
    };
    console.log("Polished : ", payload);

    const error = await createSwitch(payload);
    if (error) console.log("Failed Switch Creation : ", error);
  };

  return (
    <section className="contact-creation-menu">
      <form onSubmit={handleSubmit(onFormSubmit)} className="contact-form">
        <div className="input-group">
          <label>Switch Name</label>
          <input
            {...register("name", {
              required: "Each Switch must have a unique name",
            })}
          />
          {errors.name && (
            <span className="error-message">{errors.name.message}</span>
          )}
        </div>

        <div className="input-group">
          <label>Check-In Interval</label>
          <div className="check-in-input-container">
            <div className="check-in-metrics">
              <label>Months</label>
              <input
                type="number"
                {...register("months", {
                  valueAsNumber: true,
                  required: "Months is required",
                  min: { value: 0, message: "Cannot be negative" },
                  max: { value: 12, message: "Cannot exceed 12 months" },
                })}
              />
              {errors.months && (
                <span className="error-message">{errors.months.message}</span>
              )}
            </div>

            <div className="check-in-metrics">
              <label>Days</label>
              <input
                type="number"
                {...register("days", {
                  valueAsNumber: true,
                  required: "Days is required",
                  min: { value: 0, message: "Cannot be negative" },
                  max: { value: 31, message: "Cannot exceed 31 days" },
                })}
              />
              {errors.days && (
                <span className="error-message">{errors.days.message}</span>
              )}
            </div>

            <div className="check-in-metrics">
              <label>Hours</label>
              <input
                type="number"
                {...register("hours", {
                  valueAsNumber: true,
                  required: "Hours is required",
                  min: { value: 0, message: "Cannot be negative" },
                  max: { value: 24, message: "Cannot exceed 24 hours" },
                })}
              />
              {errors.hours && (
                <span className="error-message">{errors.hours.message}</span>
              )}
            </div>
          </div>
        </div>

        <div>
          <fieldset className="contacts-selection-list">
            <legend>Contacts</legend>
            {errors.contactsIncluded && (
              <p className="error-message">{errors.contactsIncluded.message}</p>
            )}

            {contactsData &&
              contactsData.map((c) => (
                <div key={c.id} className="contact-row">
                  <label>
                    <input
                      className="contact-checkbox"
                      type="checkbox"
                      value={c.id}
                      {...register("contactsIncluded", {
                        required: "Select at least one contact.",
                      })}
                    />
                    {c.contact_name}
                  </label>

                  <div className="contact-metrics">
                    <label>Priority</label>
                    <input
                      type="number"
                      defaultValue={1}
                      {...register(`contactMetrics.${c.id}.priority`, {
                        required: "Priority is required",
                        valueAsNumber: true,
                        min: { value: 1, message: "Min value is 1" },
                      })}
                    />
                    {errors.contactMetrics?.[c.id]?.priority && (
                      <span className="error-message">
                        {errors.contactMetrics[c.id].priority.message}
                      </span>
                    )}
                  </div>

                  <div className="contact-metrics">
                    <label>Trust</label>
                    <input
                      type="number"
                      defaultValue={1}
                      {...register(`contactMetrics.${c.id}.trust`, {
                        required: "Trust is required",
                        valueAsNumber: true,
                        min: { value: 1, message: "Min value is 1" },
                      })}
                    />
                    {errors.contactMetrics?.[c.id]?.trust && (
                      <span className="error-message">
                        {errors.contactMetrics[c.id].trust.message}
                      </span>
                    )}
                  </div>
                </div>
              ))}
          </fieldset>
        </div>

        {contactsData && (
          <AddInfo
            contacts={contactsData}
            infoRows={infoRows}
            setInfoRows={setInfoRows}
          />
        )}

        <input type="submit" className="submit-btn" value="Create" />
      </form>
    </section>
  );
}