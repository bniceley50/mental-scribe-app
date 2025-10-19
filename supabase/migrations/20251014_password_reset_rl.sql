create table if not exists password_reset_attempts (
  user_id uuid not null,
  at timestamptz not null default now(),
  ok boolean not null
);

create index if not exists idx_password_reset_attempts_user_time
  on password_reset_attempts(user_id, at desc);

create or replace function check_password_reset_rate_limit(
  _user_id uuid, _max_requests int, _window_minutes int
) returns boolean
language sql stable as 271
  select count(*) < _max_requests
  from password_reset_attempts
  where user_id = _user_id
    and at >= now() - (_window_minutes || ' minutes')::interval;
271;
