/**
 * Analytics Chart Components
 * 
 * Reusable chart wrappers for the admin analytics dashboard.
 * Uses Recharts library for responsive, accessible charts.
 */

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { RefreshCw, Download, ChevronDown } from 'lucide-react';
import { useState } from 'react';

// Color palette for charts
export const CHART_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#8B5CF6', // purple
  '#EF4444', // red
  '#14B8A6', // teal
  '#EC4899', // pink
  '#6366F1', // indigo
];

interface ChartContainerProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onExport?: (format: 'csv' | 'pdf') => void;
  height?: number;
  className?: string;
}

export function ChartContainer({
  title,
  description,
  children,
  isLoading = false,
  error = null,
  onRetry,
  onExport,
  height = 300,
  className = '',
}: ChartContainerProps) {
  const [showExportMenu, setShowExportMenu] = useState(false);

  if (isLoading) {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 p-4 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
            {description && <div className="h-3 w-48 bg-gray-100 rounded animate-pulse mt-1" />}
          </div>
        </div>
        <div 
          className="bg-gray-100 rounded animate-pulse"
          style={{ height }}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 p-4 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900">{title}</h3>
            {description && <p className="text-sm text-gray-500">{description}</p>}
          </div>
        </div>
        <div 
          className="flex flex-col items-center justify-center text-center"
          style={{ height }}
        >
          <p className="text-gray-500 mb-2">Failed to load data</p>
          <p className="text-xs text-gray-400 mb-4">{error}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">{title}</h3>
          {description && <p className="text-sm text-gray-500">{description}</p>}
        </div>
        {onExport && (
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
              <ChevronDown className="w-3 h-3" />
            </button>
            {showExportMenu && (
              <div className="absolute right-0 mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                <button
                  onClick={() => {
                    onExport('csv');
                    setShowExportMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  Export CSV
                </button>
                <button
                  onClick={() => {
                    onExport('pdf');
                    setShowExportMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  Export PDF
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <div style={{ height }}>
        {children}
      </div>
    </div>
  );
}

// Time Series Line Chart
interface TimeSeriesChartProps {
  data: { date: string; value: number; [key: string]: string | number }[];
  dataKey?: string;
  color?: string;
  showArea?: boolean;
  formatValue?: (value: number) => string;
}

export function TimeSeriesChart({
  data,
  dataKey = 'value',
  color = CHART_COLORS[0],
  showArea = false,
  formatValue = (v) => v.toLocaleString(),
}: TimeSeriesChartProps) {
  const ChartComponent = showArea ? AreaChart : LineChart;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ChartComponent data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis 
          dataKey="date" 
          tick={{ fontSize: 12, fill: '#6B7280' }}
          tickLine={false}
          axisLine={{ stroke: '#E5E7EB' }}
        />
        <YAxis 
          tick={{ fontSize: 12, fill: '#6B7280' }}
          tickLine={false}
          axisLine={{ stroke: '#E5E7EB' }}
          tickFormatter={formatValue}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
          }}
          formatter={(value) => [formatValue(Number(value) || 0), '']}
        />
        {showArea ? (
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            fill={color}
            fillOpacity={0.1}
            strokeWidth={2}
          />
        ) : (
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            dot={{ fill: color, strokeWidth: 2, r: 3 }}
            activeDot={{ r: 5, strokeWidth: 0 }}
          />
        )}
      </ChartComponent>
    </ResponsiveContainer>
  );
}

// Multi-series Line Chart
interface MultiSeriesChartProps {
  data: { date: string; [key: string]: string | number }[];
  series: { key: string; name: string; color: string }[];
  formatValue?: (value: number) => string;
}

export function MultiSeriesChart({
  data,
  series,
  formatValue = (v) => v.toLocaleString(),
}: MultiSeriesChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis 
          dataKey="date" 
          tick={{ fontSize: 12, fill: '#6B7280' }}
          tickLine={false}
          axisLine={{ stroke: '#E5E7EB' }}
        />
        <YAxis 
          tick={{ fontSize: 12, fill: '#6B7280' }}
          tickLine={false}
          axisLine={{ stroke: '#E5E7EB' }}
          tickFormatter={formatValue}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
          }}
        />
        <Legend />
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={s.color}
            strokeWidth={2}
            dot={{ fill: s.color, strokeWidth: 2, r: 3 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

// Bar Chart
interface BarChartProps {
  data: { name: string; value: number; [key: string]: string | number }[];
  dataKey?: string;
  color?: string;
  horizontal?: boolean;
  formatValue?: (value: number) => string;
}

export function SimpleBarChart({
  data,
  dataKey = 'value',
  color = CHART_COLORS[0],
  horizontal = false,
  formatValue = (v) => v.toLocaleString(),
}: BarChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart 
        data={data} 
        layout={horizontal ? 'vertical' : 'horizontal'}
        margin={{ top: 5, right: 20, left: horizontal ? 80 : 0, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        {horizontal ? (
          <>
            <XAxis 
              type="number"
              tick={{ fontSize: 12, fill: '#6B7280' }}
              tickLine={false}
              axisLine={{ stroke: '#E5E7EB' }}
              tickFormatter={formatValue}
            />
            <YAxis 
              type="category"
              dataKey="name"
              tick={{ fontSize: 12, fill: '#6B7280' }}
              tickLine={false}
              axisLine={{ stroke: '#E5E7EB' }}
              width={80}
            />
          </>
        ) : (
          <>
            <XAxis 
              dataKey="name"
              tick={{ fontSize: 12, fill: '#6B7280' }}
              tickLine={false}
              axisLine={{ stroke: '#E5E7EB' }}
            />
            <YAxis 
              tick={{ fontSize: 12, fill: '#6B7280' }}
              tickLine={false}
              axisLine={{ stroke: '#E5E7EB' }}
              tickFormatter={formatValue}
            />
          </>
        )}
        <Tooltip
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
          }}
          formatter={(value) => [formatValue(Number(value) || 0), '']}
        />
        <Bar 
          dataKey={dataKey} 
          fill={color} 
          radius={[4, 4, 0, 0]}
          maxBarSize={50}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

// Stacked Bar Chart
interface StackedBarChartProps {
  data: { name: string; [key: string]: string | number }[];
  series: { key: string; name: string; color: string }[];
  formatValue?: (value: number) => string;
}

export function StackedBarChart({
  data,
  series,
  formatValue = (v) => v.toLocaleString(),
}: StackedBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis 
          dataKey="name"
          tick={{ fontSize: 12, fill: '#6B7280' }}
          tickLine={false}
          axisLine={{ stroke: '#E5E7EB' }}
        />
        <YAxis 
          tick={{ fontSize: 12, fill: '#6B7280' }}
          tickLine={false}
          axisLine={{ stroke: '#E5E7EB' }}
          tickFormatter={formatValue}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
          }}
        />
        <Legend />
        {series.map((s) => (
          <Bar 
            key={s.key}
            dataKey={s.key} 
            name={s.name}
            stackId="stack"
            fill={s.color} 
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

// Donut/Pie Chart
interface DonutChartProps {
  data: { name: string; value: number }[];
  colors?: string[];
  innerRadius?: number;
  showLabels?: boolean;
}

export function DonutChart({
  data,
  colors = CHART_COLORS,
  innerRadius = 60,
  showLabels = true,
}: DonutChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={80}
          paddingAngle={2}
          dataKey="value"
          label={showLabels ? ({ name, percent }) => 
            `${name} (${((percent || 0) * 100).toFixed(0)}%)` : false}
          labelLine={showLabels}
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
          }}
          formatter={(value, name) => {
            const numValue = Number(value) || 0;
            return [
              `${numValue.toLocaleString()} (${((numValue / total) * 100).toFixed(1)}%)`,
              String(name),
            ];
          }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

// Heat Map (simplified grid-based)
interface HeatMapData {
  x: string;
  y: string;
  value: number;
}

interface HeatMapProps {
  data: HeatMapData[];
  xLabels: string[];
  yLabels: string[];
  colorScale?: [string, string];
  formatValue?: (value: number) => string;
}

export function HeatMap({
  data,
  xLabels,
  yLabels,
  colorScale = ['#E0F2FE', '#1D4ED8'],
  formatValue = (v) => v.toString(),
}: HeatMapProps) {
  const maxValue = Math.max(...data.map(d => d.value), 1);
  
  const getColor = (value: number) => {
    const ratio = value / maxValue;
    // Simple linear interpolation
    const r1 = parseInt(colorScale[0].slice(1, 3), 16);
    const g1 = parseInt(colorScale[0].slice(3, 5), 16);
    const b1 = parseInt(colorScale[0].slice(5, 7), 16);
    const r2 = parseInt(colorScale[1].slice(1, 3), 16);
    const g2 = parseInt(colorScale[1].slice(3, 5), 16);
    const b2 = parseInt(colorScale[1].slice(5, 7), 16);
    
    const r = Math.round(r1 + (r2 - r1) * ratio);
    const g = Math.round(g1 + (g2 - g1) * ratio);
    const b = Math.round(b1 + (b2 - b1) * ratio);
    
    return `rgb(${r},${g},${b})`;
  };

  const getValue = (x: string, y: string) => {
    const cell = data.find(d => d.x === x && d.y === y);
    return cell?.value || 0;
  };

  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full">
        <div className="flex">
          <div className="w-16" /> {/* Spacer for y-labels */}
          {xLabels.map((label) => (
            <div 
              key={label} 
              className="flex-1 min-w-[40px] text-center text-xs text-gray-500 pb-1"
            >
              {label}
            </div>
          ))}
        </div>
        {yLabels.map((yLabel) => (
          <div key={yLabel} className="flex">
            <div className="w-16 text-xs text-gray-500 text-right pr-2 py-2">
              {yLabel}
            </div>
            {xLabels.map((xLabel) => {
              const value = getValue(xLabel, yLabel);
              return (
                <div
                  key={`${xLabel}-${yLabel}`}
                  className="flex-1 min-w-[40px] aspect-square flex items-center justify-center m-0.5 rounded text-xs font-medium"
                  style={{ 
                    backgroundColor: getColor(value),
                    color: value > maxValue * 0.5 ? 'white' : '#1F2937'
                  }}
                  title={`${xLabel}, ${yLabel}: ${formatValue(value)}`}
                >
                  {formatValue(value)}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// Loading skeleton for charts
export function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div 
      className="bg-gray-100 rounded animate-pulse"
      style={{ height }}
    />
  );
}
