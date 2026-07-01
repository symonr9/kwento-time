# src/services/contacts - Device contacts integration

Contacts are native, permissioned, and platform-sensitive. Keep the Expo SDK wrapper thin and the data shaping pure.

## Rules

- `device-contacts.ts` is the only file that imports `expo-contacts` or opens the OS contacts UI.
- `contact-normalization.ts` is pure and Node-testable. Put name/photo/note/contact-id mapping there.
- Imported people must store a stable contact identifier when available so duplicate names can still open the correct OS contact.
- Always request/check permissions before reading contacts. Handle denied, limited, unavailable, and missing-photo cases without blocking manual person creation.
- Do not store phone numbers, emails, or extra contact fields unless the product explicitly asks for them.
