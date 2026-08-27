# IZDOSH Academy

O'zbekistondagi amaliy raqamli ko'nikmalar akademiyasi — marketplace savdosi va AI yordamida
mahsulot yaratish bo'yicha kurslar platformasi.

Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui-style komponentlar + next-intl
(UZ/RU/EN) + Supabase (Postgres + Auth) + Click/Payme to'lov integratsiyasi asosida qurilgan.

## Stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4
- **UI:** shadcn/ui uslubidagi komponentlar (Radix primitives), lucide-react
- **i18n:** next-intl — `uz` (default), `ru`, `en`
- **Backend:** Supabase — Postgres, Auth, Row Level Security
- **To'lov:** Click va Payme (checkout + webhook)
- **Video:** react-player — video havolasi (YouTube/Vimeo) orqali, saytda ichki pleer

## Ishga tushirish

```bash
npm install
cp .env.example .env.local   # Supabase va to'lov kalitlarini kiriting
npm run dev
```

## Ma'lumotlar bazasi

1. Yangi Supabase loyihasi yarating.
2. SQL Editor'da `supabase/schema.sql` ni ishga tushiring — jadvallar, RLS siyosatlari va
   `auth.users` uchun profil yaratish trigger'ini o'rnatadi.
3. Ixtiyoriy: `supabase/seed.sql` — namunaviy kurs katalogini (7 yo'nalish, 2 tasi to'liq
   dastur bilan) yuklaydi.
4. **Authentication → Sign In / Providers** bo'limida **Phone** provider'ni yoqing (email
   emas — ro'yxatdan o'tish faqat telefon raqam + parol orqali). SMS orqali tasdiqlashni
   talab qilmaslik uchun **Authentication → Sign In / Providers → Phone → Enable phone
   confirmations**'ni o'chirib qo'ying (aks holda har bir ro'yxatdan o'tishda SMS OTP
   provayderi — Twilio, Eskiz.uz va h.k. — sozlangan bo'lishi kerak bo'ladi).

## Railway'ga chiqarish

Railway Next.js loyihasini Nixpacks orqali avtomatik aniqlaydi — alohida Dockerfile yoki
`railway.json` shart emas, faqat quyidagilarni sozlang:

1. **Yangi loyiha yarating** → GitHub repo'ni ulang (bu repo, `main` branch).
2. **Environment Variables** bo'limida quyidagilarni kiriting (`.env.example`dagi ro'yxat
   bilan bir xil, lekin haqiqiy qiymatlar bilan):
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
     — Supabase loyihangizning **Settings → API** bo'limidan.
   - `NEXT_PUBLIC_SITE_URL` — Railway sizga bergan domen (`https://xxx.up.railway.app`) yoki
     ulangan maxsus domen (`https://izdosh.uz`). **Muhim**: bu qiymat noto'g'ri bo'lsa,
     Click/Payme to'lovdan keyin foydalanuvchini noto'g'ri manzilga qaytaradi.
   - `CLICK_SERVICE_ID`, `CLICK_MERCHANT_ID`, `CLICK_SECRET_KEY`, `PAYME_MERCHANT_ID`,
     `PAYME_SECRET_KEY` — to'lov provayderlari ulanganda.
3. Railway `npm install` → `npm run build` → `npm run start`ni avtomatik ishga tushiradi.
   `next start` `$PORT` muhit o'zgaruvchisini o'zi o'qiydi (Railway buni avtomatik beradi),
   qo'shimcha sozlash shart emas.
4. Birinchi deploy'dan so'ng, Click/Payme kabinetlarida webhook manzillarini yangilang:
   `https://<domeningiz>/api/payments/click/webhook` va `.../payme/webhook`.
5. Node versiyasi `package.json`dagi `engines.node` (`>=20.9.0`) orqali belgilangan —
   Railway buni Nixpacks build'da avtomatik hurmat qiladi.

