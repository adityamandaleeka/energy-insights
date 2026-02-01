import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface PeakBreakdownProps {
  peakUsage: number;
  offPeakUsage: number;
}

export function PeakBreakdown({ peakUsage, offPeakUsage }: PeakBreakdownProps) {
  const total = peakUsage + offPeakUsage;
  const peakPercent = ((peakUsage / total) * 100).toFixed(1);
  const offPeakPercent = ((offPeakUsage / total) * 100).toFixed(1);

  const data = [
    { name: 'Peak', value: peakUsage, color: '#f97316' },
    { name: 'Off-Peak', value: offPeakUsage, color: '#14b8a6' },
  ];

  return (
    <div className="bg-white border border-stone-200 rounded p-6">
      <h2 className="text-sm font-medium text-stone-700 mb-1">Peak vs Off-Peak</h2>
      <p className="text-xs text-stone-400 mb-4">Usage distribution</p>

      <div className="flex items-center gap-4">
        <div className="w-28 h-28">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={30}
                outerRadius={50}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [`${Number(value).toFixed(0)} kWh`, '']}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex-1 space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-orange-500 rounded-full" />
              <span className="text-stone-600">Peak</span>
            </div>
            <div className="text-right">
              <span className="font-medium text-stone-900">{peakUsage.toFixed(0)} kWh</span>
              <span className="text-stone-400 ml-2">{peakPercent}%</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-teal-500 rounded-full" />
              <span className="text-stone-600">Off-Peak</span>
            </div>
            <div className="text-right">
              <span className="font-medium text-stone-900">{offPeakUsage.toFixed(0)} kWh</span>
              <span className="text-stone-400 ml-2">{offPeakPercent}%</span>
            </div>
          </div>
        </div>
      </div>

      {Number(peakPercent) > 30 && (
        <p className="mt-4 text-xs text-stone-500">
          {peakPercent}% of usage is during peak hours. Shifting some to off-peak could reduce TOU costs.
        </p>
      )}
    </div>
  );
}
