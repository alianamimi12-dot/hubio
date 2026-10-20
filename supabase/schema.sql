-- =====================================================================
-- Hubio v3 - skema database Supabase (jalankan sekali di SQL Editor)
-- Model pembayaran: pembeli membayar LANGSUNG ke rekening/QRIS penjual.
-- Penjual mengonfirmasi dana masuk, lalu produk dikirim otomatis ke email pembeli.
-- =====================================================================
create extension if not exists pgcrypto;

create table public.settings (
  id int primary key default 1 check (id = 1),
  pro_price int not null default 49000,
  free_product_limit int not null default 5
);
insert into public.settings default values on conflict do nothing;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  role text not null default 'seller' check (role in ('seller','admin')),
  plan text not null default 'free' check (plan in ('free','pro')),
  plan_expires_at timestamptz,
  suspended boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.stores (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  username text not null,
  name text not null,
  bio text not null default '',
  color text not null default '#2B9BE6',
  socials jsonb not null default '{}'::jsonb,
  links jsonb not null default '[]'::jsonb,
  -- {banks:[{id,bank,account,holder}], qris:"https://...", note:""}
  -- TIDAK ikut tampilan publik; hanya dikirim ke pembeli yang sudah membuat pesanan.
  payment jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint username_format check (username ~ '^[a-z0-9_.]{3,30}$'),
  constraint username_reserved check (username not in ('dashboard','admin','login','register','api','pesanan','checkout','_next','favicon.ico','logo.png'))
);
create unique index stores_username_key on public.stores (lower(username));

create table public.products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  type text not null default 'Lainnya',
  description text not null default '',
  html_code text not null default '',
  cover_url text,
  landing_url text,
  display text not null default 'large' check (display in ('small','large','tiny')),
  price int not null check (price >= 1000),
  discount_price int check (discount_price is null or (discount_price >= 1000 and discount_price < price)),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index on public.products (seller_id);

-- Isi produk yang dikirim ke pembeli (dipisah supaya tidak terbaca publik)
create table public.product_files (
  product_id uuid primary key references public.products(id) on delete cascade,
  kind text not null check (kind in ('link','pdf')),
  value text not null              -- kind=link: URL https; kind=pdf: path di bucket 'product-files'
);

