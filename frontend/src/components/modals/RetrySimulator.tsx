import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Activity, Clock } from 'lucide-react';

interface RetrySimulatorProps {
  strategy: 'FIXED_DELAY' | 'LINEAR_BACKOFF' | 'EXPONENTIAL_BACKOFF';
  maxAttempts: number;
  delaySeconds: number;
  backoffFactor?: number;
  maxDelaySeconds?: number | null;
  jitter?: boolean;
}

export function RetrySimulator({
  strategy,
  maxAttempts,
  delaySeconds,
  backoffFactor = 2,
  maxDelaySeconds,
  jitter = false
}: RetrySimulatorProps) {
  
  const simulationData = useMemo(() => {
    const data = [];
    let totalElapsed = 0;

    for (let attempt = 1; attempt <= Math.min(maxAttempts, 20); attempt++) { // cap at 20 for viz
      let delay = 0;
      
      if (strategy === 'FIXED_DELAY') {
        delay = delaySeconds;
      } else if (strategy === 'LINEAR_BACKOFF') {
        delay = delaySeconds * attempt;
      } else if (strategy === 'EXPONENTIAL_BACKOFF') {
        delay = delaySeconds * Math.pow(backoffFactor, attempt - 1);
      }

      if (maxDelaySeconds && delay > maxDelaySeconds) {
        delay = maxDelaySeconds;
      }

      // We just represent jitter bounds in the table, don't randomize chart to keep it stable
      const jitterMin = jitter ? Math.max(0, delay * 0.5) : delay;
      const jitterMax = jitter ? delay * 1.5 : delay;
      
      totalElapsed += delay;

      data.push({
        attempt,
        delay,
        jitterMin,
        jitterMax,
        totalElapsed,
        displayDelay: formatTime(delay)
      });
    }

    return data;
  }, [strategy, maxAttempts, delaySeconds, backoffFactor, maxDelaySeconds, jitter]);

  function formatTime(seconds: number) {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${(seconds / 3600).toFixed(1)}h`;
  }

  const finalTotal = simulationData.length > 0 ? simulationData[simulationData.length - 1].totalElapsed : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <div className="text-slate-400">Total Retry Time:</div>
        <div className="font-medium text-white flex items-center gap-1">
          <Clock size={14} className="text-sky-400" />
          {formatTime(finalTotal)}
        </div>
      </div>

      <div className="h-48 w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={simulationData} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis 
              dataKey="attempt" 
              stroke="#64748b" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false}
              tickFormatter={(val: number | string) => `Try ${val}`}
            />
            <YAxis 
              stroke="#64748b" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false}
              tickFormatter={(val: number) => formatTime(val)}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
              itemStyle={{ color: '#38bdf8' }}
              labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
              formatter={(value: any) => [formatTime(value as number), 'Delay']}
              labelFormatter={(label: any) => `Attempt ${label}`}
            />
            <Line 
              type="monotone" 
              dataKey="delay" 
              stroke="#0ea5e9" 
              strokeWidth={2} 
              dot={{ fill: '#0ea5e9', r: 4 }} 
              activeDot={{ r: 6, fill: '#38bdf8' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 bg-slate-950/50 rounded-xl border border-white/5 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-900/50 text-slate-400 text-xs uppercase font-medium">
            <tr>
              <th className="px-4 py-3">Attempt</th>
              <th className="px-4 py-3">Delay</th>
              {jitter && <th className="px-4 py-3">Jitter Range</th>}
              <th className="px-4 py-3 text-right">Cumulative</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {simulationData.slice(0, 5).map((row) => (
              <tr key={row.attempt}>
                <td className="px-4 py-3 text-slate-300">#{row.attempt}</td>
                <td className="px-4 py-3 text-white font-mono">{formatTime(row.delay)}</td>
                {jitter && (
                  <td className="px-4 py-3 text-slate-400 font-mono text-xs">
                    {formatTime(row.jitterMin)} - {formatTime(row.jitterMax)}
                  </td>
                )}
                <td className="px-4 py-3 text-right text-slate-500 font-mono">
                  {formatTime(row.totalElapsed)}
                </td>
              </tr>
            ))}
            {simulationData.length > 5 && (
              <tr>
                <td colSpan={jitter ? 4 : 3} className="px-4 py-3 text-center text-slate-500 italic text-xs">
                  ... and {simulationData.length - 5} more attempts
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
