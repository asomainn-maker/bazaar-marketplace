import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen">
      <header className="max-w-2xl mx-auto px-6 pt-8 flex items-center justify-between">
        <Link href="/" className="font-display text-lg">Bazar</Link>
        <Link href="/" className="text-sm text-mist hover:text-paper">← Ana səhifə</Link>
      </header>
      <main className="max-w-2xl mx-auto px-6 py-12 space-y-6 text-sm text-paper/90 leading-relaxed">
        <h1 className="font-display text-2xl mb-2">Məxfilik siyasəti</h1>
        <p className="text-mist">Son yenilənmə: 2026</p>

        <section>
          <h2 className="font-display text-lg text-paper mb-2">1. Topladığımız məlumatlar</h2>
          <p>Qeydiyyat üçün email ünvanı, satıcı doğrulaması üçün telefon nömrəsi, elan və sifariş tarixçəsi, PayPal ilə edilən ödəniş qeydləri (məbləğ, tarix — kart məlumatları bizdə saxlanmır, birbaşa PayPal tərəfindən idarə olunur).</p>
        </section>

        <section>
          <h2 className="font-display text-lg text-paper mb-2">2. Məlumatların istifadəsi</h2>
          <p>Toplanan məlumatlar yalnız hesabınızı idarə etmək, əməliyyatları həyata keçirmək, mübahisələri həll etmək və sizinlə əlaqə saxlamaq üçün istifadə olunur. Məlumatlarınız üçüncü tərəflərə satılmır.</p>
        </section>

        <section>
          <h2 className="font-display text-lg text-paper mb-2">3. Görünən məlumatlar</h2>
          <p>İstifadəçi adınız, elanlarınız, satış sayınız və rəyləriniz ictimai profil səhifənizdə görünür. Telefon nömrəniz və email ünvanınız yalnız admin tərəfindən görünür, ictimai deyil.</p>
        </section>

        <section>
          <h2 className="font-display text-lg text-paper mb-2">4. Saxlama müddəti</h2>
          <p>Məlumatlarınız hesabınız aktiv olduğu müddətdə saxlanılır. Hesabınızı silmək istəsəniz, dəstəklə əlaqə saxlayın.</p>
        </section>

        <section>
          <h2 className="font-display text-lg text-paper mb-2">5. Əlaqə</h2>
          <p>Suallarınız üçün: <a href="mailto:asomainn@gmail.com" className="text-jade-soft underline">asomainn@gmail.com</a></p>
        </section>
      </main>
    </div>
  );
}
