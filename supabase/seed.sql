-- IZDOSH Academy — demo seed data
-- Reflects the course catalog from the business plan. "Uzum Market" and
-- "Marketplace Business" ship with full curricula (published); the other
-- five tracks are inserted as coming-soon (unpublished, no lessons yet),
-- matching the phased rollout in the business plan.

-- ============================================================
-- 1. Uzum Market (Base) — 1 month, 4 modules
-- ============================================================
with course as (
  insert into public.courses
    (slug, title_uz, title_ru, title_en, description_uz, description_ru, description_en,
     duration_months, price_start, price_standard, price_pro, is_published, order_index)
  values (
    'uzum-market',
    'Uzum Market', 'Uzum Market', 'Uzum Market',
    'Mustaqil ravishda Uzum Market do''konini ochish va boshqarish: mahsulot tanlash, listing, birinchi buyurtmalar, target reklama.',
    'Самостоятельное открытие и управление магазином на Uzum Market: выбор товара, листинг, первые заказы, таргетированная реклама.',
    'Independently launch and run an Uzum Market store: product selection, listing, first orders, targeted ads.',
    1, 3490000, 4890000, 6280000, true, 1
  )
  returning id
),
m1 as (
  insert into public.modules (course_id, title_uz, title_ru, title_en, order_index)
  select id, 'Kirish va Do''kon Ochish', 'Введение и открытие магазина', 'Getting Started & Store Setup', 1 from course
  returning id, course_id
),
m2 as (
  insert into public.modules (course_id, title_uz, title_ru, title_en, order_index)
  select id, 'Listing va Narx', 'Листинг и цена', 'Listing & Pricing', 2 from course
  returning id, course_id
),
m3 as (
  insert into public.modules (course_id, title_uz, title_ru, title_en, order_index)
  select id, 'Logistika va Birinchi Sotuv', 'Логистика и первая продажа', 'Logistics & First Sale', 3 from course
  returning id, course_id
),
m4 as (
  insert into public.modules (course_id, title_uz, title_ru, title_en, order_index)
  select id, 'Marketing va Analitika', 'Маркетинг и аналитика', 'Marketing & Analytics', 4 from course
  returning id, course_id
)
insert into public.lessons (course_id, module_id, title_uz, title_ru, title_en, video_url, order_index, is_free_preview)
select course_id, id, 'Marketplace va Uzum asoslari', 'Основы маркетплейсов и Uzum', 'Marketplace & Uzum basics', '', 0, true from m1
union all
select course_id, id, 'Do''kon ochish (hujjatlar, OKED, ro''yxatdan o''tish)', 'Открытие магазина (документы, регистрация)', 'Opening a store (documents, registration)', '', 1, false from m1
union all
select course_id, id, 'Birinchi listing (AI bilan)', 'Первый листинг (с AI)', 'First listing (with AI)', '', 2, false from m1
union all
select course_id, id, 'Mahsulot tanlash mezonlari', 'Критерии выбора товара', 'Product selection criteria', '', 3, false from m2
union all
select course_id, id, 'To''liq listing yaratish (SEO)', 'Создание полного листинга (SEO)', 'Building a full SEO listing', '', 4, false from m2
union all
select course_id, id, 'Narx strategiyasi', 'Ценовая стратегия', 'Pricing strategy', '', 5, false from m2
union all
select course_id, id, 'Buyurtma qabul qilish', 'Приём заказов', 'Accepting orders', '', 6, false from m3
union all
select course_id, id, 'Qadoqlash va yetkazish', 'Упаковка и доставка', 'Packaging & delivery', '', 7, false from m3
union all
select course_id, id, 'Birinchi mijoz muloqoti', 'Общение с первым клиентом', 'First customer interaction', '', 8, false from m3
union all
select course_id, id, 'Ichki reklama', 'Внутренняя реклама', 'In-app advertising', '', 9, false from m4
union all
select course_id, id, 'Sharh va reyting boshqaruvi', 'Управление отзывами и рейтингом', 'Review & rating management', '', 10, false from m4
union all
select course_id, id, 'Oddiy KPI kuzatish', 'Отслеживание базовых KPI', 'Basic KPI tracking', '', 11, false from m4;

