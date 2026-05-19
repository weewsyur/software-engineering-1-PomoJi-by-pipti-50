import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { RefreshCw, Check } from 'lucide-react-native';
import { offlineManager } from '@/web/offline-manager';

export const SyncStatus: React.FC = () => {
  const [hasPendingOps, setHasPendingOps] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const rotateAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const checkPendingOps = async () => {
      const ops = await offlineManager.getPendingOperations();
      setHasPendingOps(ops.length > 0);
    };

    const unsubscribe = offlineManager.isConnected()
      ? null
      : setInterval(checkPendingOps, 2000);

    checkPendingOps();

    return () => {
      if (unsubscribe) clearInterval(unsubscribe);
    };
  }, []);

  useEffect(() => {
    if (hasPendingOps && !isSyncing) {
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ).start();

      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    } else if (!hasPendingOps && !isSyncing) {
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [hasPendingOps, isSyncing, rotateAnim, scaleAnim]);

  if (!hasPendingOps && !isSyncing) {
    return null;
  }

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <Animated.View
        style={[
          styles.badge,
          {
            transform: [{ rotate: rotation }],
          },
        ]}
      >
        {isSyncing ? (
          <RefreshCw size={16} color="#3b82f6" />
        ) : (
          <RefreshCw size={16} color="#f59e0b" />
        )}
      </Animated.View>

      <Text style={styles.text}>
        {isSyncing ? 'Syncing...' : `${hasPendingOps ? 'Queued' : 'Synced'}`}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute' as any,
    bottom: 20,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    zIndex: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  badge: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4b5563',
  },
});
