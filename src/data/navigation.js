export const navigation = [
  {
    label: "Anasayfa",
    path: "/dashboard",
    icon: "fa-th-large",
  },
  {
    label: "Satış Yap",
    path: "/sales",
    icon: "fa-edit",
  },
  {
    label: "Web Siparişler",
    path: "/web-orders",
    icon: "fa-shopping-bag",
    badge: "webOrders",
  },
  {
    label: "Raporlar",
    icon: "fa-bar-chart",
    children: [
      { label: "Günlük Rapor", path: "/dreport" },
      { label: "Tarihsel Rapor", path: "/breport" },
      { label: "Ürünsel Rapor", path: "/preport" },
      { label: "Grupsal Rapor", path: "/pgreport" },
      { label: "Ürün Korelasyon Raporu", path: "/pcreport" },
      { label: "Stok Hareket Rapor", path: "/sreport" },
      { label: "Personel Hareket Raporu", path: "/staffmotions" },
    ],
  },
  {
    label: "Müşteriler",
    icon: "fa-male",
    children: [
      { label: "Müşteriler", path: "/customersList" },
      { label: "Müşteri Detay", path: "/customers" },
    ],
  },
  {
    label: "Ürünler",
    icon: "fa-clone",
    children: [
      { label: "Ürünler", path: "/products" },
      { label: "Ürün Ekle & Güncelle", path: "/update" },
      { label: "Varyantlı Ürün Ekle", path: "/updatevariants" },
      { label: "Ürün Grupları", path: "/pgroups" },
      { label: "Alt Ürün Tanımları", path: "/ptree" },
      { label: "Ürün Varyantları", path: "/variants" },
      { label: "Ürün İadesi Al", path: "/refund" },
      { label: "İade Talepleri", path: "/refundreq" },
      { label: "Ürün Etiketi Üret", path: "/ptag" },
      { label: "Etiket Tasarla & Üret", path: "/ptags" },
      { label: "Barkodlu Terazi Çıktısı", path: "/pweightxt" },
    ],
  },
  {
    label: "Alış Faturaları",
    icon: "fa-file-text-o",
    children: [
      { label: "Alış Faturaları", path: "/pinvoice" },
      { label: "Alış Faturası Oluştur", path: "/createinvoice" },
    ],
  },
  {
    label: "Firmalar",
    path: "/firms",
    icon: "fa-newspaper-o",
  },
  {
    label: "E-Faturalar",
    icon: "fa-envelope-open-o",
    children: [
      { label: "Yeni E-Fatura Oluştur", path: "/einvoicecreate" },
      { label: "Giden E-Faturalar", path: "/einvoiceg" },
      { label: "Gelen E-Faturalar", path: "/einvoicec" },
    ],
  },
  {
    label: "Stok Sayımı",
    path: "/stockl",
    icon: "fa-cubes",
  },
  {
    label: "Gelir / Giderler",
    icon: "fa-retweet",
    children: [
      { label: "Gelirler", path: "/income" },
      { label: "Giderler", path: "/expense" },
      { label: "Gelir / Gider Türleri", path: "/inextypes" },
    ],
  },
  {
    label: "Personeller",
    path: "/staffs",
    icon: "fa-group",
  },
  {
    label: "Görevler",
    path: "/tasks",
    icon: "fa-ellipsis-h",
  },
  {
    label: "Ödeme Tipleri",
    path: "/paymentMethods",
    icon: "fa-money",
  },
  {
    label: "Entegrasyonlar",
    path: "/integration",
    icon: "fa-refresh",
  },
];