Deploy'dan keyin tekshirish uchun: `/uz` sahifasi ochilishi, `/uz/register`da telefon +
parol bilan ro'yxatdan o'tish ishlashi (Supabase'da Phone provider yoqilgan bo'lishi shart —
yuqoridagi "Ma'lumotlar bazasi" bo'limiga qarang), va admin akkaunt uchun Supabase SQL
Editor'da `update public.profiles set role = 'admin' where phone = '<sizning raqamingiz>';`
buyrug'ini bajaring (birinchi admin hech qanday UI orqali tayinlanmaydi — bu ataylab shunday,
xavfsizlik uchun).

## Papka strukturasi

```
app/[locale]/            — 3 tilli sahifalar (App Router)
  page.tsx                — Landing
  courses/                — Kurslar katalogi va kurs sahifasi
  courses/[slug]/lessons/[lessonId]/ — Dars sahifasi (video + test + progress)
  pricing/                 — Narxlar (alohida kurs / obuna)
  (auth)/login, register/  — Autentifikatsiya
  dashboard/                — Foydalanuvchi kabineti
app/api/payments/          — Click/Payme checkout va webhook route'lari
app/api/lessons/complete/  — Darsni yakunlash + progress yozish
lib/lms/access.ts          — getLessonAccess, isLessonLocked, completeLesson
lib/payments/               — Click/Payme integratsiya logikasi
lib/supabase/                — Supabase client/server/middleware
i18n/                        — next-intl routing va konfiguratsiya
messages/{uz,ru,en}.json    — Barcha UI matnlari
supabase/schema.sql         — To'liq SQL sxema (RLS bilan)
supabase/seed.sql            — Namunaviy kurs katalogi
```

## Kirish modeli: Obuna + 3 ta umrbod tarif (Start / Standart / Pro)

