-- ============================================================
-- MARKETPLACE SQL SCHEMA — Supabase SQL Editor-da tam işə salın
-- ============================================================

-- 1) Profiles (istifadəçi, satıcı statusu daxil)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  is_verified_seller boolean not null default false,
  is_admin boolean not null default false,
  wallet_balance numeric(12,2) not null default 0, -- manatla, cent deyil (2 onluq)
  locked_balance numeric(12,2) not null default 0,  -- escrow-da kilidli məbləğ (satıcının gözlədiyi)
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "Profiles publicly viewable" on public.profiles for select using (true);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- 2) Categories
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  sort_order int not null default 0
);
alter table public.categories enable row level security;
create policy "Categories publicly viewable" on public.categories for select using (true);

insert into public.categories (slug, name, sort_order) values
  ('oyun-hesablari', 'Oyun hesabları', 1),
  ('oyun-icalari', 'Oyun-daxili əşya və valyuta', 2),
  ('sosial-media', 'Sosial media xidmətləri', 3),
  ('gift-kartlar', 'Gift kartlar', 4)
on conflict (slug) do nothing;

-- 3) Listings (elanlar)
create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references public.categories(id),
  title text not null,
  description text,
  price numeric(12,2) not null check (price > 0),
  status text not null default 'active' check (status in ('active','sold','removed')),
  created_at timestamptz not null default now()
);
alter table public.listings enable row level security;
create policy "Listings publicly viewable" on public.listings for select using (true);
create policy "Sellers manage own listings" on public.listings for all using (auth.uid() = seller_id) with check (auth.uid() = seller_id);

-- 4) Orders (escrow əməliyyatları)
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id),
  buyer_id uuid not null references auth.users(id),
  seller_id uuid not null references auth.users(id),
  amount numeric(12,2) not null,
  status text not null default 'paid' check (
    status in ('paid','delivered','completed','disputed','refunded','cancelled')
  ),
  delivered_at timestamptz,
  auto_release_at timestamptz, -- delivered_at + N gün
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.orders enable row level security;
create policy "Order parties can view" on public.orders for select using (auth.uid() = buyer_id or auth.uid() = seller_id);

-- 5) Ledger (maliyyə jurnalı — hər balans dəyişikliyi)
create table if not exists public.ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  order_id uuid references public.orders(id),
  type text not null check (
    type in ('deposit','platform_fee','escrow_lock','escrow_release','refund','withdrawal')
  ),
  amount numeric(12,2) not null, -- müsbət = artım, mənfi = azalma
  note text,
  created_at timestamptz not null default now()
);
alter table public.ledger enable row level security;
create policy "Users view own ledger" on public.ledger for select using (auth.uid() = user_id);

-- 6) Deposits (PayPal və digər ödəniş qeydləri)
create table if not exists public.deposits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  provider text not null check (provider in ('paypal','kapital_bank')),
  provider_ref text not null, -- PayPal order id və s.
  gross_amount numeric(12,2) not null,  -- yatırılan cəmi məbləğ
  fee_amount numeric(12,2) not null,    -- 10% komissiya
  net_amount numeric(12,2) not null,    -- balansa əlavə olunan
  status text not null default 'pending' check (status in ('pending','completed','failed')),
  created_at timestamptz not null default now()
);
alter table public.deposits enable row level security;
create policy "Users view own deposits" on public.deposits for select using (auth.uid() = user_id);

-- 7) Withdrawals (çıxarış tələbləri)
create table if not exists public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  amount numeric(12,2) not null,
  destination text not null, -- IBAN / PayPal email və s. (istifadəçi yazır)
  status text not null default 'pending' check (status in ('pending','approved','rejected','paid')),
  admin_note text,
  created_at timestamptz not null default now()
);
alter table public.withdrawals enable row level security;
create policy "Users view own withdrawals" on public.withdrawals for select using (auth.uid() = user_id);
create policy "Users request own withdrawal" on public.withdrawals for insert with check (auth.uid() = user_id);

-- 8) Support tickets (mübahisə həlli)
create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id),
  opened_by uuid not null references auth.users(id),
  status text not null default 'open' check (status in ('open','resolved_buyer','resolved_seller','closed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
alter table public.tickets enable row level security;
create policy "Ticket parties + admin can view" on public.tickets for select using (
  auth.uid() = opened_by
  or exists (select 1 from public.orders o where o.id = order_id and (o.buyer_id = auth.uid() or o.seller_id = auth.uid()))
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
);
create policy "Order parties can open ticket" on public.tickets for insert with check (
  exists (select 1 from public.orders o where o.id = order_id and (o.buyer_id = auth.uid() or o.seller_id = auth.uid()))
);

-- 9) Ticket messages (admin ilə chat)
create table if not exists public.ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  sender_id uuid not null references auth.users(id),
  body text not null,
  created_at timestamptz not null default now()
);
alter table public.ticket_messages enable row level security;
create policy "Ticket participants can view messages" on public.ticket_messages for select using (
  exists (
    select 1 from public.tickets t
    left join public.orders o on o.id = t.order_id
    where t.id = ticket_id
      and (t.opened_by = auth.uid() or o.buyer_id = auth.uid() or o.seller_id = auth.uid()
           or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin))
  )
);
create policy "Ticket participants can send messages" on public.ticket_messages for insert with check (
  auth.uid() = sender_id
);

