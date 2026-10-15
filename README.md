# Know UAV — خطوات الإطلاق

## ١) قاعدة البيانات (Supabase) · ٣ دقائق
1. افتح مشروعك في Supabase ← **SQL Editor** ← **New query**.
2. انسخ كامل محتوى `supabase/schema.sql` والصقه واضغط **Run**.
3. استعلام جديد: انسخ كامل `supabase/seed.sql` والصقه واضغط **Run** (يضيف الدروس والاختبارات والمصطلحات).
4. **Authentication ← Sign In / Providers ← Email**: أطفئ خيار **Confirm email** حتى يكون التسجيل فورياً.
   (البريد المدمج في Supabase يرسل رسائل قليلة في الساعة ولا يكفي لعدد كبير من المسجلين.)

## ٢) الرفع على GitHub · دقيقتان
1. افتح مستودع `knowuav` في GitHub ← **Add file ← Upload files**.
2. اسحب **كل محتويات المجلد** (الملفات ومجلدي `assets` و `supabase`) ← **Commit changes**.

## ٣) النشر (Vercel) · دقيقتان
1. vercel.com ← **Add New ← Project** ← اختر مستودع `knowuav` ← **Deploy** (بدون أي إعدادات).
2. سيعطيك رابطاً مثل `https://www.knowuav.com` (وقبله `https://knowuav.vercel.app`).
3. ارجع لـ Supabase ← **Authentication ← URL Configuration**:
   - **Site URL**: رابط موقعك
   - **Redirect URLs**: أضف `https://رابطك/app`

## ٤) اجعل نفسك المسؤول
بعد ما تنشئ حساباً في الموقع ببريدك، شغّل هذا في SQL Editor:
```sql
update public.profiles set is_admin = true where email = 'TraFilt.store@gmail.com';
```
ثم افتح `/admin` في الموقع: مراجعة الإيصالات، وإدارة المستخدمين، وإدخال بيانات التحويل (الآيبان و STC Pay).

## ٥) الدخول بقوقل (عندما تكون جاهزاً)
1. console.cloud.google.com ← APIs & Services ← Credentials ← أنشئ **OAuth client ID** من نوع Web application.
2. Authorized redirect URI: `https://tjkrscsesdsfhjosrirl.supabase.co/auth/v1/callback`
3. انسخ Client ID و Secret إلى Supabase ← Authentication ← Providers ← **Google** ← Enable.
4. في `assets/config.js` غيّر `GOOGLE_ENABLED: false` إلى `true` وارفع الملف مرة ثانية على GitHub.

## كيف يعمل تفعيل الحساب
المستخدم يسجّل ← يحوّل ٢٥ ريال ← يرفع الإيصال ← يتفعّل حسابه فوراً وبشكل دائم (دفعة واحدة).
أنت تراجع الإيصالات من `/admin`: «قبول» أو «رفض وإيقاف الحساب».

## هيكل الملفات
- `index.html` الصفحة الرئيسية · `app.html` التطبيق (الدروس، المحاكي، المصطلحات، الحساب، الدفع) · `admin.html` لوحة التحكم
- `about / privacy / terms / refund` الصفحات القانونية
- `supabase/content.js` محتوى الدروس. بعد تعديله شغّل `node supabase/build-seed.js` ثم أعد تشغيل `seed.sql`.
- التعليق الصوتي محفوظ في مخزن `audio` في Supabase بأسماء `1-1.mp3` حتى `4-4.mp3`.

## الإيميلات التلقائية (Gmail)
ترحيب عند التسجيل · «تم تفعيل حسابك» عند رفع الإيصال + تنبيه لك · إيميل عند رفض الإيصال.
1. في حساب قوقل: فعّل التحقق بخطوتين، ثم أنشئ «كلمة مرور تطبيق» من myaccount.google.com/apppasswords.
2. Supabase ← Edge Functions ← Deploy a new function ← Via Editor، الاسم `send-email`، والصق `supabase/functions/send-email/index.ts`.
3. Edge Functions ← Secrets: `GMAIL_USER`، `GMAIL_APP_PASSWORD`، `HOOK_SECRET`.
4. شغّل `supabase/emails.sql` في SQL Editor بعد وضع نفس `HOOK_SECRET` مكان `PUT_YOUR_HOOK_SECRET_HERE`.
