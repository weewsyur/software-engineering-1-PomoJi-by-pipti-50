import React, { memo } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Colors } from '@/constants/colors';

interface AvatarProps {
  initials: string;
  size?: number;
  backgroundColor?: string;
  textColor?: string;
  photoUri?: string | null;
}

export const Avatar = memo<AvatarProps>(({
  initials,
  size = 44,
  backgroundColor = Colors.avatarBg,
  textColor = Colors.avatarText,
  photoUri,
}) => {
  const fontSize = size * 0.36;

  return (
    <View
      style={StyleSheet.flatten([
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor,
        },
      ])}
    >
      {photoUri ? (
        <Image
          source={{ uri: photoUri }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          resizeMode="cover"
        />
      ) : (
        <Text style={StyleSheet.flatten([styles.text, { fontSize, color: textColor }])}>
          {initials}
        </Text>
      )}
    </View>
  );
});

Avatar.displayName = 'Avatar';

export default Avatar;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});