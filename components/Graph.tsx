"use client";

import { FC, useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Label,
} from 'recharts';
import { create, all } from 'mathjs';
import type { Point, GraphParam, GraphProps } from '@/types/graph';

// Helper to initialize parameter state from props
const initializeParams = (params: GraphParam[] = []) => {
  return params.reduce((acc, p) => {
    acc[p.name] = p.default;
    return acc;
  }, {} as Record<string, number>);
};

const Graph: FC<GraphProps> = ({
  expression,
  data: staticData,
  domain = { xMin: -10, xMax: 10 },
  samples = 200,
  params = [],
  title,
  xLabel,
  yLabel,
  color = '#8884d8',
}) => {
  // State to hold the current values of the interactive sliders
  const [paramValues, setParamValues] = useState<Record<string, number>>(
    initializeParams(params)
  );

  // Memoize the data generation for performance
  const chartData = useMemo<Point[]>(() => {
    // If static data is provided, use it directly.
    if (staticData) {
      return staticData;
    }

    // If no expression, return empty.
    if (!expression) {
      return [];
    }

    try {
      // Create a MathJS instance and add aliases (e.g., ln)
      const math = create(all, {});
      math.import({
        ln: (x: number) => math.log(x),
      }, { override: true });

      // Compile the expression once for efficiency
      const code = math.compile(expression);
      const points: Point[] = [];
      // If expression uses log/ln, ensure xMin > 0 to avoid invalid values
      const usesLog = /\b(log|ln)\s*\(/i.test(expression);
      const xMin = usesLog ? Math.max(domain.xMin, 1e-3) : domain.xMin;
      const xMax = domain.xMax;
      const step = (xMax - xMin) / samples;

      // Generate points by evaluating the expression
      for (let i = 0; i <= samples; i++) {
        const x = xMin + i * step;
        const scope = { ...paramValues, x };
        const y = code.evaluate(scope);

        // Ensure y is a valid number before adding
        if (typeof y === 'number' && isFinite(y)) {
          points.push({ x, y });
        }
      }
      return points;
    } catch (error) {
      console.error('Error evaluating expression:', error);
      return []; // Return empty array on parsing error
    }
  }, [expression, staticData, domain, samples, paramValues]);

  const handleParamChange = (name: string, value: string) => {
    setParamValues((prev) => ({ ...prev, [name]: Number(value) }));
  };

  return (
    <div style={{ width: '100%', padding: '1rem', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
      {title && <h3 style={{ textAlign: 'center' }}>{title}</h3>}
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" dataKey="x" domain={['dataMin', 'dataMax']}>
            {xLabel && <Label value={xLabel} offset={-5} position="insideBottom" />}
          </XAxis>
          <YAxis>
            {yLabel && <Label value={yLabel} angle={-90} position="insideLeft" />}
          </YAxis>
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="y" stroke={color} dot={false} name={expression || 'Data'} />
        </LineChart>
      </ResponsiveContainer>

      {/* Render sliders for interactive parameters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
        {params.map((p) => (
          <div key={p.name}>
            <label>
              {p.name}: {paramValues[p.name]}
              <input
                type="range"
                min={p.min}
                max={p.max}
                step={(p.max - p.min) / 200}
                value={paramValues[p.name]}
                onChange={(e) => handleParamChange(p.name, e.target.value)}
                style={{ width: '100%' }}
              />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Graph;
