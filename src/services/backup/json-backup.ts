import { exportBackup, importBackup, type BackupImportResult, type KwentoBackup } from '@/db/queries/backup';

function isBackup(value: unknown): value is KwentoBackup {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as { tables?: unknown; version?: unknown };
  return candidate.version === 1 && !!candidate.tables && typeof candidate.tables === 'object';
}

export async function generateBackupJson() {
  const backup = await exportBackup();
  return JSON.stringify(backup, null, 2);
}

export async function importBackupJson(json: string): Promise<BackupImportResult> {
  const parsed: unknown = JSON.parse(json);

  if (!isBackup(parsed)) {
    throw new Error('Backup JSON is not a Kwento Time backup.');
  }

  return importBackup(parsed);
}
