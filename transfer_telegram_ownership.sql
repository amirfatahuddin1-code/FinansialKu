DO $$
DECLARE
    source_email TEXT := 'amirfatahuddin1@gmail.com';
    target_email TEXT := 'artsipco@gmail.com';
    source_id UUID;
    target_id UUID;
    link_count INT;
    tx_count INT;
BEGIN
    -- Get User IDs
    SELECT id INTO source_id FROM auth.users WHERE email = source_email;
    SELECT id INTO target_id FROM auth.users WHERE email = target_email;

    -- Validation
    IF source_id IS NULL THEN
        RAISE EXCEPTION 'Source user % not found', source_email;
    END IF;

    IF target_id IS NULL THEN
        RAISE EXCEPTION 'Target user % not found', target_email;
    END IF;

    -- 1. Transfer Telegram Link
    GET DIAGNOSTICS link_count = ROW_COUNT;
    UPDATE telegram_user_links
    SET user_id = target_id
    WHERE user_id = source_id;
    GET DIAGNOSTICS link_count = ROW_COUNT;

    -- 2. Transfer Telegram Transactions
    UPDATE transactions
    SET user_id = target_id
    WHERE user_id = source_id AND source = 'telegram';
    GET DIAGNOSTICS tx_count = ROW_COUNT;

    RAISE NOTICE 'SUCCESS: Transferred Telegram link and % transactions from % to %', tx_count, source_email, target_email;
    
END $$;
