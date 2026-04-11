import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface SalesTrendItem {
  day: string;
  total: number;
}

interface SalesTrendChartProps {
  data: SalesTrendItem[];
}

export default function SalesTrendChart({ data }: SalesTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="salesArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#0D9488" stopOpacity={0.28} />
            <stop offset="95%" stopColor="#0D9488" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
        <XAxis dataKey="day" stroke="#64748B" />
        <YAxis stroke="#64748B" />
        <Tooltip
          formatter={(value: number) => `$${value.toFixed(2)}`}
          contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0' }}
        />
        <Area type="monotone" dataKey="total" stroke="#0D9488" strokeWidth={2.5} fill="url(#salesArea)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
