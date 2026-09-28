import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export default function DonutChartCard({
  title,
  subtitle,
  data = [],
  colorMap = {},
  defaultColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'],
  centerLabel = 'Total',
}) {
  const total = data.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
  const hasData = total > 0;

  const getColor = (name, index) => {
    if (colorMap[name]) return colorMap[name];
    return defaultColors[index % defaultColors.length];
  };

  return (
    <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900 tracking-tight">
            {title}
          </h3>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
            {total} {centerLabel}
          </span>
        </div>
        {subtitle && (
          <p className="text-xs text-slate-500 mt-1">
            {subtitle}
          </p>
        )}
      </div>

      <div className="my-4">
        {hasData ? (
          <div className="relative h-60 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={92}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={`cell-${entry.name}-${index}`}
                      fill={getColor(entry.name, index)}
                      stroke="#ffffff"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val, name) => [
                    `${val} (${total > 0 ? Math.round((val / total) * 100) : 0}%)`,
                    name,
                  ]}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    borderColor: '#e2e8f0',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Inner Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-slate-900 leading-none">
                {total}
              </span>
              <span className="text-[11px] font-medium text-slate-500 mt-1 uppercase tracking-wider">
                {centerLabel}
              </span>
            </div>
          </div>
        ) : (
          <div className="h-60 flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-lg text-center p-6">
            <p className="text-sm font-medium text-slate-500">No records found</p>
            <p className="text-xs text-slate-400 mt-1">
              Data will appear once records are created.
            </p>
          </div>
        )}
      </div>

      {/* Legend list */}
      {hasData && (
        <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
          {data.map((item, index) => {
            const color = getColor(item.name, index);
            const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0;
            return (
              <div key={item.name} className="flex items-center justify-between py-0.5">
                <div className="flex items-center gap-2 truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-slate-600 truncate font-medium">
                    {item.name}
                  </span>
                </div>
                <span className="font-semibold text-slate-800 ml-2">
                  {item.value}{' '}
                  <span className="text-[10px] text-slate-400 font-normal">
                    ({percentage}%)
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