-- ============================================================
-- 2. Marketplace Business (All-in-One, flagship) — 2 months, 8 modules
-- ============================================================
with course as (
  insert into public.courses
    (slug, title_uz, title_ru, title_en, description_uz, description_ru, description_en,
     duration_months, price_start, price_standard, price_pro, is_published, order_index)
  values (
    'marketplace-business',
    'Marketplace Business', 'Marketplace Business', 'Marketplace Business',
    'Bir nechta marketplace (Uzum, Wildberries, Yandex)da to''liq biznes tizimini qurish va boshqarish: sourcing, narxlash, logistika, AI bilan ishlash, masshtablash.',
    'Построение и управление полноценным бизнесом на нескольких маркетплейсах (Uzum, Wildberries, Yandex): закупки, ценообразование, логистика, работа с AI, масштабирование.',
    'Build and run a full business across multiple marketplaces (Uzum, Wildberries, Yandex): sourcing, pricing, logistics, working with AI, and scaling.',
    2, 7990000, 11190000, 14380000, true, 2
  )
  returning id
),
m1 as (insert into public.modules (course_id, title_uz, title_ru, title_en, order_index) select id, 'Bozorga Kirish', 'Выход на рынок', 'Market Entry', 1 from course returning id, course_id),
m2 as (insert into public.modules (course_id, title_uz, title_ru, title_en, order_index) select id, 'Mahsulot va Sourcing', 'Товар и закупки', 'Product & Sourcing', 2 from course returning id, course_id),
m3 as (insert into public.modules (course_id, title_uz, title_ru, title_en, order_index) select id, 'Logistika va Operatsion', 'Логистика и операционка', 'Logistics & Operations', 3 from course returning id, course_id),
m4 as (insert into public.modules (course_id, title_uz, title_ru, title_en, order_index) select id, 'Marketing va Sotuv', 'Маркетинг и продажи', 'Marketing & Sales', 4 from course returning id, course_id),
m5 as (insert into public.modules (course_id, title_uz, title_ru, title_en, order_index) select id, 'Analitika va Masshtablash', 'Аналитика и масштабирование', 'Analytics & Scaling', 5 from course returning id, course_id),
m6 as (insert into public.modules (course_id, title_uz, title_ru, title_en, order_index) select id, 'AI Bilan Ishlash', 'Работа с AI', 'Working with AI', 6 from course returning id, course_id),
m7 as (insert into public.modules (course_id, title_uz, title_ru, title_en, order_index) select id, 'Advanced Sotuv', 'Продвинутые продажи', 'Advanced Selling', 7 from course returning id, course_id),
m8 as (insert into public.modules (course_id, title_uz, title_ru, title_en, order_index) select id, 'Yakuniy Loyiha', 'Итоговый проект', 'Final Project', 8 from course returning id, course_id)
insert into public.lessons (course_id, module_id, title_uz, title_ru, title_en, video_url, order_index, is_free_preview)
select course_id, id, 'Marketplace nima?', 'Что такое маркетплейс?', 'What is a marketplace?', '', 0, true from m1
union all select course_id, id, 'Uzum Market ekotizimi', 'Экосистема Uzum Market', 'The Uzum Market ecosystem', '', 1, false from m1
union all select course_id, id, 'O''z do''konini ochish', 'Открытие своего магазина', 'Opening your own store', '', 2, false from m1
union all select course_id, id, 'Birinchi listing (AI bilan)', 'Первый листинг (с AI)', 'First listing (with AI)', '', 3, false from m1
union all select course_id, id, 'Mahsulot tanlash kriteriyalari', 'Критерии выбора товара', 'Product selection criteria', '', 4, false from m2
union all select course_id, id, 'Raqobat tahlili', 'Анализ конкурентов', 'Competitor analysis', '', 5, false from m2
union all select course_id, id, 'Narx strategiyasi', 'Ценовая стратегия', 'Pricing strategy', '', 6, false from m2
union all select course_id, id, 'Yetkazib beruvchi bilan muzokara', 'Переговоры с поставщиком', 'Negotiating with suppliers', '', 7, false from m2
union all select course_id, id, 'Uzum FBS vs FBO', 'Uzum FBS против FBO', 'Uzum FBS vs FBO', '', 8, false from m3
union all select course_id, id, 'Buyurtma qabul qilish va qadoqlash', 'Приём заказов и упаковка', 'Order handling & packaging', '', 9, false from m3
union all select course_id, id, 'Qaytarishlar bilan ishlash', 'Работа с возвратами', 'Handling returns', '', 10, false from m3
union all select course_id, id, 'Bojxona va soliq asoslari', 'Основы таможни и налогов', 'Customs & tax basics', '', 11, false from m3
union all select course_id, id, 'Uzum ichki reklama tizimi', 'Внутренняя реклама Uzum', 'Uzum in-app advertising', '', 12, false from m4
union all select course_id, id, 'Tashqi trafik (Instagram/Telegram)', 'Внешний трафик (Instagram/Telegram)', 'External traffic (Instagram/Telegram)', '', 13, false from m4
union all select course_id, id, 'Mijoz bilan ishlash', 'Работа с клиентами', 'Customer communication', '', 14, false from m4
union all select course_id, id, 'AI bilan kontent yaratish', 'Создание контента с AI', 'Creating content with AI', '', 15, false from m4
union all select course_id, id, 'Asosiy KPI', 'Основные KPI', 'Core KPIs', '', 16, false from m5
union all select course_id, id, 'Excel/Sheets dashboard', 'Дашборд в Excel/Sheets', 'Excel/Sheets dashboard', '', 17, false from m5
union all select course_id, id, 'Portfelni optimallashtirish', 'Оптимизация портфеля товаров', 'Portfolio optimization', '', 18, false from m5
union all select course_id, id, 'Ikkinchi marketplace''ga chiqish', 'Выход на второй маркетплейс', 'Expanding to a second marketplace', '', 19, false from m5
union all select course_id, id, 'AI mahsulot tavsifini yozish', 'Написание описания товара с AI', 'Writing product descriptions with AI', '', 20, false from m6
union all select course_id, id, 'AI bilan rasm yaxshilash', 'Улучшение фото с AI', 'Enhancing images with AI', '', 21, false from m6
union all select course_id, id, 'AI bilan mijoz javoblarini avtomatlashtirish', 'Автоматизация ответов клиентам с AI', 'Automating customer replies with AI', '', 22, false from m6
union all select course_id, id, 'AI agentlari tushunchasi', 'Понятие AI-агентов', 'Understanding AI agents', '', 23, false from m6
union all select course_id, id, 'Bundle va aksiya strategiyasi', 'Стратегия бандлов и акций', 'Bundle & promotion strategy', '', 24, false from m7
union all select course_id, id, 'Cross-sell va upsell', 'Кросс-продажи и апселл', 'Cross-sell & upsell', '', 25, false from m7
union all select course_id, id, 'Shikoyat va yomon sharh boshqaruvi', 'Управление жалобами и негативом', 'Handling complaints & bad reviews', '', 26, false from m7
union all select course_id, id, 'Oylik 10M+ aylanma strategiyasi', 'Стратегия оборота 10М+/мес', 'Strategy for 10M+/mo turnover', '', 27, false from m7
union all select course_id, id, 'To''liq biznes yig''indisi — yakuniy loyiha', 'Итоговый проект', 'Final capstone project', '', 28, false from m8;

