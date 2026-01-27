import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Dot, ReferenceLine } from 'recharts';
import { format, parseISO, isValid } from 'date-fns';

const CustomDot = (props) => {
  const { cx, cy, payload } = props;
  if (payload.isAnomaly) {
    return (
      <circle cx={cx} cy={cy} r={6} stroke="red" strokeWidth={2} fill="white" />
    );
  }
  return <Dot {...props} r={4} fill="#16a34a" />;
};

const HistoryChart = ({ data, currentEma }) => {
  // Process data to calculate intervals
  const chartData = (data || [])
    .filter(e => e.type === 'WATER')
    .map((e, i, arr) => {
      if (i === 0) return null;
      const prev = parseISO(arr[i-1].timestamp);
      const curr = parseISO(e.timestamp);
      if (!isValid(prev) || !isValid(curr)) return null;
      
      const days = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
      return {
        date: format(curr, 'MMM d'),
        days: parseFloat(days.toFixed(1)),
        isAnomaly: e.isAnomaly
      };
    })
    .filter(Boolean);

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip 
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
          />
          {currentEma && (
            <ReferenceLine 
              y={currentEma} 
              stroke="#94a3b8" 
              strokeDasharray="5 5" 
              label={{ value: `EMA: ${Math.round(currentEma)}d`, position: 'insideBottomRight', fill: '#94a3b8', fontSize: 10, offset: 10 }} 
            />
          )}
          <Line 
            type="monotone" 
            dataKey="days" 
            stroke="#16a34a" 
            strokeWidth={3} 
            dot={<CustomDot />}
            activeDot={{ r: 8 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default HistoryChart;
