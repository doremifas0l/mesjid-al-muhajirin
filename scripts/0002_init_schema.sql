-- Homepage content (singleton by id = 'default')
create table if not exists homepage_content (
  id text primary key default 'default',
  site_title text,
  hero_tag text,
  announcement text,
  about_title text,
  about_body text,
  about_bullets jsonb default '[]'::jsonb,
  events_title text,
  events_subtitle text,
  youtube_title text,
  youtube_subtitle text,
  featured_video_url text,
  updated_at timestamptz not null default now()
);

-- Homepage images (slideshow)
create table if not exists homepage_images (
  id uuid primary key default gen_random_uuid(),
  path text not null,          -- storage path in bucket
  url text not null,           -- public URL
  position int not null default 0,
  created_at timestamptz not null default now()
);

-- Events (Kegiatan)
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  starts_at timestamptz not null,  -- combined date & time
  location text,
  description text,
  image_url text,
  image_path text,
  created_at timestamptz not null default now()
);

-- Notes (Knowledge)
create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  created_at timestamptz not null default now()
);

-- Finance categories
create table if not exists finance_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

-- Finance transactions
create table if not exists finance_transactions (
  id uuid primary key default gen_random_uuid(),
  occured_at timestamptz not null,
  amount numeric(14,2) not null,
  type text not null check (type in ('income','expense')),
  category_id uuid references finance_categories(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);