-- ============================================================
-- 3-7. Remaining tracks — catalog placeholders (curriculum in progress)
-- ============================================================
insert into public.courses
  (slug, title_uz, title_ru, title_en, description_uz, description_ru, description_en,
   duration_months, price_start, price_standard, price_pro, is_published, order_index)
values
  ('china-sourcing', 'China Sourcing', 'China Sourcing', 'China Sourcing',
   'Xitoydan mustaqil mahsulot topish, yetkazib beruvchi bilan muzokara, zakaz berish, logistika/bojxona asoslari.',
   'Самостоятельный поиск товара в Китае, переговоры с поставщиком, оформление заказа, основы логистики и таможни.',
   'Independently sourcing products from China, supplier negotiation, ordering, logistics and customs basics.',
   1, 1990000, 2790000, 3580000, false, 3),
  ('landing-page', 'Landing Page', 'Landing Page', 'Landing Page',
   'AI vositalari yordamida professional landing page''ni noldan yaratish va internetga jonli chiqarish.',
   'Создание профессионального лендинга с нуля с помощью AI и его публикация в интернете.',
   'Building a professional landing page from scratch with AI and deploying it live.',
   1, 2000000, 2800000, 3600000, false, 4),
  ('telegram-bot', 'Telegram Bot', 'Telegram Bot', 'Telegram Bot',
   'Biznes ehtiyoji uchun to''liq ishlaydigan Telegram bot yaratish va ishga tushirish.',
   'Создание и запуск полноценного Telegram-бота под бизнес-задачи.',
   'Building and launching a fully working Telegram bot for a business need.',
   1, 2000000, 2800000, 3600000, false, 5),
  ('vibecoding', 'VibeCoding', 'VibeCoding', 'VibeCoding',
   'AI yordamida real digital mahsulot yaratish: website, web app, bot, API, ma''lumotlar bazasi, deployment.',
   'Создание реального цифрового продукта с помощью AI: сайт, веб-приложение, бот, API, база данных, деплой.',
   'Building a real digital product with AI: website, web app, bot, API, database, deployment.',
   2, 4290000, 6010000, 7720000, false, 6),
  ('startup-mvp', 'Startup MVP', 'Startup MVP', 'Startup MVP',
   'O''z startup g''oyasini to''liq ishlaydigan, deploy qilingan MVP darajasiga olib chiqish.',
   'Доведение идеи стартапа до полноценного, задеплоенного MVP.',
   'Taking your startup idea to a fully working, deployed MVP.',
   3, 4990000, 6990000, 8980000, false, 7);
