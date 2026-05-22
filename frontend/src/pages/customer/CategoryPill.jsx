export default function CategoryPill({ icon, label, count, isActive, onClick }) {
  return (
    <button
      type="button"
      className={`category-pill${isActive ? ' category-pill--active' : ''}`}
      onClick={onClick}
      aria-pressed={isActive}
    >
      <span className="category-pill__icon">{icon}</span>
      <span className="category-pill__label">{label}</span>
      <span className="category-pill__count">{count}</span>
    </button>
  );
}
