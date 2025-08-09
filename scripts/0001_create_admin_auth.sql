-- Create a single-row table to store the admin password hash
create table if not exists admin_auth (
  id integer primary key default 1,
  password_hash text not null,
  updated_at timestamptz not null default now()
);

-- Optional: enforce single row by ensuring a default id=1
-- You can still update/replace the row with upserts.
