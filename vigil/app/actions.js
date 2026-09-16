"use server";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "./lib/supabase/server-client";

export async function createSwitch(payload) {
  const sp_client = await createSupabaseServerClient();
  const {
    data: { user },
  } = await sp_client.auth.getUser();

  const { data: newSwitch, error: error } = await sp_client
    .from("switches")
    .insert({
      usr_id: user.id,
      check_in_interval: payload.check_in_interval,
      actions: {
        call: "+92310900812",
        email: "myDearPerson@gmail.com",
        forwardData: true,
      },
      contacts: payload.contacts,
      name: payload.name,
    })
    .select("id")
    .single();

  if (error) {
    console.log("[Supabase Error] Failed Creating Switch Rows");
    return error;
  }

  const parsedContactsArray = payload.contacts.map((c) => {
    return {
      ...c,
      switch_id: newSwitch.id,
    };
  });

  const contactResp = await sp_client
    .from("switch_contacts")
    .insert(parsedContactsArray);
  if (contactResp.error) {
    console.log("[Supabase Error] Failed Creating Switch Contact Rows");
    return contactResp.error;
  }

  const parsedInfoArray = payload.info_to_release.map((r) => {
    return {
      switch_id: newSwitch.id,
      content: r.value,
      trust_required: r.minTrust,
      target_contact_id: r.exceptionContactID,
    };
  });

  const infoResp = await sp_client
    .from("info_to_release")
    .insert(parsedInfoArray);
  if (infoResp.error) {
    console.log(
      "[Supabase Error] Failed Release Info Rows. Response",
      infoResp,
    );
    return contactResp.error;
  }
}

export async function updateSwitch(swID, payload) {
  const sp_client = await createSupabaseServerClient();
  const {data: { user }} = await sp_client.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const { error: switchError } = await sp_client
    .from("switches")
    .update({
      name: payload.name,
      check_in_interval: payload.check_in_interval,
      contacts: payload.contacts,
    })
    .eq("id", swID)
    .eq("usr_id", user.id); // Guard to ensure user owns this switch

  if (switchError) {
    console.error("[Supabase Error] Updating Switch:", switchError);
    return switchError;
  }

  // 2. Refresh Switch Contacts (Delete old associations, insert updated ones)
  await sp_client.from("switch_contacts").delete().eq("switch_id", swID);

  if (payload.contacts?.length > 0) {
    const parsedContactsArray = payload.contacts.map((c) => ({
      switch_id: swID,
      contact_id: c.contact_id,
      priority_score: c.priority_score,
      trust_score: c.trust_score,
    }));

    const { error: contactsError } = await sp_client
      .from("switch_contacts")
      .insert(parsedContactsArray);

    if (contactsError) {
      console.error("[Supabase Error] Updating Contacts:", contactsError);
      return contactsError;
    }
  }


  await sp_client.from("info_to_release").delete().eq("switch_id", swID);
  if (payload.info_to_release?.length > 0) {
    const parsedInfoArray = payload.info_to_release.map((r) => ({
      switch_id: swID,
      content: r.value,
      trust_required: r.minTrust,
      target_contact_id: r.exceptionContactID || null,
    }));

    const { error: infoError } = await sp_client
      .from("info_to_release")
      .insert(parsedInfoArray);

    if (infoError) {
      console.error("[Supabase Error] Updating Info Rows:", infoError);
      return infoError;
    }
  }

  revalidatePath(`/switches/${swID}`);
  revalidatePath("/switches");
}

export async function removeSwitch(swId) {
  const sp_client = await createSupabaseServerClient();

  const response2 = await sp_client
    .from("switch_contacts")
    .delete()
    .eq("switch_id", swId);
  if (response2.error) {
    console.log(
      "[Failed] : Error deleteing Switch_contacts for switch id",
      swId,
      ". Response : ",
      response2,
    );
    return response2.error;
  }
  const response3 = await sp_client
    .from("info_to_release")
    .delete()
    .eq("switch_id", swId);
  if (response3.error) {
    console.log(
      "[Failed] : Error deleteing info rows for switch id",
      swId,
      ". Response : ",
      response3,
    );
    return response3.error;
  }

  const response1 = await sp_client.from("switches").delete().eq("id", swId);
  if (response1.error) {
    console.log("[Failed] : Error deleteing Switch. Response : ", response1);
    return response1.error;
  }
}

export async function removeContact(contactID) {
  const sp_client = await createSupabaseServerClient();
  const response = await sp_client
    .from("contacts")
    .delete()
    .eq("id", contactID);
  if (response.error) {
    console.log("[Failed] : Error deleteing contacts. Response : ", response);
    return response.error;
  }
}

export async function updateContact(contactID, name, email) {
  const sp_client = await createSupabaseServerClient();
  const response = await sp_client
    .from("contacts")
    .update({
      contact_name: name,
      email: email,
    })
    .eq("id", contactID);
  if (response.error) {
    console.log("[Failed] : Error Updating contacts. Response : ", response);
    return response.error;
  }
}

export async function createContact(name, email) {
  const sp_client = await createSupabaseServerClient();
  const {
    data: { user },
  } = await sp_client.auth.getUser();

  const outGoingData = {
    usr_id: user.id,
    email: email,
    contact_name: name,
  };

  const response = await sp_client.from("contacts").insert(outGoingData);
  if (response.error) {
    console.log("Error Creating Contact : ", response);
    return response.error;
  } else {
    revalidatePath("/contacts");
  }
}

export async function readTableData(tableName) {
  const sp_client = await createSupabaseServerClient();
  const { error, data } = await sp_client.from(tableName).select("*");
  if (error) {
    console.log("[Error] : ", error.message);
    throw new Error(error.message);
  }

  return { error: error, data: data };
}
