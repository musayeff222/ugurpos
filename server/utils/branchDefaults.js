export function seedBranchDefaults(db, branchId) {
  const defaults = {
    groups: ["Gıda", "İçecek", "Temizlik", "Diğer"],
    paymentMethods: ["Nakit", "POS / Kredi Kartı", "Açık Hesap", "Parçalı Ödeme"],
    incomeTypes: ["Ek Satış Geliri", "Faiz Geliri"],
    expenseTypes: ["Kira", "Elektrik", "Personel Maaşı", "Masraf"],
    integrations: [
      ["E-Fatura", "E-fatura entegrasyonu"],
      ["Yazarkasa", "ÖKC entegrasyonu"],
    ],
  };

  const suffix = branchId.slice(-6);
  const insGroup = db.prepare("INSERT INTO `groups` (id, name, branch_id) VALUES (?, ?, ?)");
  defaults.groups.forEach((name, i) => {
    insGroup.run(`g_${suffix}_${i}`, name, branchId);
  });

  const insPm = db.prepare("INSERT INTO payment_methods (id, name, active, branch_id) VALUES (?, ?, 1, ?)");
  defaults.paymentMethods.forEach((name, i) => {
    insPm.run(`pm_${suffix}_${i}`, name, branchId);
  });

  const insIt = db.prepare("INSERT INTO income_types (id, name, branch_id) VALUES (?, ?, ?)");
  defaults.incomeTypes.forEach((name, i) => {
    insIt.run(`it_${suffix}_${i}`, name, branchId);
  });

  const insEt = db.prepare("INSERT INTO expense_types (id, name, branch_id) VALUES (?, ?, ?)");
  defaults.expenseTypes.forEach((name, i) => {
    insEt.run(`et_${suffix}_${i}`, name, branchId);
  });

  const insInt = db.prepare(
    "INSERT INTO integrations (id, name, status, description, branch_id) VALUES (?, ?, 'inactive', ?, ?)"
  );
  defaults.integrations.forEach(([name, desc], i) => {
    insInt.run(`i_${suffix}_${i}`, name, desc, branchId);
  });

  db.prepare(
    "INSERT INTO customers (id, name, phone, address, note, credit_limit, debt, purchase_count, branch_id) VALUES (?, 'Perakende Müşteri', '', '', '', 0, 0, 0, ?)"
  ).run(`c_default_${suffix}`, branchId);
}
