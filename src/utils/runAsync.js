export async function runAsync(action, onError) {
  try {
    await action();
    return true;
  } catch (err) {
    onError?.(err.message || "İşlem başarısız");
    return false;
  }
}
