import { useState, useRef, useCallback } from "react";
import {
  NativeSyntheticEvent,
  NativeScrollEvent,
  GestureResponderEvent,
  Platform,
} from "react-native";

interface UseWebPullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  refreshing: boolean;
  pullThreshold?: number;
}

export function useWebPullToRefresh({
  onRefresh,
  refreshing,
  pullThreshold = 60,
}: UseWebPullToRefreshOptions) {
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartY = useRef<number | null>(null);
  const scrollY = useRef(0);
  const isRefreshingRef = useRef(refreshing);
  isRefreshingRef.current = refreshing;

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollY.current = e.nativeEvent.contentOffset.y;
      if (scrollY.current > 0 && pullDistance > 0) {
        setPullDistance(0);
      }
    },
    [pullDistance],
  );

  const onTouchStart = useCallback(
    (e: GestureResponderEvent) => {
      if (Platform.OS !== "web" || isRefreshingRef.current) return;
      if (scrollY.current <= 0) {
        touchStartY.current = e.nativeEvent.pageY;
      } else {
        touchStartY.current = null;
      }
    },
    [],
  );

  const onTouchMove = useCallback(
    (e: GestureResponderEvent) => {
      if (
        Platform.OS !== "web" ||
        touchStartY.current === null ||
        isRefreshingRef.current
      )
        return;

      if (scrollY.current <= 0) {
        const currentY = e.nativeEvent.pageY;
        const diff = currentY - touchStartY.current;

        if (diff > 0) {
          const damped = Math.min(diff * 0.45, 80);
          setPullDistance(damped);
        } else {
          setPullDistance(0);
        }
      } else {
        touchStartY.current = null;
        setPullDistance(0);
      }
    },
    [],
  );

  const onTouchEnd = useCallback(() => {
    if (Platform.OS !== "web") return;

    if (
      touchStartY.current !== null &&
      pullDistance >= pullThreshold &&
      !isRefreshingRef.current
    ) {
      onRefresh();
    }

    touchStartY.current = null;
    setPullDistance(0);
  }, [pullDistance, pullThreshold, onRefresh]);

  const webScrollProps =
    Platform.OS === "web"
      ? {
          onScroll,
          onTouchStart,
          onTouchMove,
          onTouchEnd,
          onTouchCancel: onTouchEnd,
          scrollEventThrottle: 16,
        }
      : {};

  return {
    pullDistance,
    isReadyToRefresh: pullDistance >= pullThreshold,
    webScrollProps,
  };
}
