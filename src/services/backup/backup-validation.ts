export type BackupTables = {
  appSettings: unknown[];
  conversations: unknown[];
  followUpExpiry: unknown[];
  followUps: unknown[];
  icebreakers: unknown[];
  itemTags: unknown[];
  myLifeItemExpiry: unknown[];
  myLifeItems: unknown[];
  people: unknown[];
  personPlaces: unknown[];
  personTags: unknown[];
  places: unknown[];
  reminders: unknown[];
  tags: unknown[];
  topicExpiry: unknown[];
  topics: unknown[];
};

export type ParsedBackup = {
  exportedAt: string;
  tables: BackupTables;
  version: 1;
};

export type BackupPreview = {
  exportedAt: string;
  tableCounts: Record<keyof BackupTables, number>;
  totalRows: number;
  version: number;
  warnings: string[];
};

const requiredTableNames = [
  'appSettings',
  'conversations',
  'followUpExpiry',
  'followUps',
  'myLifeItemExpiry',
  'myLifeItems',
  'people',
  'personPlaces',
  'personTags',
  'places',
  'reminders',
  'tags',
  'topicExpiry',
  'topics',
] as const satisfies readonly (keyof BackupTables)[];

const optionalTableNames = [
  'icebreakers',
  'itemTags',
] as const satisfies readonly (keyof BackupTables)[];

const tableNames = [...requiredTableNames, ...optionalTableNames] as const;

function assertRecord(value: unknown, message: string): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object') {
    throw new Error(message);
  }
}

function assertRows(value: unknown, tableName: string) {
  if (!Array.isArray(value)) {
    throw new Error(`Backup table "${tableName}" is missing or is not an array.`);
  }

  return value;
}

export function parseBackupJson(json: string): ParsedBackup {
  let parsed: unknown;

  try {
    parsed = JSON.parse(json);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Backup JSON is invalid: ${message}`);
  }

  assertRecord(parsed, 'Backup JSON must be an object.');

  if (parsed.version !== 1) {
    throw new Error('Unsupported backup version. This app can import version 1 backups.');
  }

  if (typeof parsed.exportedAt !== 'string' || Number.isNaN(Date.parse(parsed.exportedAt))) {
    throw new Error('Backup JSON is missing a valid exportedAt timestamp.');
  }

  assertRecord(parsed.tables, 'Backup JSON is missing its tables object.');

  const tables = parsed.tables;
  const normalizedTables: Partial<BackupTables> = {};

  for (const tableName of requiredTableNames) {
    normalizedTables[tableName] = assertRows(tables[tableName], tableName);
  }

  for (const tableName of optionalTableNames) {
    normalizedTables[tableName] = tables[tableName] === undefined ? [] : assertRows(tables[tableName], tableName);
  }

  return {
    exportedAt: parsed.exportedAt,
    tables: normalizedTables as BackupTables,
    version: 1,
  };
}

export function previewBackupJson(json: string): BackupPreview {
  const backup = parseBackupJson(json);
  const tableCounts = Object.fromEntries(
    tableNames.map((tableName) => [tableName, backup.tables[tableName].length]),
  ) as Record<keyof BackupTables, number>;
  const totalRows = Object.values(tableCounts).reduce((count, tableCount) => count + tableCount, 0);
  const warnings = [
    'Rows with IDs or unique keys already on this device will be skipped.',
    'Import adds missing rows. It does not delete existing data.',
  ];

  if (totalRows === 0) {
    warnings.push('This backup has no rows to import.');
  }

  return {
    exportedAt: backup.exportedAt,
    tableCounts,
    totalRows,
    version: backup.version,
    warnings,
  };
}
