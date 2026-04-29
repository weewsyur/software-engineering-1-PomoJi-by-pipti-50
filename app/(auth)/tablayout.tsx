import React, { useEffect, useRef } from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View, Platform, Animated, Easing } from "react-native";
import { Colors } from "@/constants/colors";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

interface TabConfig {
  name: string;
  title: string;
  icon: IoniconName;
  activeIcon: IoniconName;
}

const TABS: TabConfig[] = [
  {
    name: "home",
    title: "Home",
    icon: "home-outline",
    activeIcon: "home",
  },
  {
    name: "timer",
    title: "Timer",
    icon: "timer-outline",
    activeIcon: "timer",
  },
  {
    name: "analytics",
    title: "Analytics",
    icon: "bar-chart-outline",
    activeIcon: "bar-chart",
  },
  {
    name: "profile",
    title: "Profile",
    icon: "person-outline",
    activeIcon: "person",
  },
];

const AnimatedIconWrapper = React.memo(
  ({
    focused,
    color,
    tab,
  }: {
    focused: boolean;
    color: string;
    tab: TabConfig;
  }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const translateYAnim = useRef(new Animated.Value(0)).current;
    const dotSlideAnim = useRef(new Animated.Value(0)).current;
    const dotWidthAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      if (focused) {
        // Reset before animating
        scaleAnim.setValue(0.8);
        translateYAnim.setValue(4);

        // Icon: scale up with overshoot + slight upward nudge
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 4,
            tension: 120,
            useNativeDriver: true,
          }),
          Animated.spring(translateYAnim, {
            toValue: -2,
            friction: 5,
            tension: 100,
            useNativeDriver: true,
          }),
        ]).start(() => {
          // Settle back to center
          Animated.spring(translateYAnim, {
            toValue: 0,
            friction: 6,
            tension: 80,
            useNativeDriver: true,
          }).start();
        });

        // Dot: slide in + expand width
        dotSlideAnim.setValue(0.5);
        dotWidthAnim.setValue(0.5);
        Animated.parallel([
          Animated.timing(dotSlideAnim, {
            toValue: 1,
            duration: 250,
            easing: Easing.out(Easing.exp),
            useNativeDriver: true,
          }),
          Animated.spring(dotWidthAnim, {
            toValue: 1,
            friction: 5,
            tension: 70,
            useNativeDriver: true,
          }),
        ]).start();
      } else {
        // Icon: snap back to normal scale
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
          tension: 80,
          useNativeDriver: true,
        }).start();

        translateYAnim.setValue(0);

        // Dot: shrink out
        Animated.parallel([
          Animated.timing(dotSlideAnim, {
            toValue: 0,
            duration: 150,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(dotWidthAnim, {
            toValue: 0,
            duration: 150,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
        ]).start();
      }
    }, [focused]);

    return (
      <View style={styles.iconWrapper}>
        {/* Animated Icon: pop scale + upward nudge */}
        <Animated.View
          style={{
            transform: [
              { scale: scaleAnim },
              { translateY: translateYAnim },
            ],
          }}
        >
          <Ionicons
            name={focused ? tab.activeIcon : tab.icon}
            size={24}
            color={color}
          />
        </Animated.View>

        {/* Animated Dot: slides up and expands */}
        <Animated.View
          style={[
            styles.activeDot,
            {
              opacity: dotSlideAnim,
              transform: [
                {
                  translateY: dotSlideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [6, 0],
                  }),
                },
                {
                  scaleX: dotWidthAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.2, 1],
                  }),
                },
              ],
            },
          ]}
        />
      </View>
    );
  },
);

AnimatedIconWrapper.displayName = "AnimatedIconWrapper";

export const TabLayout: React.FC = () => {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.tabActive,
        tabBarInactiveTintColor: Colors.tabInactive,
        tabBarShowLabel: false,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused, color }) => (
              <AnimatedIconWrapper focused={focused} color={color} tab={tab} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
};

export default TabLayout;

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.surface,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    height: Platform.OS === "ios" ? 85 : 65,
    paddingBottom: Platform.OS === "ios" ? 20 : 8,
    paddingTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 8,
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  iconWrapper: {
    alignItems: "center",
    justifyContent: "center",
    height: 36,
  },
  activeDot: {
    width: 20,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.primary,
    marginTop: 3,
    position: "absolute",
    bottom: 0,
  },
});