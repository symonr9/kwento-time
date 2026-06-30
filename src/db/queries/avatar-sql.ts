import { sql } from 'drizzle-orm';
import type { SQLiteColumn } from 'drizzle-orm/sqlite-core';

export function safeAvatarUri(column: SQLiteColumn) {
  return sql<string | null>`
    case
      when ${column} like 'data:image/%' then null
      when length(${column}) > 2048 then null
      else ${column}
    end
  `;
}
