let sharedCtx = null;

function getAudioContext() {
  if (typeof window === "undefined") return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedCtx) sharedCtx = new AudioCtx();
  if (sharedCtx.state === "suspended") {
    sharedCtx.resume().catch(() => {});
  }
  return sharedCtx;
}

function playTone(ctx, freq, start, duration, volume = 0.12, type = "sine") {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration);
}

/** Sepete ürün / muhtelif tutar eklendiğinde */
export function playPosItemAddedSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    playTone(ctx, 1200, t, 0.07, 0.14);
  } catch {
    /* ignore */
  }
}

/** Ödeme / hesap kapatma tamamlandığında */
export function playPosPaymentSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    [660, 880, 1100].forEach((freq, i) => {
      playTone(ctx, freq, t + i * 0.11, 0.14, 0.13);
    });
  } catch {
    /* ignore */
  }
}