- **Obuna** (`SUBSCRIPTION_PRICE`, `lib/pricing.ts`) — oylik/yillik, barcha kurslarning
  **Start** darajasiga (video darslar + materiallar + community, mentor guruhda savollarga
  javob beradi) cheklovsiz kirish beradi. Live darslar KIRMAYDI. Obuna tugasa
  (`subscriptions.current_period_end` o'tsa), kirish darhol yopiladi — bu har bir
  so'rovda live tekshiriladi (`getLessonAccess`, `has_course_access` SQL funksiyasi),
  alohida cron kerak emas.
- **Bitta kursni sotib olish** (`courses.price_start/price_standard/price_pro`,
  `enrollments.tier`) shu kursga **umrbod** tanlangan tarifda kirish beradi:
  - **Start** — video + materiallar + community + mentor guruhda javob beradi (live yo'q).
  - **Standart** — Start + haftada 2 marta jonli dars mentor bilan.
  - **Pro** — Start + haftada 3 marta jonli dars mentor bilan.

  Obuna keyinroq tugasa ham, sotib olingan tarif yopilmaydi. Bir kursni keyinroq
  yuqoriroq tarifga (masalan Standart → Pro) "upgrade" qilish mumkin —
  `grant-access.ts` eng yuqori sotib olingan darajani saqlaydi, hech qachon pasaytirmaydi.

`lib/lms/access.ts`:
- **`getLessonAccess`** — foydalanuvchining `courseId` uchun kirish darajasini
  qaytaradi (`accessLevel: "start" | "standard" | "pro" | null`) — sotib olingan tarif
  har doim faol obunadan (har doim "start") ustun turadi.
- **`isLessonLocked`** — avvalgi dars (`order_index - 1`) tugallanmagan yoki uning testi
  o'tilmagan bo'lsa, joriy darsni bloklaydi (ketma-ket ochilish barcha tariflarda bir xil).
- **`completeLesson`** — `user_progress` jadvaliga yozadi va keyingi darsni qaytaradi.

## CRM / Downsell (`/admin/leads`)

Obunachi (start) — operator uchun issiq lid: `profiles.lead_status` orqali kuzatiladi
("Qiziqdi" → "VIP taklif qilindi" → "Downsell → obuna sotib oldi"), `operator_call_logs`
jadvaliga har bir qo'ng'iroq eslatmasi yoziladi. **"Upgrade to VIP with Subscription
Credit"** tugmasi (`upgradeToVipWithCredit`, `lib/lms/admin-actions.ts`) mijozning oxirgi
obuna to'lovini tanlangan VIP kurs narxidan avtomatik ayiradi, `payments`'ga `provider:
'manual'` yozuv qo'shadi va kursga darhol VIP kirish beradi. Dashboard'da har bir
obunachiga doimiy downsell banner (`components/profile/downsell-banner.tsx`) va obuna
tugashiga ≤3 kun qolganda eslatma popup (`components/profile/expiry-popup.tsx`)
ko'rsatiladi.

## Video xavfsizligi

Har bir video ustida talabaning telefon raqami + qisqa ID'si shaffof holatda (opacity
0.4) 5 soniyada bir joy almashtirib turadi (`components/course/video-watermark.tsx`) —
ekran yozib olib tarqatishni to'xtatmaydi, lekin har qanday sizib chiqqan yozuvni
qaysi akkaunt orqali bo'lganini aniqlashtiradi. To'liq DRM/token-asosida striming
(Bunny.net Stream, VdoCipher) yoki hech bo'lmasa domenga bog'langan embedding (Vimeo Pro)
— bular pullik video-hosting xizmatlari va real API kalitlari talab qiladi, shuning
uchun Supabase/to'lovlar kabi loyihaning oxirida ulanadi; hozircha video havolasi
to'g'ridan-to'g'ri (`lessons.video_url`) saqlanadi.

## To'lov oqimi

1. Foydalanuvchi "Sotib olish" tugmasini bosadi → `POST /api/payments/{click|payme}` —
   `payments` jadvalida `pending` yozuv yaratiladi, checkout havolasi qaytariladi.
2. Foydalanuvchi Click/Payme'ning o'z sahifasida to'lovni yakunlaydi.
3. Click/Payme `POST /api/payments/{click|payme}/webhook` orqali serverga qaytadi →
   to'lov `paid` deb belgilanadi va `grantAccessForPayment` orqali `enrollments` yoki
   `subscriptions` jadvaliga yozuv qo'shiladi.

Ishlab chiqarishga chiqarishdan oldin `.env.local`'ga haqiqiy Click/Payme merchant
ma'lumotlarini kiriting (`CLICK_SERVICE_ID`, `CLICK_MERCHANT_ID`, `CLICK_SECRET_KEY`,
`PAYME_MERCHANT_ID`, `PAYME_SECRET_KEY`).

## Jonli darslar (Google Meet)

Standart yoki Pro tarifda kursni sotib olgan talabalar uchun — Start tarifidagilar va
obunachilar (har doim "start") kira olmaydi, lekin jadvalni (sana/vaqt) ko'ra oladi. Bu
tashqi Zoom emas, balki platforma ichida joylashgan:

