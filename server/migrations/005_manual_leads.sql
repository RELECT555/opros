-- Manual lead records (demo stand / CRM), admin-only via API

create table if not exists manual_leads (
  id             bigserial primary key,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  full_name      text        not null default '',
  email          text        not null default '',
  organization   text        not null default '',
  phone          text        not null default '',
  comment        text,

  status         text        not null default 'new'
                 check (status in ('new', 'called', 'in_progress', 'closed')),
  manager_note   text
);

create index if not exists idx_manual_leads_created_at
  on manual_leads (created_at desc);

create or replace function manual_leads_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists tr_manual_leads_updated on manual_leads;
create trigger tr_manual_leads_updated
  before update on manual_leads
  for each row execute procedure manual_leads_set_updated_at();
