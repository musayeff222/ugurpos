export function compressImageFile(file, maxSize = 800, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (!file?.type?.startsWith("image/")) {
      reject(new Error("Lütfen bir resim dosyası seçin."));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Dosya okunamadı."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Resim okunamadı."));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        const base64 = dataUrl.split(",")[1];
        const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
        const imageFile = new File([bytes], "product.jpg", { type: "image/jpeg" });
        resolve({
          mime: "image/jpeg",
          data: base64,
          previewUrl: dataUrl,
          file: imageFile,
        });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function canvasToJpeg(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Şəkil hazırlanmadı"));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      quality
    );
  });
}

async function loadImage(file) {
  try {
    return await createImageBitmap(file);
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const image = await new Promise((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error("Şəkil oxunmadı. JPEG və ya PNG seçin."));
        el.src = url;
      });
      return image;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

export async function compressInvoiceImage(file) {
  if (!file) throw new Error("Faktura şəklini yükləyin");
  const image = await loadImage(file);
  const width = image.width || image.naturalWidth;
  const height = image.height || image.naturalHeight;
  if (!width || !height) {
    throw new Error("Şəkil oxunmadı. JPEG və ya PNG seçin.");
  }
  const maxEdge = 1600;
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  if (typeof image.close === "function") image.close();

  let quality = 0.84;
  let blob = await canvasToJpeg(canvas, quality);
  const limit = 1.4 * 1024 * 1024;
  while (blob.size > limit && quality > 0.45) {
    quality -= 0.12;
    blob = await canvasToJpeg(canvas, quality);
  }
  return new File([blob], "fatura.jpg", { type: "image/jpeg", lastModified: Date.now() });
}

export function parseAmount(value) {
  const n = Number(
    String(value ?? "")
      .replace(/\s/g, "")
      .replace(",", ".")
  );
  return Number.isFinite(n) ? n : 0;
}
