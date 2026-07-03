import { useMemo, useState } from "react";

const ROWS_LOWER = [
  ["q", "w", "e", "r", "t", "y", "u", "ı", "o", "p", "ğ", "ü"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l", "ş", "i"],
  ["shift", "z", "x", "c", "v", "b", "n", "m", "ö", "ç"],
];

const ROWS_UPPER = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "Ğ", "Ü"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L", "Ş", "İ"],
  ["shift", "Z", "X", "C", "V", "B", "N", "M", "Ö", "Ç"],
];

export default function TouchTextKeyboard({ value = "", onChange }) {
  const [shift, setShift] = useState(false);
  const rows = useMemo(() => (shift ? ROWS_UPPER : ROWS_LOWER), [shift]);

  const append = (char) => {
    onChange(`${value}${char}`);
    if (shift) setShift(false);
  };

  const backspace = () => {
    onChange(value.slice(0, -1));
  };

  const pressKey = (key) => {
    if (key === "shift") {
      setShift((prev) => !prev);
      return;
    }
    append(key);
  };

  return (
    <div className="touch-text-kb" aria-label="Türk klaviaturası">
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className="touch-text-kb__row">
          {row.map((key) => (
            <button
              key={key}
              type="button"
              className={`touch-text-kb__key${key === "shift" ? " touch-text-kb__key--wide" : ""}${key === "shift" && shift ? " active" : ""}`}
              onClick={() => pressKey(key)}
            >
              {key === "shift" ? "⇧" : key}
            </button>
          ))}
        </div>
      ))}
      <div className="touch-text-kb__row touch-text-kb__row--bottom">
        <button type="button" className="touch-text-kb__key touch-text-kb__key--extra" onClick={() => append("ə")}>
          ə
        </button>
        <button type="button" className="touch-text-kb__key touch-text-kb__key--space" onClick={() => append(" ")}>
          Boşluq
        </button>
        <button type="button" className="touch-text-kb__key touch-text-kb__key--action" onClick={backspace} aria-label="Sil">
          ⌫
        </button>
      </div>
    </div>
  );
}
