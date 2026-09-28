export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
}) {
  const variantStyles = {
    default: {
      iconBg: 'bg-blue-50 text-blue-600',
      borderAccent: 'border-slate-200',
    },
    danger: {
      iconBg: 'bg-rose-50 text-rose-600',
      borderAccent: 'border-rose-100',
    },
    warning: {
      iconBg: 'bg-amber-50 text-amber-600',
      borderAccent: 'border-amber-100',
    },
    success: {
      iconBg: 'bg-emerald-50 text-emerald-600',
      borderAccent: 'border-emerald-100',
    },
  };

  const style = variantStyles[variant] || variantStyles.default;

  return (
    <div
      className={`p-5 bg-white rounded-xl border ${style.borderAccent} shadow-xs hover:shadow-sm transition-shadow flex flex-col justify-between`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </span>
        {Icon && (
          <div className={`p-2.5 rounded-lg ${style.iconBg}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="mt-4">
        <div className="text-2xl font-bold text-slate-900 tracking-tight font-sans">
          {value}
        </div>
        {subtitle && (
          <p className="mt-1 text-xs text-slate-500 font-medium">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
