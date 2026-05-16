export const metadata = {
  title: 'Privacy Policy | سياسة الخصوصية',
};

export default function PrivacyPolicyPage() {
  return (
    <main
      style={{
        maxWidth: 800,
        margin: '0 auto',
        padding: '48px 24px',
        fontFamily: 'sans-serif',
        lineHeight: 1.8,
        color: '#1a1a1a',
      }}
    >
      {/* ── Arabic ── */}
      <section dir="rtl" lang="ar" style={{ marginBottom: 64 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
          سياسة الخصوصية
        </h1>
        <p style={{ color: '#555', marginBottom: 32 }}>
          آخر تحديث: مايو 2026
        </p>

        <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32 }}>١. المعلومات التي نجمعها</h2>
        <p>
          يجمع تطبيق الأسطول المعلومات التالية لتشغيل خدمات إدارة الأسطول:
        </p>
        <ul>
          <li>بيانات الموقع الجغرافي الدقيقة (في المقدمة وأثناء التشغيل) لتتبع رحلات المركبات.</li>
          <li>معلومات الحساب: الاسم، رقم الهاتف، وبيانات تسجيل الدخول.</li>
          <li>صور المستندات: صور رخصة القيادة، استمارة المركبة، والبطاقة التشغيلية.</li>
          <li>بيانات الرحلات: نقاط الانطلاق والوصول، المسافة، والمدة.</li>
        </ul>

        <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32 }}>٢. كيف نستخدم المعلومات</h2>
        <ul>
          <li>تتبع مركبات الأسطول وعرض مساراتها على الخريطة.</li>
          <li>إدارة السائقين والرحلات والعقود.</li>
          <li>إرسال إشعارات تشغيلية عبر Firebase Cloud Messaging.</li>
          <li>الامتثال لمتطلبات منصة تمم ونقل الحكومية.</li>
        </ul>

        <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32 }}>٣. مشاركة المعلومات</h2>
        <p>
          لا نبيع بياناتك الشخصية لأطراف ثالثة. يتم مشاركة البيانات فقط مع:
        </p>
        <ul>
          <li>منصات حكومية مرخصة (تمم، نقل) وفق متطلبات التشغيل.</li>
          <li>Firebase (Google) لخدمات الإشعارات فقط.</li>
        </ul>

        <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32 }}>٤. الاحتفاظ بالبيانات وحذفها</h2>
        <p>
          يتم الاحتفاظ ببياناتك طوال فترة تشغيل الحساب. يمكنك طلب حذف بياناتك في أي وقت بالتواصل مع مشرف النظام.
        </p>

        <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32 }}>٥. الأمان</h2>
        <p>
          يتم نقل جميع البيانات عبر اتصال HTTPS مشفر. يتم تخزين البيانات على خوادم آمنة.
        </p>

        <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32 }}>٦. التواصل معنا</h2>
        <p>
          لأي استفسار بشأن الخصوصية، يرجى التواصل عبر البريد الإلكتروني أو من خلال مشرف النظام المختص.
        </p>
      </section>

      <hr style={{ border: 'none', borderTop: '1px solid #e0e0e0', margin: '0 0 64px' }} />

      {/* ── English ── */}
      <section dir="ltr" lang="en">
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
          Privacy Policy
        </h1>
        <p style={{ color: '#555', marginBottom: 32 }}>Last updated: May 2026</p>

        <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32 }}>1. Information We Collect</h2>
        <p>The EFleet app collects the following information to operate fleet management services:</p>
        <ul>
          <li>Precise location data (foreground and background) to track vehicle trips.</li>
          <li>Account information: name, phone number, and login credentials.</li>
          <li>Document images: driver license, vehicle registration, and operation card photos.</li>
          <li>Trip data: origin, destination, distance, and duration.</li>
        </ul>

        <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32 }}>2. How We Use the Information</h2>
        <ul>
          <li>Track fleet vehicles and display their routes on a map.</li>
          <li>Manage drivers, trips, and contracts.</li>
          <li>Send operational notifications via Firebase Cloud Messaging.</li>
          <li>Comply with Tamm and Naql government platform requirements.</li>
        </ul>

        <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32 }}>3. Data Sharing</h2>
        <p>We do not sell your personal data. Data is shared only with:</p>
        <ul>
          <li>Licensed government platforms (Tamm, Naql) as required for operations.</li>
          <li>Firebase (Google) for notification services only.</li>
        </ul>

        <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32 }}>4. Data Retention and Deletion</h2>
        <p>
          Your data is retained for the duration of your account activity. You may request deletion of your data at any time by contacting the system administrator.
        </p>

        <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32 }}>5. Security</h2>
        <p>
          All data is transmitted over encrypted HTTPS connections and stored on secured servers.
        </p>

        <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32 }}>6. Contact Us</h2>
        <p>
          For any privacy-related questions, please contact us via email or through your designated system administrator.
        </p>
      </section>
    </main>
  );
}
