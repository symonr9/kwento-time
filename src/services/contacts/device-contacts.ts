import {
  Contact,
  ContactField,
  ContactsSortOrder,
  getPermissionsAsync,
  requestPermissionsAsync,
} from 'expo-contacts';

import { buildDeviceContactName } from './contact-normalization';

export type DeviceContactPerson = {
  avatarUri?: string | null;
  name: string;
  nativeContactId: string;
  notes?: string | null;
};

const contactListFields = [
  ContactField.FULL_NAME,
  ContactField.GIVEN_NAME,
  ContactField.FAMILY_NAME,
  ContactField.THUMBNAIL,
] as const;

type ContactListDetails = Awaited<ReturnType<typeof Contact.getAllDetails<typeof contactListFields>>>[number];

function toDeviceContactPerson(details: ContactListDetails): DeviceContactPerson | null {
  const name = buildDeviceContactName(details);

  if (!name) {
    return null;
  }

  return {
    avatarUri: details.thumbnail ?? null,
    name,
    nativeContactId: details.id,
  };
}

async function ensureContactsPermission() {
  const current = await getPermissionsAsync();

  if (current.granted) {
    return true;
  }

  const requested = await requestPermissionsAsync();
  return requested.granted;
}

async function safelyReadContactNotes(contact: Contact) {
  try {
    return await contact.getNote();
  } catch {
    return null;
  }
}

async function toDeviceContactPersonFromContact(contact: Contact): Promise<DeviceContactPerson | null> {
  const [fullName, givenName, familyName, image, thumbnail, notes] = await Promise.all([
    contact.getFullName().catch(() => null),
    contact.getGivenName().catch(() => null),
    contact.getFamilyName().catch(() => null),
    contact.getImage().catch(() => null),
    contact.getThumbnail().catch(() => null),
    safelyReadContactNotes(contact),
  ]);
  const name = buildDeviceContactName({ familyName, fullName, givenName });

  if (!name) {
    return null;
  }

  return {
    avatarUri: image ?? thumbnail,
    name,
    nativeContactId: contact.id,
    notes,
  };
}

export async function pickDeviceContactPerson() {
  const hasPermission = await ensureContactsPermission();

  if (!hasPermission) {
    throw new Error('Contacts permission is required to import or bind a contact.');
  }

  const contact = await Contact.presentPicker();

  if (!contact) {
    return null;
  }

  return toDeviceContactPersonFromContact(contact);
}

export async function getDeviceContactPeople() {
  const hasPermission = await ensureContactsPermission();

  if (!hasPermission) {
    throw new Error('Contacts permission is required to import contacts.');
  }

  const contacts = await Contact.getAllDetails(contactListFields, {
    sortOrder: ContactsSortOrder.GivenName,
  });

  return contacts
    .map(toDeviceContactPerson)
    .filter((contact): contact is DeviceContactPerson => contact !== null);
}

export async function openDeviceContact(nativeContactId: string, name: string) {
  const hasPermission = await ensureContactsPermission();

  if (!hasPermission) {
    throw new Error('Contacts permission is required to open this contact.');
  }

  const contact = new Contact(nativeContactId);
  return contact.editWithForm({
    allowsActions: true,
    allowsEditing: true,
    alternateName: name,
    message: 'Bound to Kwento Time',
  });
}