-- 10) Reviews
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) unique,
  reviewer_id uuid not null references auth.users(id),
  reviewee_id uuid not null references auth.users(id),
  rating int not null check (rating between 1 and 5),
  body text,
  created_at timestamptz not null default now()
);
alter table public.reviews enable row level security;
create policy "Reviews publicly viewable" on public.reviews for select using (true);

-- Faydalı indekslər
create index if not exists idx_listings_seller on public.listings(seller_id);
create index if not exists idx_listings_category on public.listings(category_id);
create index if not exists idx_orders_buyer on public.orders(buyer_id);
create index if not exists idx_orders_seller on public.orders(seller_id);
create index if not exists idx_ledger_user on public.ledger(user_id);

-- Listings: şəkil dəstəyi
alter table public.listings add column if not exists image_url text;


-- Telefon doğrulaması
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists phone_verified boolean not null default false;


-- Daha çox kateqoriya
insert into public.categories (slug, name, sort_order) values
  ('steam-hesablari', 'Steam hesabları', 5),
  ('valorant', 'Valorant hesabları', 6),
  ('pubg-mobile', 'PUBG Mobile', 7),
  ('roblox', 'Roblox', 8),
  ('fortnite', 'Fortnite', 9),
  ('cs2', 'CS2 hesab/skin', 10),
  ('lol', 'League of Legends', 11),
  ('instagram', 'Instagram xidmətləri', 12),
  ('tiktok', 'TikTok xidmətləri', 13),
  ('youtube', 'YouTube xidmətləri', 14),
  ('netflix-spotify', 'Netflix / Spotify', 15),
  ('cd-key', 'Oyun CD-Key', 16),
  ('diger', 'Digər', 99)
on conflict (slug) do nothing;

-- Elana sual-cavab (Soru & Cevap)
create table if not exists public.listing_questions (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  asker_id uuid not null references auth.users(id),
  question text not null check (char_length(question) between 1 and 500),
  answer text,
  answered_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.listing_questions enable row level security;
create policy "Questions publicly viewable" on public.listing_questions for select using (true);
create policy "Users can ask" on public.listing_questions for insert with check (auth.uid() = asker_id);

-- Birbaşa mesajlaşma (alıcı-satıcı)
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings(id) on delete set null,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (buyer_id, seller_id, listing_id)
);
alter table public.conversations enable row level security;
create policy "Participants can view conversation" on public.conversations
  for select using (auth.uid() = buyer_id or auth.uid() = seller_id);
create policy "Buyer can start conversation" on public.conversations
  for insert with check (auth.uid() = buyer_id);

create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  read boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.direct_messages enable row level security;
create policy "Participants can view messages" on public.direct_messages
  for select using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (auth.uid() = c.buyer_id or auth.uid() = c.seller_id)
    )
  );
create policy "Participants can send messages" on public.direct_messages
  for insert with check (
    auth.uid() = sender_id and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (auth.uid() = c.buyer_id or auth.uid() = c.seller_id)
    )
  );

create index if not exists idx_dm_conversation on public.direct_messages(conversation_id);
create index if not exists idx_conversations_buyer on public.conversations(buyer_id);
create index if not exists idx_conversations_seller on public.conversations(seller_id);

-- Admin genişlənməsi: ban, telefon kodu
alter table public.profiles add column if not exists is_banned boolean not null default false;
alter table public.profiles add column if not exists phone_verification_code text;

-- İstifadəçi bloklama imkanları
alter table public.profiles add column if not exists can_list boolean not null default true;
alter table public.profiles add column if not exists can_message boolean not null default true;

-- Elan report sistemi
create table if not exists public.listing_reports (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  reporter_id uuid not null references auth.users(id),
  reason text not null check (char_length(reason) between 1 and 500),
  status text not null default 'open' check (status in ('open','resolved')),
  created_at timestamptz not null default now()
);
alter table public.listing_reports enable row level security;
create policy "Users can report" on public.listing_reports for insert with check (auth.uid() = reporter_id);

-- Dəstək ticketlərinə kateqoriya və istinad
alter table public.tickets add column if not exists category text;
alter table public.tickets add column if not exists listing_id uuid references public.listings(id);
alter table public.tickets add column if not exists target_user_id uuid references auth.users(id);
