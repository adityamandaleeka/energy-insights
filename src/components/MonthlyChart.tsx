import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { MonthlyStats } from '../types';

interface MonthlyChartProps {
  monthlyStats: MonthlyStats[];
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatMonth(monthStr: string): string {
  const [, month] = monthStr.split('-');
  return MONTH_NAMES[parseInt(month, 10) - 1] || monthStr;
}

export function MonthlyChart({ monthlyStats }: MonthlyChartProps) {
  const data = monthlyStats.map((stat) => ({
    month: formatMonth(stat.month),
    usage: Math.round(stat.totalUsage),
    flatCost: stat.flatCost,
    touCost: stat.touCost,
    peak: Math.round(stat.peakUsage),
    offPeak: Math.round(stat.offPeakUsage),
  }));

  return (
    <div className="bg-white border border-stone-200 rounded p-6">
      <h2 className="text-sm font-medium text-stone-700 mb-1">Monthly Usage</h2>
      <p className="text-xs text-stone-400 mb-4">Peak vs off-peak by month</p>

      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#78716c' }} stroke="#d6d3d1" />
            <YAxis tick={{ fontSize: 11, fill: '#78716c' }} stroke="#d6d3d1" unit=" kWh" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e7e5e4',
                borderRadius: '4px',
                fontSize: '12px',
              }}
              formatter={(value, name) => [
                `${Number(value).toFixed(0)} kWh`,
                name === 'peak' ? 'Peak' : 'Off-Peak',
              ]}
            />
            <Area
              type="monotone"
              dataKey="offPeak"
              stackId="1"
              stroke="#14b8a6"
              fill="#ccfbf1"
              name="offPeak"
            />
            <Area
              type="monotone"
              dataKey="peak"
              stackId="1"
              stroke="#f97316"
              fill="#ffedd5"
              name="peak"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex justify-end gap-4 mt-3 text-xs text-stone-500">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-orange-200" />
          <span>Peak</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-teal-100" />
          <span>Off-Peak</span>
        </div>
      </div>
    </div>
  );
}
