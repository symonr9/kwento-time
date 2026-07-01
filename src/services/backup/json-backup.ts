import { exportBackup, importBackup, type BackupImportResult, type KwentoBackup } from '@/db/queries/backup';
import { parseBackupJson, previewBackupJson, type BackupPreview } from './backup-validation';

export { previewBackupJson, type BackupPreview };

export async function generateBackupJson() {
  const backup = await exportBackup();
  return JSON.stringify(backup, null, 2);
}

export async function importBackupJson(json: string): Promise<BackupImportResult> {
  return importBackup(parseBackupJson(json) as KwentoBackup);
}
