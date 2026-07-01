export function buildDeviceContactName({
  familyName,
  fullName,
  givenName,
}: {
  familyName?: string | null;
  fullName?: string | null;
  givenName?: string | null;
}) {
  return (
    fullName?.trim() ||
    [givenName, familyName]
      .map((part) => part?.trim())
      .filter(Boolean)
      .join(' ')
      .trim()
  );
}
