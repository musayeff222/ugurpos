const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "."];

export default function TouchNumpad({ value = "", onChange }) {
  const press = (key) => {
    if (key === "C") {
      onChange("");
      return;
    }
    if (key === ".") {
      if (value.includes(".")) return;
      onChange(value ? `${value}.` : "0.");
      return;
    }
    onChange(`${value}${key}`);
  };

  const backspace = () => {
    onChange(value.slice(0, -1));
  };

  return (
    <div className="touch-numpad" aria-label="Rəqəm klaviaturası">
      <div className="touch-numpad__grid">
        {KEYS.map((key) => (
          <button key={key} type="button" className={`touch-numpad__key${key === "C" ? " touch-numpad__key--action" : ""}`} onClick={() => press(key)}>
            {key}
          </button>
        ))}
      </div>
      <button type="button" className="touch-numpad__backspace" onClick={backspace} aria-label="Sil">
        ⌫
      </button>
    </div>
  );
}
