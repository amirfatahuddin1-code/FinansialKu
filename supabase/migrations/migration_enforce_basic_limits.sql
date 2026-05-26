-- Add columns to profiles table if they do not exist
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS telegram_quota INTEGER NOT NULL DEFAULT 20,
ADD COLUMN IF NOT EXISTS whatsapp_quota INTEGER NOT NULL DEFAULT 20,
ADD COLUMN IF NOT EXISTS last_telegram_reset TEXT,
ADD COLUMN IF NOT EXISTS last_whatsapp_reset TEXT;

-- Enforce limits on WhatsApp and Telegram transactions at the database level for Basic plan
CREATE OR REPLACE FUNCTION public.check_transaction_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plan_id text;
  v_count integer;
  v_today date;
  v_today_str text;
  v_telegram_quota integer;
  v_whatsapp_quota integer;
  v_last_telegram_reset text;
  v_last_whatsapp_reset text;
BEGIN
  -- We only enforce limits on telegram and whatsapp sources
  IF NEW.source IS NULL OR (NEW.source NOT LIKE 'telegram%' AND NEW.source NOT LIKE 'whatsapp%') THEN
    RETURN NEW;
  END IF;

  -- Get active subscription plan
  SELECT plan_id INTO v_plan_id
  FROM public.subscriptions
  WHERE user_id = NEW.user_id AND status = 'active'
  LIMIT 1;

  -- Default to 'basic' if no active subscription found
  IF v_plan_id IS NULL THEN
    v_plan_id := 'basic';
  END IF;

  -- If it's a basic plan, enforce limits
  IF v_plan_id = 'basic' THEN
    -- Use the transaction date (or today's date if not specified)
    v_today := COALESCE(NEW.date, CURRENT_DATE);
    v_today_str := to_char(v_today, 'YYYY-MM-DD');

    -- Get quotas and last resets from profile
    SELECT telegram_quota, whatsapp_quota, last_telegram_reset, last_whatsapp_reset
    INTO v_telegram_quota, v_whatsapp_quota, v_last_telegram_reset, v_last_whatsapp_reset
    FROM public.profiles
    WHERE id = NEW.user_id;

    -- Set default quotas if not set
    IF v_telegram_quota IS NULL THEN v_telegram_quota := 20; END IF;
    IF v_whatsapp_quota IS NULL THEN v_whatsapp_quota := 20; END IF;

    -- Dynamic Reset for Telegram
    IF NEW.source LIKE 'telegram%' THEN
      IF v_last_telegram_reset IS NULL OR v_last_telegram_reset != v_today_str THEN
        v_telegram_quota := 20;
        UPDATE public.profiles
        SET telegram_quota = 20, last_telegram_reset = v_today_str
        WHERE id = NEW.user_id;
      END IF;

      -- Count telegram transactions for today
      SELECT COUNT(*) INTO v_count
      FROM public.transactions
      WHERE user_id = NEW.user_id 
        AND date = v_today 
        AND source LIKE 'telegram%';

      IF v_count >= v_telegram_quota THEN
        RAISE EXCEPTION 'Batas harian transaksi Telegram tercapai (maksimal % untuk hari ini).', v_telegram_quota;
      END IF;

    -- Dynamic Reset for WhatsApp
    ELSIF NEW.source LIKE 'whatsapp%' THEN
      IF v_last_whatsapp_reset IS NULL OR v_last_whatsapp_reset != v_today_str THEN
        v_whatsapp_quota := 20;
        UPDATE public.profiles
        SET whatsapp_quota = 20, last_whatsapp_reset = v_today_str
        WHERE id = NEW.user_id;
      END IF;

      -- Count whatsapp transactions for today
      SELECT COUNT(*) INTO v_count
      FROM public.transactions
      WHERE user_id = NEW.user_id 
        AND date = v_today 
        AND source LIKE 'whatsapp%';

      IF v_count >= v_whatsapp_quota THEN
        RAISE EXCEPTION 'Batas harian transaksi WhatsApp tercapai (maksimal % untuk hari ini).', v_whatsapp_quota;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_transaction_limits ON public.transactions;
CREATE TRIGGER trg_check_transaction_limits
  BEFORE INSERT ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.check_transaction_limits();
