import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';

interface AvatarProps {
  initials: string;
  size?: number;
  backgroundColor?: string;
  textColor?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  initials,
  size = 44,
  backgroundColor = Colors.avatarBg,
  textColor = Colors.avatarText,
}) => {
  const fontSize = size * 0.36;

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor,
        },
      ]}
    >
      <Text style={[styles.text, { fontSize, color: textColor }]}>
        {initials}
      </Text>
    </View>
  );
};

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