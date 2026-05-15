import React, { useState, useEffect } from 'react';
import {
  View,
  Image,
  StyleSheet,
  ImageSourcePropType,
  TouchableOpacity,
} from 'react-native';
import { Colors } from '@/constants/colors';
import { getFreshDownloadURL, isStoragePath } from '@/utils/imageStorage';

interface ImagePreviewProps {
  sources: ImageSourcePropType[];
  onPress?: (index: number) => void;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({
  sources,
  onPress,
}) => {
  const [imageUrls, setImageUrls] = useState<ImageSourcePropType[]>([]);

  useEffect(() => {
    const loadImageUrls = async () => {
      const urls: ImageSourcePropType[] = [];

      for (const src of sources) {
        if (typeof src === 'string') {
          // If it's a storage path, get fresh download URL
          if (isStoragePath(src)) {
            try {
              const freshUrl = await getFreshDownloadURL(src);
              urls.push({ uri: freshUrl });
            } catch (error) {
              console.error('Failed to get download URL for:', src, error);
              // Fallback to original source
              urls.push({ uri: src });
            }
          } else {
            // It's already a URL or local file URI
            urls.push({ uri: src });
          }
        } else {
          // It's already an ImageSourcePropType object
          urls.push(src);
        }
      }

      setImageUrls(urls);
    };

    loadImageUrls();
  }, [sources]);

  return (
    <View style={styles.container}>
      {imageUrls.map((src, i) => (
        <TouchableOpacity
          key={i}
          style={styles.imageWrapper}
          onPress={() => onPress?.(i)}
          activeOpacity={0.85}
        >
          <Image source={src} style={styles.image} resizeMode="cover" />
        </TouchableOpacity>
      ))}
    </View>
  );
};

export default ImagePreview;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  imageWrapper: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: Colors.border,
    aspectRatio: 1.4,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});