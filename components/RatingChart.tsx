import React, { useMemo, useState } from 'react';
import { ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, ReferenceLine, Label } from 'recharts';
import { Perfume } from '../types';

interface RatingChartProps {
  perfumes: Perfume[];
}

const RatingChart: React.FC<RatingChartProps> = ({ perfumes }) => {
  const [isCumulative, setIsCumulative] = useState(false);

  const { data, totalCount, maxValue, mean, median } = useMemo(() => {
    const ratings = perfumes.map(p => p.rating);
    const n = ratings.length;
    if (n === 0) return { data: [], totalCount: 0, maxValue: 0, mean: 0, median: 0 };

    const sum = ratings.reduce((a, b) => a + b, 0);
    const meanVal = sum / n;

    const sorted = [...ratings].sort((a, b) => a - b);
    const mid = Math.floor(n / 2);
    const medianVal = n % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

    const variance = n > 1 
      ? ratings.reduce((sum, r) => sum + Math.pow(r - meanVal, 2), 0) / (n - 1)
      : 0;
    const stdDev = Math.sqrt(variance) || 0.5;
    const h = Math.max(0.3, 1.06 * stdDev * Math.pow(n, -0.2));
    const kConst = 1 / (n * h * Math.sqrt(2 * Math.PI));

    const tempBins: { label: string; ratingVal: number; count: number; kde: number }[] = [];

    for (let i = 0; i <= 20; i++) {
      const x = i / 2;
      
      const count = ratings.filter(r => Math.abs(r - x) < 0.2).length;

      let sumKernel = 0;
      for (let j = 0; j < n; j++) {
        const u = (x - ratings[j]) / h;
        sumKernel += Math.exp(-0.5 * u * u);
      }
      const density = kConst * sumKernel;
      const kdeValue = density * n * 0.5;

      tempBins.push({ 
        label: x.toString(), 
        ratingVal: x,
        count,
        kde: kdeValue
      });
    }

    let runningTotal = 0;
    const finalData = [];
    let maxVal = 0;
    
    for (let i = tempBins.length - 1; i >= 0; i--) {
      const bin = tempBins[i];
      runningTotal += bin.count;
      
      const standardPercent = (bin.count / n) * 100;
      const cumulativePercent = (runningTotal / n) * 100;

      const displayValue = isCumulative ? runningTotal : bin.count;
      if (displayValue > maxVal) maxVal = displayValue;

      finalData.unshift({
        ...bin,
        cumulativeCount: runningTotal,
        displayValue: displayValue,
        displayPercent: isCumulative ? cumulativePercent : standardPercent,
        trend: bin.kde
      });
    }

    return { 
      data: finalData, 
      totalCount: n, 
      maxValue: maxVal, 
      mean: meanVal, 
      median: medianVal 
    };
  }, [perfumes, isCumulative]);

  if (perfumes.length === 0) return null;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      const countVal = isCumulative ? dataPoint.cumulativeCount : dataPoint.count;
      const percentVal = dataPoint.displayPercent;
      const trendVal = dataPoint.trend;

      return (
        <div className="bg-[#1f242b] border border-gray-600 rounded p-2 text-xs shadow-xl z-50">
          <p className="text-parfumo-accent font-bold mb-1 border-b border-gray-700 pb-1">
            {isCumulative ? `Ratings ≥ ${label}` : `Rating: ${label}`}
          </p>
          <div className="space-y-1 text-gray-300">
            <p>
              <span className="text-gray-500">Count:</span> {countVal} 
              <span className="text-gray-500 ml-1">({percentVal.toFixed(1)}%)</span>
            </p>
            {!isCumulative && (
              <p>
                <span className="text-gray-500">Trend:</span> {trendVal.toFixed(1)}
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-[340px] bg-parfumo-card/50 border border-gray-700/50 rounded-lg p-4 mb-8 flex flex-col">
      <div className="flex flex-row justify-between items-start mb-4">
        <h3 className="text-sm uppercase text-gray-500 font-bold tracking-wider shrink-0 mt-1">
          {isCumulative ? "Cumulative Distribution (≥ X)" : "Rating Distribution"}
        </h3>

        <div className="flex items-center space-x-2 text-[10px] font-medium uppercase tracking-wide">
          <span className={!isCumulative ? "text-parfumo-accent" : "text-gray-600"}>Standard</span>
          <button 
            onClick={() => setIsCumulative(!isCumulative)}
            className="relative inline-flex h-5 w-9 items-center rounded-full bg-gray-700 border border-gray-600 focus:outline-none transition-colors duration-200"
          >
            <span
              className={`${
                isCumulative ? 'translate-x-4 bg-parfumo-accent' : 'translate-x-1 bg-gray-400'
              } inline-block h-3 w-3 transform rounded-full transition-transform duration-200`}
            />
          </button>
          <span className={isCumulative ? "text-parfumo-accent" : "text-gray-600"}>Cumulative</span>
        </div>
      </div>

      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
            
            <XAxis 
              dataKey="ratingVal" 
              type="number"
              domain={[-0.6, 10.6]}
              ticks={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
              tick={{ fill: '#9ca3af', fontSize: 10 }} 
              axisLine={{ stroke: '#4b5563' }}
              tickLine={false}
              allowDecimals={false}
            />

            <YAxis 
              yAxisId="left"
              tickCount={6}
              tick={{ fill: '#9ca3af', fontSize: 10 }} 
              axisLine={{ stroke: '#4b5563' }}
              tickLine={false}
              allowDecimals={false}
              domain={[0, maxValue]} 
            />

            <YAxis 
              yAxisId="right"
              orientation="right"
              tickCount={6}
              tick={{ fill: '#6b7280', fontSize: 10 }} 
              axisLine={{ stroke: '#4b5563' }}
              tickLine={false}
              tickFormatter={(val) => {
                 return totalCount > 0 ? `${Math.round((val / totalCount) * 100)}%` : '0%' 
              }}
              domain={[0, maxValue]} 
            />

            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#374151', opacity: 0.4 }} />

            <Bar 
              yAxisId="left"
              dataKey="displayValue" 
              fill="#56cbf9" 
              radius={[2, 2, 0, 0]} 
              maxBarSize={40}
              animationDuration={500}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.displayValue > 0 ? '#56cbf9' : '#3e444d'} 
                  fillOpacity={entry.displayValue > 0 ? (isCumulative ? 0.5 : 0.7) : 0.15} 
                />
              ))}
            </Bar>

            {!isCumulative && (
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="trend" 
                stroke="#ffffff" 
                strokeWidth={2} 
                dot={false}
                activeDot={{ r: 4, fill: 'white', strokeWidth: 0 }}
                isAnimationActive={true}
              />
            )}

            <ReferenceLine x={mean} yAxisId="left" stroke="#22c55e" strokeWidth={1}>
              <Label 
                value={`Avg: ${mean.toFixed(2)}`} 
                position="top" 
                fill="#22c55e" 
                fontSize={11} 
                fontWeight="bold"
                offset={10}
              />
            </ReferenceLine>

            <ReferenceLine x={median} yAxisId="left" stroke="#f59e0b" strokeWidth={1}>
              <Label 
                value={`Med: ${median.toFixed(2)}`} 
                position="top" 
                fill="#f59e0b" 
                fontSize={11} 
                fontWeight="bold"
                offset={10}
                dy={12} 
              />
            </ReferenceLine>

          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default RatingChart;