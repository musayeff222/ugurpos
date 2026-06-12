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
