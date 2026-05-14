import React, { useMemo, memo } from "react";
import Svg, { Path, Defs, LinearGradient, Stop, Circle } from "react-native-svg";
import { Colors } from "../../constants/colors";

export interface DailyPointByDay {
  totalTime: number;
  day: string;
}

export interface DailyPointByWeek {
  totalTime: number;
  weekLabel: string;
}

export interface DailyPointByMonth {
  totalTime: number;
  monthLabel: string;
}

export type DailyPoint = DailyPointByDay | DailyPointByWeek | DailyPointByMonth;

interface ChartPoint {
  x: number;
  y: number;
}

interface AreaChartProps {
  data: DailyPoint[];
  maxValue: number;
  width: number;
}

export const CHART_HEIGHT = 140;
export const LABEL_AREA = 22;
export const CHART_PAD_X = 16;

function buildStrokePath(points: ChartPoint[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) {
    const p = points[0];
    return `M ${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
  }

  const n = points.length;
  const dx: number[] = [];
  const dy: number[] = [];
  const slope: number[] = [];

  for (let i = 0; i < n - 1; i++) {
    dx.push(points[i + 1].x - points[i].x);
    dy.push(points[i + 1].y - points[i].y);
    slope.push(dy[i] / dx[i]);
  }

  const m: number[] = new Array(n).fill(0);
  m[0] = slope[0];
  m[n - 1] = slope[n - 2];
  for (let i = 1; i < n - 1; i++) {
    if (slope[i - 1] * slope[i] <= 0) {
      m[i] = 0;
    } else {
      m[i] = (slope[i - 1] + slope[i]) / 2;
    }
  }

  for (let i = 0; i < n - 1; i++) {
    if (Math.abs(slope[i]) < 1e-9) {
      m[i] = 0;
      m[i + 1] = 0;
    } else {
      const alpha = m[i] / slope[i];
      const beta = m[i + 1] / slope[i];
      const mag = alpha * alpha + beta * beta;
      if (mag > 9) {
        const t = 3 / Math.sqrt(mag);
        m[i] = t * alpha * slope[i];
        m[i + 1] = t * beta * slope[i];
      }
    }
  }

  let linePath = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let i = 0; i < n - 1; i++) {
    const cp1x = points[i].x + dx[i] / 3;
    const cp1y = points[i].y + (m[i] * dx[i]) / 3;
    const cp2x = points[i + 1].x - dx[i] / 3;
    const cp2y = points[i + 1].y - (m[i + 1] * dx[i]) / 3;
    linePath += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${points[i + 1].x.toFixed(2)} ${points[i + 1].y.toFixed(2)}`;
  }
  return linePath;
}

function buildAreaPath(points: ChartPoint[], bottomY: number): string {
  if (points.length === 0) return "";
  if (points.length === 1) {
    const p = points[0];
    return `M ${p.x} ${bottomY} L ${p.x} ${p.y} L ${p.x} ${bottomY} Z`;
  }

  const strokePath = buildStrokePath(points);
  return (
    strokePath +
    ` L ${points[points.length - 1].x.toFixed(2)} ${bottomY.toFixed(2)}` +
    ` L ${points[0].x.toFixed(2)} ${bottomY.toFixed(2)}` +
    " Z"
  );
}

export const AreaChart = memo<AreaChartProps>(({ data, maxValue, width }: AreaChartProps) => {
  const svgH = CHART_HEIGHT + LABEL_AREA;
  const chartH = CHART_HEIGHT - 12;
  const bottomY = chartH;
  const allZero = maxValue <= 0 || data.every((d) => d.totalTime === 0);

  const points: ChartPoint[] = useMemo(() => {
    if (data.length === 0) return [];
    const step = data.length === 1 ? 0 : (width - CHART_PAD_X * 2) / (data.length - 1);
    return data.map((d, i) => {
      const norm = allZero ? 0 : d.totalTime / maxValue;
      const y = allZero ? bottomY : bottomY - norm * chartH * 0.8;
      const x = CHART_PAD_X + i * step;
      return { x, y };
    });
  }, [data, maxValue, width, allZero, chartH, bottomY]);

  if (points.length === 0) return null;

  const areaPath = buildAreaPath(points, bottomY);
  const strokePath = buildStrokePath(points);

  return (
    <Svg width={width} height={svgH}>
      <Defs>
        <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={Colors.primary} stopOpacity="0.30" />
          <Stop offset="1" stopColor={Colors.primary} stopOpacity="0" />
        </LinearGradient>
      </Defs>

      <Path d={areaPath} fill="url(#areaGrad)" />
      <Path
        d={strokePath}
        fill="none"
        stroke={Colors.primary}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={3.5} fill={Colors.primary} />
      ))}
    </Svg>
  );
});

AreaChart.displayName = 'AreaChart';

export default AreaChart;
