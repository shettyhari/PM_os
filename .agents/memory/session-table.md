---
name: Session table bootstrap
description: connect-pg-simple createTableIfMissing silently fails; must pre-create user_sessions table manually.
---

## Rule
Never rely on `createTableIfMissing: true` in connect-pg-simple. Always pre-create the `user_sessions` table with raw SQL before deploying or after a schema wipe.

**Why:** The `createTableIfMissing` flag silently swallows errors when it can't create the table (e.g. race condition on first request, permission issues). Sessions appear to be set but are never persisted — `/auth/me` returns 401 even after a successful login response.

**How to apply:**
Run this SQL once (safe to repeat with IF NOT EXISTS):
```sql
CREATE TABLE IF NOT EXISTS user_sessions (
  sid varchar NOT NULL COLLATE "default",
  sess json NOT NULL,
  expire timestamp(6) NOT NULL,
  CONSTRAINT session_pkey PRIMARY KEY (sid) NOT DEFERRABLE INITIALLY IMMEDIATE
);
CREATE INDEX IF NOT EXISTS idx_session_expire ON user_sessions (expire);
```
This is separate from Drizzle migrations — manage it outside the schema push flow.
