import React from "react";
import { View, Text, StyleSheet, ActivityIndicator, Platform } from "react-native";
import { LucideIcon } from "./LucideIcon";

interface WebPullToRefreshIndicatorProps {
  refreshing: boolean;
  pullDistance: number;
  color?: string;
  pullThreshold?: number;
}

export const WebPullToRefreshIndicator: React.FC<
  WebPullToRefreshIndicatorProps
> = ({ refreshing, pullDistance, color = "#ef4444", pullThreshold = 60 }) => {
  if (Platform.OS !== "web") return null;
  if (!refreshing && pullDistance <= 0) return null;

  const isReady = pullDistance >= pullThreshold;
  const height = refreshing ? 44 : Math.min(pullDistance, 50);

  return (
    <View style={[styles.container, { height }]}>
      {refreshing ? (
        <View style={styles.row}>
          <ActivityIndicator size="small" color={color} />
          <Text style={[styles.text, { color }]}>Refreshing...</Text>
        </View>
      ) : (
        <View style={styles.row}>
          <View
            style={{
              transform: [{ rotate: isReady ? "180deg" : "0deg" }],
            }}
          >
            <LucideIcon name="chevron-down" size={16} color={color} />
          </View>
          <Text
            style={[
              styles.text,
              isReady
                ? { color, fontWeight: "600" }
                : { color: "#888" },
            ]}
          >
            {isReady ? "Release to refresh" : "Pull down to refresh"}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  text: {
    fontSize: 13,
    marginLeft: 6,
  },
});
