alter table users
  add column if not exists session_version integer not null default 1;

create index if not exists users_role_idx on users (role);
