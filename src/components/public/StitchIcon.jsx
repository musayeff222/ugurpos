export default function StitchIcon({ name, filled = false, className = "", ...props }) {
  return (
    <span
      className={`material-symbols-outlined ${className}`.trim()}
      style={filled ? { fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" } : undefined}
      aria-hidden={props["aria-label"] ? undefined : true}
      {...props}
    >
      {name}
    </span>
  );
}
