-- ============================================================================
-- Clasd — Migration 5
-- Atomic counter increment functions used by the queue + webhook handlers.
-- ============================================================================

create or replace function clasd_increment_campaign_delivered(p_campaign_id uuid)
returns void
language sql
as $$
  update campaigns
  set delivered_count = delivered_count + 1
  where id = p_campaign_id;
$$;

create or replace function clasd_increment_campaign_opened(p_campaign_id uuid)
returns void
language sql
as $$
  update campaigns
  set opened_count = opened_count + 1
  where id = p_campaign_id;
$$;

create or replace function clasd_increment_campaign_clicked(p_campaign_id uuid)
returns void
language sql
as $$
  update campaigns
  set clicked_count = clicked_count + 1
  where id = p_campaign_id;
$$;

create or replace function clasd_increment_campaign_bounced(p_campaign_id uuid)
returns void
language sql
as $$
  update campaigns
  set bounced_count = bounced_count + 1
  where id = p_campaign_id;
$$;

grant execute on function clasd_increment_campaign_delivered(uuid) to authenticated, service_role;
grant execute on function clasd_increment_campaign_opened(uuid) to authenticated, service_role;
grant execute on function clasd_increment_campaign_clicked(uuid) to authenticated, service_role;
grant execute on function clasd_increment_campaign_bounced(uuid) to authenticated, service_role;
