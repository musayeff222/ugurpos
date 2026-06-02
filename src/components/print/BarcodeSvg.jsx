import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

function normalizeBarcode(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 12) return `${digits}0`;
  if (digits.length === 13) return digits;
  if (digits.length > 13) return digits.slice(0, 13);
  return digits.padEnd(8, "0").slice(0, 13);
}

export default function BarcodeSvg({ value, height = 42, width = 1.4, className = "" }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current || !value) return;
    const code = normalizeBarcode(value);
    try {
      JsBarcode(svgRef.current, code, {
        format: code.length === 13 ? "EAN13" : "CODE128",
        width,
        height,
        displayValue: true,
        fontSize: 11,
        margin: 0,
        textMargin: 2,
      });
    } catch {
      JsBarcode(svgRef.current, code, {
        format: "CODE128",
        width,
        height,
        displayValue: true,
        fontSize: 11,
        margin: 0,
      });
    }
  }, [value, height, width]);

  return <svg ref={svgRef} className={className} />;
}
