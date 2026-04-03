
CREATE OR REPLACE FUNCTION public.increment_campaign_sent(campaign_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE email_campaigns
  SET sent_count = COALESCE(sent_count, 0) + 1
  WHERE id = campaign_id_param;
END;
$$;
