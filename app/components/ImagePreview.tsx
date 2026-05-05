import React from 'react';
import {
  View,
  Image,
  StyleSheet,
  ImageSourcePropType,
  TouchableOpacity,
} from 'react-native';
import { Colors } from '@/constants/colors';

interface ImagePreviewProps {
  sources: ImageSourcePropType[];
  onPress?: (index: number) => void;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({
  sources,
  onPress,
}) => {
  return (
    <View style={styles.container}>
      {sources.map((src, i) => (
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