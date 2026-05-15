import React, { memo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Colors } from '@/constants/colors';
import { getFreshDownloadURL, isStoragePath } from '@/utils/imageStorage';

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
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const loadImageUrl = async () => {
      if (!photoUri) {
        setImageUrl(null);
        return;
      }

      // If it's a storage path, get fresh download URL
      if (isStoragePath(photoUri)) {
        try {
          const freshUrl = await getFreshDownloadURL(photoUri);
          setImageUrl(freshUrl);
        } catch (error) {
          console.error('Failed to get download URL for avatar:', photoUri, error);
          setImageUrl(photoUri); // Fallback to original
        }
      } else {
        // It's already a URL or local file URI
        setImageUrl(photoUri);
      }
    };

    loadImageUrl();
  }, [photoUri]);

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
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
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