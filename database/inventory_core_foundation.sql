-- CHADWMS canonical inventory journal foundation (not yet wired to stock updates).
-- Private schema: no direct client Data API exposure.
create schema if not exists inventory_core;
revoke all on schema inventory_core from public, anon, authenticated;

create table if not exists inventory_core.stock_events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  branch_code text not null check (length(trim(branch_code)) between 1 and 32),
  item_number text not null check (length(trim(item_number)) between 1 and 100),
  event_type text not null check (event_type in (
    'RECEIPT','PUTAWAY','BIN_MOVE','PULLDOWN','PICK','SHIPMENT',
    'TRANSFER_DISPATCH','TRANSFER_RECEIPT','ADJUSTMENT','REVERSAL'
  )),
  quantity numeric(18,4) not null check (quantity > 0),
  source_location text,
  destination_location text,
  document_type text,
  document_reference text,
  actor_id uuid not null references auth.users(id),
  reason text,
  reversal_of uuid unique references inventory_core.stock_events(id),
  occurred_at timestamptz not null default now(),
  recorded_at timestamptz not null default now(),
  constraint stock_event_location_check check (
    source_location is not null or destination_location is not null
  ),
  constraint stock_event_distinct_locations check (
    source_location is null or destination_location is null
    or source_location <> destination_location
  ),
  constraint stock_event_reversal_check check (
    (event_type = 'REVERSAL' and reversal_of is not null)
    or (event_type <> 'REVERSAL' and reversal_of is null)
  )
);
create index if not exists stock_events_branch_time_idx
  on inventory_core.stock_events(branch_code, recorded_at desc);
create index if not exists stock_events_item_time_idx
  on inventory_core.stock_events(branch_code, item_number, recorded_at desc);
create index if not exists stock_events_document_idx
  on inventory_core.stock_events(document_type, document_reference);
create index if not exists stock_events_actor_idx
  on inventory_core.stock_events(actor_id, recorded_at desc);

-- Defense in depth: the journal is inaccessible to anon/authenticated by default.
alter table inventory_core.stock_events enable row level security;
revoke all on inventory_core.stock_events from public, anon, authenticated;

-- Journal rows must never be silently modified or deleted.
create or replace function inventory_core.reject_stock_event_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'Inventory journal events are immutable; post a reversal event instead';
end;
$$;
drop trigger if exists stock_events_immutable on inventory_core.stock_events;
create trigger stock_events_immutable
before update or delete on inventory_core.stock_events
for each row execute function inventory_core.reject_stock_event_mutation();

comment on table inventory_core.stock_events is
'Append-only inventory event foundation. No posting API or balance mutations are enabled until atomic posting, branch authorization, reversal validation, and reconciliation are tested.';
