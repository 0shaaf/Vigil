// In this file are the Helper functions which will be used inside the React components. 
export function buildSwitchPayload(formData, infoRows) {
  const selectedContacts = formData.contactsIncluded.map((id) => ({
    contact_id: parseInt(id, 10),
    priority_score: formData.contactMetrics?.[id]?.priority ?? 1,
    trust_score: formData.contactMetrics?.[id]?.trust ?? 1,
  }));

  return {
    name: formData.name,
    contacts: selectedContacts,
    check_in_interval: {
      months: formData.months,
      days: formData.days,
      hours: formData.hours,
    },
    info_to_release: infoRows,
  };
}