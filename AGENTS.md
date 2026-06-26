# Codex / Agent Instructions

This repo's detailed engineering instructions live in [CLAUDE.md](CLAUDE.md).
Codex should treat `CLAUDE.md` as project guidance, even though it was
originally written for Claude.

Before making changes:

1. Read this file.
2. Read the root [CLAUDE.md](CLAUDE.md).
3. Read any nested `CLAUDE.md` file in the directory you are editing, such as
   `src/db/CLAUDE.md` for database work or `src/app/CLAUDE.md` for routes.

If `CLAUDE.md` and these agent instructions appear to conflict, follow the more
specific instruction for the files being edited. User instructions still take
priority for the current task.

## Expo HAS CHANGED

This project uses Expo SDK 56. Read the exact versioned docs at
https://docs.expo.dev/versions/v56.0.0/ before writing Expo or React Native code.
Do not rely on remembered API shapes.
