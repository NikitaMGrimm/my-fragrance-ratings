import React, { useMemo, useRef, useState } from 'react';
import { ComposedChart, Scatter, Line, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine, Label } from 'recharts';
import { Perfume } from '../types';

interface PriceScatterChartProps {
  perfumes: Perfume[];
}

const PriceScatterChart: React.FC<PriceScatterChartProps> = ({ perfumes }) => {
  const chartWrapRef = useRef<HTMLDivElement>(null);
  const [hoveredPoint, setHoveredPoint] = useState<any | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  
  const { data, trendLine, hasData, xDomain, xTicks, meanRating, medianPrice } = useMemo(() => {
    const validItems = perfumes
      .filter(p => p.price !== undefined && !isNaN(p.price) && p.price > 0 && p.rating !== undefined)
      .map(p => {
        const jitter = (Math.random() - 0.5) * 0.1;
        return {
          x: p.price!,
          y: p.rating! + jitter,
          realY: p.rating!,
          name: p.name,
          brand: p.brand
        };
      });

    if (validItems.length < 2) {
      return { data: [], trendLine: [], hasData: false, xDomain: ['auto', 'auto'], xTicks: [], meanRating: 0, medianPrice: 0 };
    }

    const n = validItems.length;
    let sumLogX = 0, sumY = 0, sumLogXY = 0, sumLogXLogX = 0;
    
    let minX = Infinity;
    let maxX = -Infinity;

    validItems.forEach(item => {
      const logX = Math.log(item.x);
      sumLogX += logX;
      sumY += item.realY;
      sumLogXY += logX * item.realY;
      sumLogXLogX += logX * logX;
      
      if (item.x < minX) minX = item.x;
      if (item.x > maxX) maxX = item.x;
    });

    const meanLogX = sumLogX / n;
    const meanRating = sumY / n;

    const prices = validItems.map(item => item.x).sort((a, b) => a - b);
    const mid = Math.floor(n / 2);
    const medianPrice = n % 2 !== 0 ? prices[mid] : (prices[mid - 1] + prices[mid]) / 2;

    const slope = (n * sumLogXY - sumLogX * sumY) / (n * sumLogXLogX - sumLogX * sumLogX);
    const intercept = (sumY - slope * sumLogX) / n;

    let sumSqErr = 0;
    let sumSqLogXDiff = 0;
    validItems.forEach(item => {
      const logX = Math.log(item.x);
      const yHat = slope * logX + intercept;
      sumSqErr += Math.pow(item.realY - yHat, 2);
      sumSqLogXDiff += Math.pow(logX - meanLogX, 2);
    });

    const se = Math.sqrt(sumSqErr / (n - 2));
    const tValue = 1.96;

    const domainMin = minX * 0.8;
    const domainMax = maxX * 1.2;

    const trendData = [];
    const numPoints = 50;
    const logMinX = Math.log(domainMin);
    const logMaxX = Math.log(domainMax);
    const step = (logMaxX - logMinX) / (numPoints - 1);

    for (let i = 0; i < numPoints; i++) {
      const logX = logMinX + i * step;
      const x = Math.exp(logX);
      const yHat = slope * logX + intercept;
      
      const seFit = se * Math.sqrt(1 / n + Math.pow(logX - meanLogX, 2) / sumSqLogXDiff);
      const ci = tValue * seFit;

      trendData.push({
        x,
        yHat,
        ciRange: [yHat - ci, yHat + ci]
      });
    }

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
      xTicks: ticks,
      meanRating,
      medianPrice
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

  const updateTooltip = (clientX: number, clientY: number, point: any) => {
    if (!chartWrapRef.current) return;
    const rect = chartWrapRef.current.getBoundingClientRect();
    const x = clientX - rect.left + 12;
    const y = clientY - rect.top - 12;
    setTooltipPos({
      x: Math.max(12, Math.min(x, rect.width - 12)),
      y: Math.max(12, Math.min(y, rect.height - 12))
    });
    setHoveredPoint(point);
  };

  const renderScatterShape = (props: any) => {
    const { cx, cy, payload } = props;
    const onMouseMove = (event: React.MouseEvent<SVGCircleElement>) => {
      updateTooltip(event.clientX, event.clientY, payload);
    };
    const onTouchMove = (event: React.TouchEvent<SVGCircleElement>) => {
      event.preventDefault();
      const touch = event.touches[0] || event.changedTouches[0];
      if (!touch) return;
      updateTooltip(touch.clientX, touch.clientY, payload);
    };

    return (
      <g>
        <circle
          cx={cx}
          cy={cy}
          r={10}
          fill="transparent"
          onMouseEnter={onMouseMove}
          onMouseMove={onMouseMove}
          onClick={onMouseMove}
          onMouseLeave={() => setHoveredPoint(null)}
          onTouchStart={onTouchMove}
          onTouchMove={onTouchMove}
          onTouchEnd={() => setHoveredPoint(null)}
        />
        <circle cx={cx} cy={cy} r={3.5} fill="#56cbf9" fillOpacity={0.75} pointerEvents="none" />
      </g>
    );
  };

  return (
    <div className="w-full h-[340px] bg-parfumo-card/50 border border-gray-700/50 rounded-lg p-4 flex flex-col">
       <div className="flex flex-row justify-between items-start mb-4">
        <h3 className="text-sm uppercase text-gray-500 font-bold tracking-wider shrink-0 mt-1">
          Price vs. Rating
        </h3>
      </div>

      <div ref={chartWrapRef} className="relative flex-1 w-full min-h-0 touch-none overflow-visible" style={{ touchAction: 'none' }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart margin={{ top: 20, right: 95, bottom: 20, left: -10 }}>
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
            
            <Area 
              data={trendLine}
              type="monotone" 
              dataKey="ciRange" 
              fill="#6b7280" 
              stroke="none" 
              fillOpacity={0.3} 
              activeDot={false}
              tooltipType="none"
              style={{ pointerEvents: 'none' }}
              isAnimationActive={false}
            />

            <Line 
              data={trendLine}
              type="monotone" 
              dataKey="yHat" 
              stroke="#9ca3af" 
              strokeWidth={1} 
              strokeDasharray="4 4" 
              dot={false} 
              activeDot={false}
              tooltipType="none"
              style={{ pointerEvents: 'none' }}
              isAnimationActive={false}
            />

            <Scatter
              name="Perfumes"
              data={data}
              dataKey="y"
              fill="#56cbf9"
              fillOpacity={0.7}
              shape={renderScatterShape}
              isAnimationActive={false}
            />

            <ReferenceLine y={meanRating} stroke="#22c55e" strokeWidth={1} strokeOpacity={0.55}>
              <Label 
                content={({ viewBox }: any) => {
                  if (!viewBox) return null;
                  const x = viewBox.x + viewBox.width + 8;
                  const y = Math.max(viewBox.y - 4, 14);
                  return (
                    <text x={x} y={y} fill="#22c55e" fontSize={11} fontWeight="bold" textAnchor="start">
                      <tspan x={x} dy="0">Avg:</tspan>
                      <tspan x={x} dy="12">{meanRating.toFixed(2)}</tspan>
                    </text>
                  );
                }}
              />
            </ReferenceLine>

            <ReferenceLine x={medianPrice} stroke="#f59e0b" strokeWidth={1} strokeOpacity={0.55}>
              <Label 
                value={`Med: ${medianPrice.toFixed(2)}`} 
                position="top" 
                fill="#f59e0b" 
                fontSize={11} 
                fontWeight="bold"
                offset={10}
              />
            </ReferenceLine>

          </ComposedChart>
        </ResponsiveContainer>

        {hoveredPoint && (
          <div
            className="absolute z-50 -translate-y-full rounded border border-gray-600 bg-[#1f242b] p-2 text-xs shadow-xl"
            style={{ left: tooltipPos.x, top: tooltipPos.y }}
          >
            <p className="mb-1 border-b border-gray-700 pb-1 font-bold text-parfumo-accent">
              {hoveredPoint.brand} - {hoveredPoint.name}
            </p>
            <div className="space-y-1 text-gray-300">
              <p>
                <span className="text-gray-500">Rating:</span> {hoveredPoint.realY.toFixed(1)}
              </p>
              <p>
                <span className="text-gray-500">Price:</span> {hoveredPoint.x.toFixed(2)}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PriceScatterChart;
