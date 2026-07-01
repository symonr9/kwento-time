import { sql } from 'drizzle-orm';
import type { SQLiteColumn } from 'drizzle-orm/sqlite-core';

export function isUnsafeAvatarUri(value: string | null | undefined) {
  return !!value && (value.startsWith('data:image/') || value.length > 2048);
}

export function safeAvatarUri(column: SQLiteColumn) {
  return sql<string | null>`
    case
      when ${column} like 'data:image/%' then null
      when length(${column}) > 2048 then null
      else ${column}
    end
  `;
}
