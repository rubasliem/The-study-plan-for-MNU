# 🎓 دليل تثبيت برنامج الخطة الدراسية - جامعة المنوفية الأهلية

## 📋 المتطلبات

| المطلوب | الرابط |
|---------|--------|
| Docker Desktop | https://www.docker.com/products/docker-desktop/ |
| Git | https://git-scm.com/downloads |

---

## 🚀 خطوات التثبيت (3 خطوات فقط)

### الخطوة 1: تثبيت Docker Desktop
1. حمّل Docker من الرابط أعلاه
2. ثبّته وأعد تشغيل الجهاز
3. تأكد أن Docker يعمل (تظهر أيقونة الحوت في شريط المهام)

### الخطوة 2: تحميل المشروع
افتح **PowerShell** أو **Command Prompt** كمدير وشغّل:

```bash
git clone https://github.com/rubasliem/The-study-plan-for-MNU.git
cd The-study-plan-for-MNU
```

### الخطوة 3: تشغيل البرنامج
```bash
docker compose up -d --build
```

> ⏳ المرة الأولى تستغرق 5-10 دقائق لتحميل المكونات.

---

## 🌐 الوصول للبرنامج

### 1. اعرف الـ IP الخاص بالجهاز:
افتح PowerShell وشغّل:
```bash
ipconfig
```
ابحث عن **IPv4 Address** مثل: `192.168.1.50`

### 2. البرنامج يعمل على:
- **من نفس الجهاز:** http://localhost
- **من أي جهاز في الشبكة:** http://192.168.1.50 (استبدل بالـ IP الفعلي)

---

## 🔑 بيانات الدخول الافتراضية

| المستخدم | كلمة المرور |
|---------|------------|
| admin | admin |

> ⚠️ غيّري كلمة المرور فور الدخول الأول من إعدادات النظام!

---

## 🔄 أوامر مفيدة

| الأمر | الوظيفة |
|-------|---------|
| `docker compose up -d` | تشغيل البرنامج |
| `docker compose down` | إيقاف البرنامج |
| `docker compose pull` | تحديث المشروع |
| `docker compose logs -f` | عرض السجلات |
| `docker compose restart` | إعادة التشغيل |

---

## 🔧 تحديث البرنامج

لتحديث البرنامج بآخر التغييرات من GitHub:

```bash
git pull origin main
docker compose up -d --build
```

---

## ❗ في حالة حدوث مشكلة

```bash
# إيقاف كل شيء وإعادة التشغيل من الصفر
docker compose down
docker compose up -d --build
```

---

## 📞 الدعم الفني
للتواصل مع مطوّر النظام في حال وجود مشكلة.
