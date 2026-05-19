import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { RefreshCw, CheckCircle2, CloudOff } from 'lucide-react-native';

export const SyncingIndicator: React.FC = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(false);
  const [showIndicator, setShowIndicator] = useState(false);
  const slideAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Listen to Firestore sync status
    const handleSyncStart = () => {
      setIsSyncing(true);
      setSyncError(false);
      setShowIndicator(true);
      Animated.timing(slideAnim, {
        toValue: -60,
        duration: 300,
        useNativeDriver: false,
      }).start();
    };

    const handleSyncComplete = () => {
      setIsSyncing(false);
      setTimeout(() => {
        setShowIndicator(false);
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }).start();
      }, 2000);
    };

    const handleSyncError = () => {
      setIsSyncing(false);
      setSyncError(true);
      setShowIndicator(true);
      Animated.timing(slideAnim, {
        toValue: -60,
        duration: 300,
        useNativeDriver: false,
      }).start();
    };

    // Listen to custom events from Firestore
    window.addEventListener('firestore-sync-start', handleSyncStart);
    window.addEventListener('firestore-sync-complete', handleSyncComplete);
    window.addEventListener('firestore-sync-error', handleSyncError);

    return () => {
      window.removeEventListener('firestore-sync-start', handleSyncStart);
      window.removeEventListener('firestore-sync-complete', handleSyncComplete);
      window.removeEventListener('firestore-sync-error', handleSyncError);
    };
  }, [slideAnim]);

  if (!showIndicator) return null;

  return (
    <Animated.View
      style={[
        styles.banner,
        {
          transform: [
            {
              translateY: slideAnim,
            },
          ],
        },
      ]}
    >
      <View style={styles.content}>
        {syncError ? (
          <CloudOff size={18} color="#fff" />
        ) : isSyncing ? (
          <RefreshCw size={18} color="#fff" />
        ) : (
          <CheckCircle2 size={18} color="#fff" />
        )}
        <Text style={styles.text}>
          {syncError ? 'Sync failed - will retry' : isSyncing ? 'Syncing data...' : 'Synced'}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    zIndex: 99,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  text: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
});