1. Admin `/admin/live-sessions`'da kurs + sana/vaqt + qaysi tarif kira olishi
   (`required_tier`: "standart va pro" yoki "faqat pro") bo'yicha dars yaratadi va
   Google Meet havolasini ([meet.google.com/new](https://meet.google.com/new) orqali
   qo'lda yaratilgan) joylaydi.
2. Talaba `/live`'da **barcha** rejalashtirilgan darslar jadvalini ko'radi (RLS'dagi
   `can_view_live_session` — istalgan tarif/obuna egasi jadvalni ko'ra oladi), lekin
   faqat o'z tarifi (yoki undan yuqori) mos keladigan darslarga "Darsga kirish" tugmasi
   orqali Meet'ga o'ta oladi. Mos kelmaydigan darslar qulflangan holda, tegishli tarifga
   o'tish havolasi bilan ko'rsatiladi (`getLiveSessionsForUser`, `lib/lms/live-sessions.ts`).
3. Har bir dars sahifasida jonli Savol-Javob taxtasi bor (`components/live/session-qa.tsx`)
   — talaba istalgan vaqt savol yozadi, admin `/admin/live-sessions/[id]`'da javob beradi,
   ikkala tomon ham Supabase Realtime orqali sahifani yangilamasdan ko'radi.
4. Darslar RO'YXATI (sana/vaqt) RLS darajasida hammaga ko'rinadi, lekin haqiqiy
   **kirish huquqi** (`meet_url`ni ko'rsatish, Q&A yozish) `has_live_session_access` SQL
   funksiyasi + sahifa darajasidagi tekshiruv orqali `enrollments.tier`ni
   `live_sessions.required_tier` bilan solishtirib beriladi — obuna (har doim "start")
   hech qachon yetarli emas.

Google Meet havolasini avtomatik yaratish (Google Calendar API orqali) keyingi bosqichda
qo'shilishi mumkin — hozircha admin havolani qo'lda joylaydi, bu ko'pchilik kichik
platformalar uchun yetarli va OAuth sozlamalarini talab qilmaydi.

## Referal dasturi

Ustoz.ai'dagi "Targ'ibotchilar" dasturiga o'xshash: har bir foydalanuvchi o'z referal
havolasiga ega (`/register?ref=CODE`), profil sahifasida ko'rsatiladi. Do'st shu havola
orqali ro'yxatdan o'tsa, `redeemReferral` (`lib/lms/referral-actions.ts`) chaqiriladi va
`referrals` jadvaliga yozuv qo'shiladi. Mukofot bosqichlari: **10 do'st → 1 oy**, **50 do'st
→ 6 oy**, **100 do'st → 1 yil** bepul Premium obuna (avtomatik ravishda `subscriptions`
jadvaliga yoziladi).

## Xavfsizlik: to'lov summasi

To'lov summasi hech qachon frontend'dan ishonch bilan qabul qilinmaydi — `resolvePurchase`
(`lib/payments/resolve-amount.ts`) uni har doim serverda, `courses` jadvalidagi haqiqiy narx
yoki `SUBSCRIPTION_PRICE` konstantasi asosida qayta hisoblaydi. Bu devtools orqali narxni
o'zgartirib yuborish imkoniyatini yopadi.

## Xavfsizlik: test javoblari

Ilgari `quiz_questions.correct_index` RLS orqali hammaga ochiq edi va to'g'ri javob
brauzerga to'g'ridan-to'g'ri yuborilardi — istalgan foydalanuvchi buni ko'ra olardi.
Endi: (1) RLS `has_quiz_access()` funksiyasi orqali faqat kursga kirish huquqi bor
foydalanuvchiga ochiq, (2) `correct_index` hech qachon brauzerga yuborilmaydi — baholash
`POST /api/lessons/quiz/submit`da serverda amalga oshadi va natija `user_progress`ga
yoziladi, `completeLesson` esa mijozdan kelgan bayroqqa emas, shu saqlangan natijaga
ishonadi.

## Muddatli to'lov (installment)

Biznes-rejaning 11.3/9.7-bo'limlariga muvofiq — "2 bo'lakka" (50%+50%, barcha tariflarda)
va "3 bo'lakka" (40% boshlang'ich + qolgani, faqat Standard/Pro):

1. Xaridda foydalanuvchi rejani tanlaydi → `createInstallmentPlan`
   (`lib/payments/installments.ts`) `installment_plans` + to'liq `installment_payments`
   jadvalini oldindan yaratadi (har biri o'z summasi va muddati bilan, 30 kunlik oraliqda).
2. Birinchi to'lov (boshlang'ich) darhol Click/Payme orqali to'lanadi va kursga kirish
   ochiladi (odatdagi xaridga o'xshab).
3. Keyingi to'lovlar — `/dashboard`da "Keyingi to'lov" kartochkasi orqali, xuddi shunday
   Click/Payme checkout bilan.
4. Agar muddat o'tib ketsa-yu to'lov qilinmasa, `getLessonAccess` (`lib/lms/access.ts`)
   kursni avtomatik bloklaydi — cron kerak emas, tekshiruv har safar `due_date`ni real
   vaqtda solishtiradi.
