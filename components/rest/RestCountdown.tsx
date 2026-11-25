import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import { formatRestCountdown, formatRestEndTime, restRemainingSeconds } from '@/utils/restPeriod';

interface Props {
  restEndTime: unknown;
  onEnded: () => void;
}

export default function RestCountdown({ restEndTime, onEnded }: Props) {
  const [remaining, setRemaining] = useState(() => restRemainingSeconds(restEndTime));
  const endedRef = useRef(false);
  const breath = useRef(new Animated.Value(0)).current;
  const endLabel = formatRestEndTime(restEndTime);

  useEffect(() => {
    const update = () => {
      const next = restRemainingSeconds(restEndTime);
      setRemaining(next);
      if (next <= 0 && !endedRef.current) {
        endedRef.current = true;
        onEnded();
      }
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [restEndTime, onEnded]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(breath, { toValue: 0, duration: 6000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [breath]);

  const scale = breath.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1.12] });

  return (
    <View className="items-center">
      <Animated.View
        className="h-36 w-36 items-center justify-center rounded-full bg-primaryMuted dark:bg-primaryMutedDark"
        style={{ transform: [{ scale }] }}
      >
        <Text className="text-4xl font-bold text-primary dark:text-primaryLightDark" style={{ fontVariant: ['tabular-nums'] }}>
          {formatRestCountdown(remaining)}
        </Text>
      </Animated.View>
      <Text className="font-sans mt-4 text-center text-sm leading-5 text-ink2 dark:text-ink2Dark">
        {endLabel ? `Rest ends around ${endLabel} on this device’s local time.` : 'Your rest period is almost complete.'}
      </Text>
      <Text className="font-sans mt-3 text-center text-base leading-6 text-ink dark:text-inkDark">
        Breathe slowly with the circle. There is no need to rush.
      </Text>
    </View>
  );
}
