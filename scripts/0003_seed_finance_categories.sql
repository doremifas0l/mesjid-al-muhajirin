insert into finance_categories (name)
values ('Keuangan Masjid'), ('Qurban')
on conflict (name) do nothing;
