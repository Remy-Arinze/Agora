'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface ChartData {
  name: string;
  value: number;
  [key: string]: string | number;
}

interface AnalyticsChartProps {
  title: string;
  data: ChartData[];
  type?: 'line' | 'bar' | 'area' | 'pie' | 'donut' | 'horizontal';
  dataKeys: string[];
  colors?: string[];
}

export function AnalyticsChart({
  title,
  data,
  type = 'line',
  dataKeys,
  colors = ['#3b82f6', '#10b981', '#f59e0b'],
}: AnalyticsChartProps) {
  const chartConfig = {
    text: {
      fill: '#94a3b8',
      fontSize: 12,
    },
    grid: {
      stroke: '#1a2f5c',
    },
  };

  const renderChart = () => {
    switch (type) {
      case 'pie':
      case 'donut':
        // For pie/donut charts, transform the data
        // If multiple dataKeys, show distribution between them
        // If single dataKey, show distribution across data points
        let pieData;
        if (dataKeys.length > 1) {
          // Multiple keys: aggregate each key across all data points
          pieData = dataKeys.map((key, index) => {
            const total = data.reduce((sum, item) => sum + (Number(item[key]) || 0), 0);
            return {
              name: key.charAt(0).toUpperCase() + key.slice(1),
              value: total,
              color: colors[index % colors.length],
            };
          });
        } else {
          // Single key: show distribution across data points
          const key = dataKeys[0];
          pieData = data.map((item, index) => ({
            name: item.name || `Item ${index + 1}`,
            value: Number(item[key]) || 0,
            color: colors[index % colors.length],
          }));
        }
        
        return (
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={type === 'donut' ? 80 : 100}
              innerRadius={type === 'donut' ? 40 : 0}
              fill="#8884d8"
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f1b3d',
                border: '1px solid #1a2f5c',
                borderRadius: '8px',
                color: '#94a3b8',
              }}
            />
            <Legend />
          </PieChart>
        );
      case 'horizontal':
        return (
          <BarChart
            layout="vertical"
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1a2f5c" />
            <XAxis type="number" {...chartConfig} />
            <YAxis dataKey="name" type="category" {...chartConfig} width={80} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f1b3d',
                border: '1px solid #1a2f5c',
                borderRadius: '8px',
              }}
            />
            <Legend />
            {dataKeys.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                fill={colors[index % colors.length]}
                radius={[0, 4, 4, 0]}
              />
            ))}
          </BarChart>
        );
      case 'area':
        return (
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a2f5c" />
            <XAxis dataKey="name" {...chartConfig} />
            <YAxis {...chartConfig} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f1b3d',
                border: '1px solid #1a2f5c',
                borderRadius: '8px',
              }}
            />
            <Legend />
            {dataKeys.map((key, index) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colors[index % colors.length]}
                fill={colors[index % colors.length]}
                fillOpacity={0.3}
              />
            ))}
          </AreaChart>
        );
      default:
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a2f5c" />
            <XAxis dataKey="name" {...chartConfig} />
            <YAxis {...chartConfig} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f1b3d',
                border: '1px solid #1a2f5c',
                borderRadius: '8px',
              }}
            />
            <Legend />
            {dataKeys.map((key, index) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colors[index % colors.length]}
                strokeWidth={2}
                dot={{ fill: colors[index % colors.length], r: 4 }}
              />
            ))}
          </LineChart>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          {renderChart()}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

