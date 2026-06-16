import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useStore } from "../store/StoreContext";
import { api } from "../api/client";
import { DEFAULT_PRODUCT_UNIT } from "../data/productUnits";

const emptyForm = {
  stockCode: "",
  name: "",
  groupId: "",
  unit: DEFAULT_PRODUCT_UNIT,
  stock: 0,
  criticalStock: 5,
  vat: 20,
  buyPrice: 0,
  price1: 0,
  price2: 0,
  onSalePage: true,
};

export default function useProductForm() {
  const { state, addProduct, updateProduct, uploadProductImage, deleteProducts } = useStore();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const editId = params.get("id");
  const existing = state.products.find((p) => p.id === editId);
  const [form, setForm] = useState(emptyForm);
  const [imageValue, setImageValue] = useState(undefined);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existing) {
      setForm({ ...emptyForm, ...existing });
      setImageValue(undefined);
    } else {
      setForm(emptyForm);
      setImageValue(undefined);
    }
  }, [existing?.id]);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const buildProductPayload = () => ({
    name: form.name.trim(),
    groupId: form.groupId || state.groups[0]?.id,
    stock: Number(form.stock),
    criticalStock: Number(form.criticalStock),
    vat: Number(form.vat),
    buyPrice: Number(form.buyPrice),
    price1: Number(form.price1),
    price2: Number(form.price2),
    unit: form.unit || DEFAULT_PRODUCT_UNIT,
    onSalePage: !!form.onSalePage,
  });

  const persistProductImage = async (productId) => {
    if (imageValue === undefined) return;

    if (imageValue === null) {
      await api.updateProduct(productId, { removeImage: true });
      return;
    }

    if (imageValue.file) {
      await uploadProductImage(productId, imageValue.file);
      return;
    }

    if (imageValue.data && imageValue.mime) {
      await api.updateProduct(productId, {
        imageData: imageValue.data,
        imageMime: imageValue.mime,
      });
    }
  };

  const saveProduct = async () => {
    if (!form.name.trim()) {
      setMessage("Ürün adı zorunludur.");
      return false;
    }
    if (imageValue && imageValue !== null && !imageValue.file && !imageValue.data) {
      setMessage("Resim hazırlanamadı. Lütfen tekrar seçin.");
      return false;
    }

    setSaving(true);
    setMessage("");

    try {
      const payload = buildProductPayload();

      if (existing) {
        await updateProduct(existing.id, {
          ...payload,
          barcode: existing.barcode,
          stockCode: form.stockCode || existing.stockCode,
        });
        await persistProductImage(existing.id);
        setImageValue(undefined);
        setMessage("Ürün güncellendi.");
        return true;
      }

      const created = await addProduct(payload);
      await persistProductImage(created.id);
      navigate("/products");
      return true;
    } catch (err) {
      setMessage(err.message || "Kayıt başarısız.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const removeProduct = async () => {
    if (!existing) return false;
    if (!window.confirm("Bu ürün silinsin mi?")) return false;

    setSaving(true);
    setMessage("");
    try {
      await deleteProducts([existing.id]);
      navigate("/products");
      return true;
    } catch (err) {
      setMessage(err.message || "Silme başarısız.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const lookupBarcode = (query) => {
    const q = query.trim();
    if (!q) {
      setMessage("Barkod girin veya okutun.");
      return null;
    }
    const product =
      state.products.find((p) => p.barcode === q) ||
      state.products.find((p) => p.stockCode === q) ||
      state.products.find((p) => p.barcode.includes(q) || p.stockCode.includes(q));
    return product || null;
  };

  const profitPercent = () => {
    const buy = Number(form.buyPrice) || 0;
    const sell = Number(form.price1) || 0;
    if (buy <= 0) return "";
    return (((sell - buy) / buy) * 100).toFixed(0);
  };

  const setProfitPercent = (value) => {
    const buy = Number(form.buyPrice) || 0;
    const pct = Number(value);
    if (!Number.isFinite(pct) || buy <= 0) return;
    setField("price1", Number((buy * (1 + pct / 100)).toFixed(2)));
  };

  const adjustStock = (delta) => {
    setField("stock", Math.max(0, Number(form.stock || 0) + delta));
  };

  return {
    state,
    existing,
    form,
    setField,
    imageValue,
    setImageValue,
    message,
    setMessage,
    saving,
    saveProduct,
    removeProduct,
    lookupBarcode,
    profitPercent,
    setProfitPercent,
    adjustStock,
    navigate,
  };
}
