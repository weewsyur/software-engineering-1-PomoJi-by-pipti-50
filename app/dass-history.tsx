import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import DassHistory from '@/components/dass/DassHistory';
import { useColors } from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';

export default function DassHistoryScreen() {
  const router = useRouter();
  const { user, initializing } = useAuth();
  const { isDarkMode } = useTheme();
  const colors = useColors(isDarkMode);

  if (initializing) return null;
  if (!user) return <Redirect href="/(auth)/welcome" />;

  return (
    <View className="flex-1 bg-canvas dark:bg-canvasDark">
      <View className="flex-row items-center border-b border-line px-2 py-1 dark:border-lineDark">
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          className="min-h-[44px] flex-row items-center gap-1 px-2"
        >
          <ChevronLeft size={22} color={colors.text} />
          <Text className="text-base font-semibold text-ink dark:text-inkDark">Back</Text>
        </Pressable>
        <Text className="flex-1 text-center text-lg font-bold text-ink dark:text-inkDark">
          Readiness history
        </Text>
        <View className="w-16" />
      </View>
      <DassHistory />
    </View>
  );
}
