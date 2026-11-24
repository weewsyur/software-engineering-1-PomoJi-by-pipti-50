import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import {
  buildAreaPath,
  buildStrokePath,
} from '@/app/components/AreaChart';
import { severityBands } from '@/utils/dassBands';
import { formatShortDate } from '@/utils/localDate';
import {
  SEVERITY_LABELS,
  SUBSCALE_LABELS,
  type DassSeverity,
  type DassSubscale,
} from '@/constants/dass21';
import { useColors } from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';
import { BAND_FILL_OPACITY, SEVERITY_COLORS } from './severityPalette';

export interface TrendPoint {
  score: number;
  /** YYYY-MM-DD */
  date: string;
  severity: DassSeverity;
}

interface SeverityTrendChartProps {
  subscale: DassSubscale;
  /** Oldest -> newest. */
  points: TrendPoint[];
  width: number;
  maxScore?: number;
}

const SVG_H = 132;
const PAD_LEFT = 30;
const PAD_RIGHT = 10;
const PLOT_TOP = 8;
const PLOT_BOTTOM = 118;
const PLOT_H = PLOT_BOTTOM - PLOT_TOP;
const LABEL_H = 20;
const TOTAL_H = SVG_H + LABEL_H;

/**
 * DASS-21 severity trend chart: score bands behind a smoothed line.
 * With a single point it shows a dashed guide + hint instead of a line.
 */
export function SeverityTrendChart({
  subscale,
  points,
  width,
  maxScore = 42,
}: SeverityTrendChartProps) {
  const { isDarkMode } = useTheme();
  const colors = useColors(isDarkMode);
  const bandOpacity = BAND_FILL_OPACITY[isDarkMode ? 'dark' : 'light'];

  const plotLeft = PAD_LEFT;
  const plotRight = width - PAD_RIGHT;
  const plotW = plotRight - plotLeft;

  const yForScore = (score: number) => PLOT_BOTTOM - (score / maxScore) * PLOT_H;

  const chartPoints = useMemo(() => {
    const n = points.length;
    const xFor = (i: number) =>
      n === 1 ? plotRight - 14 : plotLeft + (i * plotW) / (n - 1);
    return points.map((p, i) => ({
      x: xFor(i),
      y: yForScore(p.score),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, width, maxScore]);

  if (points.length === 0) return null;

  const bands = severityBands(subscale, maxScore);
  const latest = points[points.length - 1];
  const lineColor = SEVERITY_COLORS[latest.severity];
  const strokePath =
    chartPoints.length > 1 ? buildStrokePath(chartPoints) : '';
  const areaPath =
    chartPoints.length > 1 ? buildAreaPath(chartPoints, PLOT_BOTTOM) : '';

  const yTicks = [0, maxScore / 2, maxScore];
  const oldestLabel = formatShortDate(points[0].date);
  const newestLabel = formatShortDate(points[points.length - 1].date);

  return (
    <View
      style={{ width, height: TOTAL_H }}
      accessible
      accessibilityLabel={`${SUBSCALE_LABELS[subscale]} score chart, latest ${latest.score} out of ${maxScore}, ${SEVERITY_LABELS[latest.severity]}`}
    >
      <Svg width={width} height={SVG_H}>
        {bands.map((band) => {
          const top = yForScore(band.max);
          const h = Math.max(0, yForScore(band.min) - top);
          return (
            <Rect
              key={band.severity}
              x={plotLeft}
              y={top}
              width={plotW}
              height={h}
              fill={SEVERITY_COLORS[band.severity]}
              fillOpacity={bandOpacity}
            />
          );
        })}

        {yTicks.map((tick) => (
          <Line
            key={tick}
            x1={plotLeft}
            x2={plotRight}
            y1={yForScore(tick)}
            y2={yForScore(tick)}
            stroke={colors.border}
            strokeWidth={1}
          />
        ))}

        {chartPoints.length > 1 && (
          <>
            <Path d={areaPath} fill={lineColor} fillOpacity={isDarkMode ? 0.14 : 0.1} />
            <Path
              d={strokePath}
              fill="none"
              stroke={lineColor}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        )}

        {points.length === 1 && (
          <>
            <Line
              x1={plotLeft}
              x2={plotRight}
              y1={chartPoints[0].y}
              y2={chartPoints[0].y}
              stroke={lineColor}
              strokeOpacity={0.45}
              strokeWidth={1.5}
              strokeDasharray="5 5"
            />
            <Circle
              cx={chartPoints[0].x}
              cy={chartPoints[0].y}
              r={5}
              fill={lineColor}
              stroke={colors.surface}
              strokeWidth={2.5}
            />
          </>
        )}

        {points.length > 1 &&
          chartPoints.map((p, i) => (
            <Circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={4}
              fill={SEVERITY_COLORS[points[i].severity]}
              stroke={colors.surface}
              strokeWidth={1.5}
            />
          ))}
      </Svg>

      {yTicks.map((tick) => (
        <Text
          key={tick}
          style={{
            position: 'absolute',
            left: 0,
            width: PAD_LEFT - 6,
            top: yForScore(tick) - 7,
            fontSize: 10,
            lineHeight: 14,
            textAlign: 'right',
            color: colors.textMuted,
            fontVariant: ['tabular-nums'],
          }}
        >
          {tick}
        </Text>
      ))}

      {points.length === 1 ? (
        <Text
          style={{
            position: 'absolute',
            left: chartPoints[0].x - 36,
            top: SVG_H + 2,
            width: 72,
            fontSize: 11,
            lineHeight: 15,
            textAlign: 'center',
            color: colors.textSecondary,
          }}
          numberOfLines={1}
        >
          {oldestLabel}
        </Text>
      ) : (
        <>
          <Text
            style={{
              position: 'absolute',
              left: plotLeft - 4,
              top: SVG_H + 2,
              width: 72,
              fontSize: 11,
              lineHeight: 15,
              color: colors.textSecondary,
            }}
            numberOfLines={1}
          >
            {oldestLabel}
          </Text>
          <Text
            style={{
              position: 'absolute',
              right: PAD_RIGHT - 4,
              top: SVG_H + 2,
              width: 72,
              fontSize: 11,
              lineHeight: 15,
              textAlign: 'right',
              color: colors.textSecondary,
            }}
            numberOfLines={1}
          >
            {newestLabel}
          </Text>
        </>
      )}
    </View>
  );
}

export default SeverityTrendChart;
