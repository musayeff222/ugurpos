import { listFirmProductIngredients } from "./firmCatalog.js";

function findBranchIngredient(db, branchId, name) {
  return db
    .prepare(
      `SELECT id, stock FROM products
       WHERE branch_id = ? AND LOWER(name) = LOWER(?)
       ORDER BY CASE WHEN unit = 'qram' THEN 0 ELSE 1 END, id
       LIMIT 1`
    )
    .get(branchId, name);
}

/** Satılan kataloq məhsulunun tərkib qramını şubə stokundan çıxır və ya geri qaytarır. */
export function adjustRecipeStock(db, branchId, soldProductId, saleQty, direction) {
  const qty = Number(saleQty) || 0;
  if (!soldProductId || qty <= 0) return;

  const sold = db
    .prepare("SELECT id, firm_product_id FROM products WHERE id = ? AND branch_id = ?")
    .get(soldProductId, branchId);
  if (!sold?.firm_product_id) return;

  const recipes = listFirmProductIngredients(db, sold.firm_product_id);
  const deduct = db.prepare(
    "UPDATE products SET stock = CASE WHEN stock - ? < 0 THEN 0 ELSE stock - ? END WHERE id = ? AND branch_id = ?"
  );
  const restore = db.prepare("UPDATE products SET stock = stock + ? WHERE id = ? AND branch_id = ?");

  for (const recipe of recipes) {
    const grams = Number(recipe.grams) * qty;
    if (!(grams > 0)) continue;
    const stock = findBranchIngredient(db, branchId, recipe.name);
    if (!stock || stock.id === sold.id) continue;
    if (direction === "restore") restore.run(grams, stock.id, branchId);
    else deduct.run(grams, grams, stock.id, branchId);
  }
}
