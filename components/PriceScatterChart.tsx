import React, { useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Perfume } from '../types';

interface PriceScatterChartProps {
  perfumes: Perfume[];
}

const PriceScatterChart: React.FC<PriceScatterChartProps> = ({ perfumes }) => {
  
  const { data, trendLine, hasData, xDomain, xTicks } = useMemo(() => {
    const validItems = perfumes
      .filter(p => p.price !== undefined && !isNaN(p.price) && p.price > 0 && p.rating !== undefined)
      .map(p => ({
        x: p.price!,
        y: p.rating,
        name: p.name,
        brand: p.brand
      }));

    if (validItems.length < 2) {
      return { data: [], trendLine: [], hasData: false, xDomain: ['auto', 'auto'], xTicks: [] };
    }

    const n = validItems.length;
    let sumLogX = 0, sumY = 0, sumLogXY = 0, sumLogXLogX = 0;
    
    let minX = Infinity;
    let maxX = -Infinity;

    validItems.forEach(item => {
      const logX = Math.log(item.x);
      sumLogX += logX;
      sumY += item.y;
      sumLogXY += logX * item.y;
      sumLogXLogX += logX * logX;
      
      if (item.x < minX) minX = item.x;
      if (item.x > maxX) maxX = item.x;
    });

    const slope = (n * sumLogXY - sumLogX * sumY) / (n * sumLogXLogX - sumLogX * sumLogX);
    const intercept = (sumY - slope * sumLogX) / n;

    const trendData = [
      { x: minX, y: slope * Math.log(minX) + intercept },
      { x: maxX, y: slope * Math.log(maxX) + intercept }
    ];

    const domainMin = minX * 0.8;
    const domainMax = maxX * 1.2;

    const ticks: number[] = [];
    const minPower = Math.floor(Math.log10(domainMin));
    const maxPower = Math.ceil(Math.log10(domainMax));

    for (let p = minPower; p <= maxPower; p++) {
        const base = Math.pow(10, p);
        [1, 2, 5].forEach(mult => {
            const val = base * mult;
            if (val >= domainMin && val <= domainMax) {
                ticks.push(val);
            }
        });
    }
    ticks.sort((a, b) => a - b);

    return { 
      data: validItems, 
      trendLine: trendData,
      hasData: true,
      xDomain: [domainMin, domainMax],
      xTicks: ticks
    };
  }, [perfumes]);

  if (!hasData) {
    return (
      <div className="w-full h-12 bg-parfumo-card/30 border border-gray-800 rounded-lg flex items-center justify-center mb-8">
        <p className="text-xs text-gray-600 font-mono">
            Missing 'Price' data for Price/Rating scatter plot.
        </p>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      
      if (!dataPoint.name) return null;

      return (
        <div className="bg-[#1f242b] border border-gray-600 rounded p-2 text-xs shadow-xl z-50">
          <p className="text-parfumo-accent font-bold mb-1 border-b border-gray-700 pb-1">
            {dataPoint.brand} - {dataPoint.name}
          </p>
          <div className="space-y-1 text-gray-300">
            <p>
              <span className="text-gray-500">Rating:</span> {dataPoint.y.toFixed(1)}
            </p>
            <p>
              <span className="text-gray-500">Price:</span> {dataPoint.x.toFixed(2)}
            </p>
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
          Price vs. Rating
        </h3>
      </div>

      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            
            <XAxis 
              type="number" 
              dataKey="x" 
              name="Price" 
              scale="log"
              domain={xDomain as [number, number]}
              ticks={xTicks}
              tick={{ fill: '#9ca3af', fontSize: 10 }} 
              axisLine={{ stroke: '#4b5563' }}
              tickLine={false}
              label={{ value: 'Price (Log Scale)', position: 'bottom', fill: '#6b7280', fontSize: 10, offset: 0 }}
              tickFormatter={(val) => Number(val).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            />
            
            <YAxis 
              type="number" 
              dataKey="y" 
              name="Rating" 
              domain={[-0.5, 10.5]}
              tick={{ fill: '#9ca3af', fontSize: 10 }} 
              axisLine={{ stroke: '#4b5563' }}
              tickLine={false}
              ticks={[0, 2, 4, 6, 8, 10]}
            />
            
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
            <Scatter name="Perfumes" data={data} fill="#56cbf9" fillOpacity={0.6}>
                 {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill="#56cbf9" />
                 ))}
            </Scatter>

            <Scatter 
                name="Trend" 
                data={trendLine} 
                line={{ stroke: '#9ca3af', strokeWidth: 1, strokeDasharray: '4 4', opacity: 0.5 }} 
                shape={() => <></>} 
                legendType="none"
                activeShape={() => <></>}
            />

          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PriceScatterChart;