create table public.orders (
  id text primary key default ('LK-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8))),
  seller_id uuid not null references public.profiles(id),
  product_id uuid references public.products(id) on delete restrict,
  product_name text not null,
  buyer_name text not null,
  buyer_email text not null,
  buyer_phone text,
  amount int not null check (amount > 0),          -- harga produk saat dibeli
  unique_code int not null default 0 check (unique_code between 0 and 999),
  total int generated always as (amount + unique_code) stored,   -- nominal yang harus ditransfer pembeli
  status text not null default 'pending' check (status in ('pending','paid','cancelled')),
  access_token uuid not null default gen_random_uuid(),
  buyer_paid_at timestamptz,                       -- pembeli menekan "Saya sudah bayar"
  paid_at timestamptz,                             -- penjual mengonfirmasi dana masuk
  delivered_at timestamptz,                        -- email produk terkirim
  created_at timestamptz not null default now()
);
create index on public.orders (seller_id, created_at);
-- Jaminan: tidak ada dua pesanan MENUNGGU milik penjual yang sama dengan total transfer yang sama.
-- Jadi setiap pembeli yang belum bayar punya nominal unik, dan mutasi bank mudah dicocokkan.
create unique index orders_pending_total_key on public.orders (seller_id, total) where status = 'pending';

create table public.visits (
  id bigint generated always as identity primary key,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  source text not null default 'Langsung',
  created_at timestamptz not null default now()
);
create index on public.visits (seller_id, created_at);

-- Pembayaran paket Pro ke Hubio (opsional, lewat Xendit)
create table public.pro_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  external_id text not null unique,
  invoice_id text,
  amount int not null,
  status text not null default 'pending' check (status in ('pending','paid')),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

-- ---------- Fungsi bantu ----------
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin' and not suspended)
$$;

create or replace function public.effective_plan(p public.profiles) returns text
language sql stable as $$
  select case when p.plan = 'pro' and (p.plan_expires_at is null or p.plan_expires_at > now()) then 'pro' else 'free' end
$$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_name text := coalesce(nullif(trim(new.raw_user_meta_data->>'name'), ''), split_part(new.email, '@', 1));
  v_user text := lower(coalesce(new.raw_user_meta_data->>'username', ''));
begin
  insert into public.profiles (id, name, email) values (new.id, v_name, new.email);
  insert into public.stores (user_id, username, name) values (new.id, v_user, v_name);
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.username_available(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select p ~ '^[a-z0-9_.]{3,30}$'
     and p not in ('dashboard','admin','login','register','api','pesanan','checkout','_next','favicon.ico','logo.png')
     and not exists (select 1 from public.stores where lower(username) = lower(p))
$$;

-- Batas jumlah produk untuk paket Free
create or replace function public.enforce_product_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_prof public.profiles; v_lim int; v_count int;
begin
  select * into v_prof from public.profiles where id = new.seller_id;
  if public.effective_plan(v_prof) = 'pro' then return new; end if;
  select free_product_limit into v_lim from public.settings where id = 1;
  select count(*) into v_count from public.products where seller_id = new.seller_id;
  if v_count >= v_lim then raise exception 'Paket Free dibatasi % produk. Upgrade ke Pro untuk menambah produk.', v_lim; end if;
  return new;
end $$;
create trigger products_limit before insert on public.products for each row execute function public.enforce_product_limit();

-- ---------- Tampilan publik (hanya kolom yang aman) ----------
create or replace view public.public_stores as
  select s.user_id, s.username, s.name, s.bio, s.color, s.socials, s.links,
         public.effective_plan(p) = 'pro' as is_pro
  from public.stores s join public.profiles p on p.id = s.user_id
  where not p.suspended;

create or replace view public.public_products as
  select pr.id, pr.seller_id, pr.name, pr.type, pr.description, pr.html_code, pr.cover_url, pr.landing_url,
         pr.display, pr.price, pr.discount_price
  from public.products pr join public.profiles p on p.id = pr.seller_id
  where pr.active and not p.suspended;

grant select on public.public_stores, public.public_products to anon, authenticated;

-- ---------- Row Level Security ----------
alter table public.settings      enable row level security;
alter table public.profiles      enable row level security;
alter table public.stores        enable row level security;
alter table public.products      enable row level security;
alter table public.product_files enable row level security;
alter table public.orders        enable row level security;
alter table public.visits        enable row level security;
alter table public.pro_payments  enable row level security;

create policy settings_read   on public.settings for select using (true);
create policy settings_admin  on public.settings for update using (public.is_admin()) with check (public.is_admin());
create policy profiles_read   on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy stores_read     on public.stores for select using (user_id = auth.uid() or public.is_admin());
create policy stores_update   on public.stores for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy products_read   on public.products for select using (seller_id = auth.uid() or public.is_admin());
create policy products_insert on public.products for insert with check (seller_id = auth.uid());
create policy products_update on public.products for update using (seller_id = auth.uid()) with check (seller_id = auth.uid());
create policy products_delete on public.products for delete using (seller_id = auth.uid());
create policy pfiles_all on public.product_files for all
  using (exists (select 1 from public.products p where p.id = product_id and p.seller_id = auth.uid()))
  with check (exists (select 1 from public.products p where p.id = product_id and p.seller_id = auth.uid()));
create policy orders_read  on public.orders for select using (seller_id = auth.uid() or public.is_admin());
create policy visits_read  on public.visits for select using (seller_id = auth.uid() or public.is_admin());
create policy propay_read  on public.pro_payments for select using (user_id = auth.uid() or public.is_admin());
-- Order dibuat dan diubah HANYA oleh server (service role) lewat API route.

-- ---------- Fungsi ----------
create or replace function public.record_visit(p_seller uuid, p_product uuid, p_source text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.stores where user_id = p_seller) then return; end if;
  if p_product is not null and not exists (select 1 from public.products where id = p_product and seller_id = p_seller) then p_product := null; end if;
  insert into public.visits (seller_id, product_id, source)
  values (p_seller, p_product, left(coalesce(nullif(trim(p_source), ''), 'Langsung'), 30));
end $$;

create or replace function public.admin_set_plan(p_user uuid, p_plan text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Hanya admin.'; end if;
  if p_plan not in ('free', 'pro') then raise exception 'Paket tidak valid.'; end if;
  update public.profiles set plan = p_plan, plan_expires_at = null where id = p_user;
end $$;

create or replace function public.admin_set_suspended(p_user uuid, p_value boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Hanya admin.'; end if;
  if p_user = auth.uid() then raise exception 'Tidak bisa menonaktifkan akun sendiri.'; end if;
  update public.profiles set suspended = p_value where id = p_user;
end $$;

create or replace function public.activate_pro(p_external text, p_invoice text, p_amount int) returns boolean
language plpgsql security definer set search_path = public as $$
declare pp public.pro_payments; pr public.profiles;
begin
  select * into pp from public.pro_payments where external_id = p_external for update;
  if not found then return false; end if;
  if pp.status = 'paid' then return true; end if;
  if pp.amount <> p_amount then raise exception 'Nominal pembayaran tidak cocok.'; end if;
  update public.pro_payments set status = 'paid', paid_at = now(), invoice_id = coalesce(p_invoice, invoice_id) where id = pp.id;
  select * into pr from public.profiles where id = pp.user_id for update;
  if not (pr.plan = 'pro' and pr.plan_expires_at is null) then
    update public.profiles set plan = 'pro',
      plan_expires_at = greatest(coalesce(pr.plan_expires_at, now()), now()) + interval '30 days'
    where id = pr.id;
  end if;
  return true;
end $$;

revoke execute on function public.record_visit(uuid, uuid, text)     from public;
revoke execute on function public.admin_set_plan(uuid, text)         from public;
revoke execute on function public.admin_set_suspended(uuid, boolean) from public;
revoke execute on function public.activate_pro(text, text, int)      from public;
revoke execute on function public.username_available(text)           from public;
grant execute on function public.record_visit(uuid, uuid, text)      to anon, authenticated;
grant execute on function public.username_available(text)            to anon, authenticated;
grant execute on function public.admin_set_plan(uuid, text)          to authenticated;
grant execute on function public.admin_set_suspended(uuid, boolean)  to authenticated;
grant execute on function public.activate_pro(text, text, int)       to service_role;

-- ---------- Penyimpanan ----------
-- 1) Foto cover, foto landing page, gambar QRIS: PUBLIK (hanya gambar, maks 5 MB, tanpa SVG)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-media', 'product-media', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif'];

-- 2) File produk PDF: PRIVAT (maks 50 MB). Hanya server yang membuat tautan unduh untuk pembeli yang sudah dikonfirmasi.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-files', 'product-files', false, 52428800, array['application/pdf'])
on conflict (id) do update set public = false, file_size_limit = 52428800, allowed_mime_types = array['application/pdf'];

create policy "media: unggah folder sendiri" on storage.objects for insert to authenticated
  with check (bucket_id = 'product-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "media: hapus folder sendiri" on storage.objects for delete to authenticated
  using (bucket_id = 'product-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "files: unggah folder sendiri" on storage.objects for insert to authenticated
  with check (bucket_id = 'product-files' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "files: baca folder sendiri" on storage.objects for select to authenticated
  using (bucket_id = 'product-files' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "files: hapus folder sendiri" on storage.objects for delete to authenticated
  using (bucket_id = 'product-files' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- Menjadikan seseorang admin platform (jalankan manual, ganti emailnya) ----------
-- update public.profiles set role = 'admin' where email = 'emailkamu@contoh.com';
