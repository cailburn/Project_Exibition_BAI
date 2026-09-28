export default function LoadingSkeleton() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-64 bg-slate-200 rounded-md"></div>
          <div className="h-4 w-96 bg-slate-200 rounded-md"></div>
        </div>
        <div className="h-9 w-24 bg-slate-200 rounded-lg"></div>
      </div>

      {/* KPI Cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs h-32 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <div className="h-3 w-24 bg-slate-200 rounded"></div>
              <div className="w-8 h-8 rounded-lg bg-slate-200"></div>
            </div>
            <div className="h-8 w-20 bg-slate-200 rounded"></div>
          </div>
        ))}
      </div>

      {/* Donut Charts skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="p-6 bg-white rounded-xl border border-slate-200 shadow-xs h-96 flex flex-col justify-between"
          >
            <div className="h-5 w-40 bg-slate-200 rounded"></div>
            <div className="w-48 h-48 rounded-full bg-slate-100 border-8 border-slate-200 mx-auto"></div>
            <div className="h-4 w-full bg-slate-200 rounded"></div>
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="h-5 w-48 bg-slate-200 rounded"></div>
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 w-full bg-slate-100 rounded"></div>
          ))}
        </div>
      </div>
    </div>
  );
}
