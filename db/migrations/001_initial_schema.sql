create table if not exists users (
  username text primary key,
  pin_hash text not null,
  salt text not null,
  sport text not null default 'AFL',
  avatar text not null,
  color text not null,
  email text not null default '',
  role text null,
  created_at timestamptz not null default now()
);

create table if not exists bets (
  bet_id bigint generated always as identity primary key,
  username text not null references users(username) on delete cascade,
  sort_order integer not null,
  external_id text not null default '',
  match_name text not null default '',
  team_name text not null default '',
  sport text not null default 'Other',
  stake numeric(12,2) not null default 0,
  odds numeric(12,4) not null default 1,
  result text not null default 'pending',
  bet_date text not null,
  label text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists bets_username_sort_idx on bets (username, sort_order desc);
create index if not exists bets_username_result_idx on bets (username, result);

create table if not exists tipping_rounds (
  round_key text primary key,
  sport text null,
  lockout_at timestamptz null,
  fixtures jsonb not null default '[]'::jsonb,
  results jsonb not null default '{}'::jsonb,
  is_active boolean not null default false,
  updated_at timestamptz not null default now()
);

create unique index if not exists tipping_rounds_single_active_idx
  on tipping_rounds (is_active)
  where is_active = true;

create table if not exists tipping_submissions (
  round_key text not null references tipping_rounds(round_key) on delete cascade,
  username text not null references users(username) on delete cascade,
  tips jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (round_key, username)
);

create index if not exists tipping_submissions_username_idx on tipping_submissions (username, round_key);

create table if not exists comps (
  code text primary key,
  name text not null,
  sport text not null default 'all',
  creator_username text not null references users(username) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists comp_memberships (
  comp_code text not null references comps(code) on delete cascade,
  username text not null references users(username) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (comp_code, username)
);

create index if not exists comp_memberships_username_idx on comp_memberships (username, comp_code);

create table if not exists ai_cache (
  event_id text primary key,
  payload jsonb not null,
  cached_at timestamptz not null,
  expires_at timestamptz not null
);

create index if not exists ai_cache_expires_idx on ai_cache (expires_at);

create table if not exists odds_cache (
  sport_key text primary key,
  payload jsonb not null,
  cached_at timestamptz not null,
  expires_at timestamptz not null
);

create index if not exists odds_cache_expires_idx on odds_cache (expires_at);
