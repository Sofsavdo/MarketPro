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

## Kirish modeli: Hybrid (Obuna + Standalone Lifetime)

Ikki bosqichli kirish darajasi bor — bittasi cheklovsiz, ikkinchisi kursga xos, umrbod:

- **Start** — obuna (`SUBSCRIPTION_PRICE`, `lib/pricing.ts`) barcha kurslarning video
  darslari + community (Q&A)'siga cheklovsiz kirish beradi. Live darslar va mentor
  feedback KIRMAYDI. Obuna tugasa (`subscriptions.current_period_end` o'tsa), kirish
  darhol yopiladi — bu har bir so'rovda live tekshiriladi (`getLessonAccess`,
  `has_course_access` SQL funksiyasi), alohida cron kerak emas.
- **VIP** — bitta kursni to'liq sotib olish (`courses.price`, `enrollments` jadvaliga
  yozuv) shu kursga UMRBOD to'liq kirish beradi: video + community + live darslar +
  mentor feedback. Obuna keyinroq tugasa ham, sotib olingan kurs yopilmaydi.

`lib/lms/access.ts`:
- **`getLessonAccess`** — foydalanuvchining `courseId` uchun kirish darajasini
  qaytaradi (`accessLevel: "start" | "vip" | null`) — enrollment (VIP) har doim faol
  obunadan (start) ustun turadi.
- **`isLessonLocked`** — avvalgi dars (`order_index - 1`) tugallanmagan yoki uning testi
  o'tilmagan bo'lsa, joriy darsni bloklaydi (ketma-ket ochilish start va VIP'da bir xil).
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

Faqat VIP (kursni to'liq sotib olgan) talabalar uchun — obunachilar (start) kira olmaydi,
bu tashqi Zoom emas, balki platforma ichida joylashgan:

1. Admin `/admin/live-sessions`'da kurs + sana/vaqt bo'yicha dars yaratadi va Google Meet
   havolasini ([meet.google.com/new](https://meet.google.com/new) orqali qo'lda
   yaratilgan) joylaydi.
2. Talaba `/live`'da o'ziga tegishli (sotib olgan/VIP) darslar jadvalini ko'radi va
   "Darsga kirish" tugmasi orqali Meet'ga o'tadi. Obunachi (start) uchun shu kurs
   darslari qulflangan holda, "VIP'ga o'ting" havolasi bilan ko'rsatiladi
   (`getLockedSessionsForSubscriber`, `lib/lms/live-sessions.ts`).
3. Har bir dars sahifasida jonli Savol-Javob taxtasi bor (`components/live/session-qa.tsx`)
   — talaba istalgan vaqt savol yozadi, admin `/admin/live-sessions/[id]`'da javob beradi,
   ikkala tomon ham Supabase Realtime orqali sahifani yangilamasdan ko'radi.
4. Kirish huquqi `has_live_session_access` SQL funksiyasi orqali RLS darajasida
   tekshiriladi — faqat `enrollments`ga qaraydi (VIP), obunani (start) qasddan hisobga
   olmaydi.

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
