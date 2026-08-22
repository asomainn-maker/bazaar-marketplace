import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen">
      <header className="max-w-2xl mx-auto px-6 pt-8 flex items-center justify-between">
        <Link href="/" className="font-display text-lg">İtemBazar</Link>
        <Link href="/" className="text-sm text-mist hover:text-paper">← Ana səhifə</Link>
      </header>
      <main className="max-w-2xl mx-auto px-6 py-12 space-y-6 text-sm text-paper/90 leading-relaxed">
        <h1 className="font-display text-2xl mb-2">İstifadə şərtləri</h1>
        <p className="text-mist">Son yenilənmə: 2026</p>

        <section>
          <h2 className="font-display text-lg text-paper mb-2">1. Platformanın xarakteri</h2>
          <p>Bazar, istifadəçilər arası (P2P) rəqəmsal məhsul alqı-satqısı üçün vasitəçi platformadır. Platforma özü heç bir məhsul satmır — yalnız alıcı və satıcını birləşdirir, ödənişi vasitəçi (escrow) kimi saxlayır.</p>
        </section>

        <section>
          <h2 className="font-display text-lg text-paper mb-2">2. Komissiya</h2>
          <p>Balansa pul yatırarkən platforma 10% komissiya tutur. Bu komissiya geri qaytarılmır.</p>
        </section>

        <section>
          <h2 className="font-display text-lg text-paper mb-2">3. Ödəniş qorunması (Escrow)</h2>
          <p>Alıcının ödədiyi məbləğ satıcıya dərhal ötürülmür. Satıcı məhsulu təhvil verdiyini bildirdikdən sonra, alıcı təsdiqləyənə qədər (və ya 3 gün ərzində cavabsız qalarsa avtomatik) ödəniş satıcıya keçmir.</p>
        </section>

        <section>
          <h2 className="font-display text-lg text-paper mb-2">4. Mübahisələr</h2>
          <p>Tərəflər arasında razılıq olmadıqda, hər iki tərəf dəstək sisteminə müraciət edə bilər. Platforma administrasiyası təqdim olunan məlumatlar əsasında yekun qərar verir. Bu qərar qətidir.</p>
        </section>

        <section>
          <h2 className="font-display text-lg text-paper mb-2">5. Qadağan olunan məzmun</h2>
          <p>Qanunsuz məhsullar, oğurlanmış hesablar/əşyalar, dələduzluq məqsədli elanlar qadağandır. Belə hallarda hesab dərhal bağlanır, əlaqədar dövlət orqanlarına məlumat verilə bilər.</p>
        </section>

        <section>
          <h2 className="font-display text-lg text-paper mb-2">6. Hesabın bağlanması</h2>
          <p>Platforma qaydalarını pozan istifadəçilərin hesabı xəbərdarlıq edilmədən bloklana bilər.</p>
        </section>

        <section>
          <h2 className="font-display text-lg text-paper mb-2">7. Məsuliyyətin məhdudlaşdırılması</h2>
          <p>Platforma, satılan məhsulların keyfiyyətinə, həqiqiliyinə görə birbaşa məsuliyyət daşımır — bu, P2P bazar modelinin xüsusiyyətidir. Platforma yalnız ödəniş qorunması və mübahisə həlli prosesinə görə cavabdehdir.</p>
        </section>

        <section>
          <h2 className="font-display text-lg text-paper mb-2">8. Əlaqə</h2>
          <p>Suallarınız üçün: <a href="mailto:asomainn@gmail.com" className="text-jade-soft underline">asomainn@gmail.com</a></p>
        </section>
      </main>
    </div>
  );
}
