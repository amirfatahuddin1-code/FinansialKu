-- Check last 10 transactions
select id, description, amount, date, created_at, category_id
from transactions
order by created_at desc
limit 10;
