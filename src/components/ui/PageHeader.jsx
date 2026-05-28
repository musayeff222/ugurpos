export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="page-header card">
      <div className="page-header-main">
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </div>
  );
}
