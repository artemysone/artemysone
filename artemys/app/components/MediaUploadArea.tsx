import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '@/constants/Colors';
import { fonts } from '@/constants/Typography';

interface MediaUploadAreaProps {
  onPress: () => void;
  selectedUri?: string | null;
  mediaType?: 'image' | 'video';
}

export function MediaUploadArea({ onPress, selectedUri, mediaType }: MediaUploadAreaProps) {
  if (selectedUri) {
    return (
      <Pressable onPress={onPress} style={styles.preview}>
        <Image source={{ uri: selectedUri }} style={styles.previewImage} contentFit="cover" />
        <View style={styles.previewOverlay}>
          <Ionicons name={mediaType === 'video' ? 'videocam' : 'image'} size={20} color="#fff" />
          <Text style={styles.changeText}>Tap to change</Text>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable style={styles.uploadArea} onPress={onPress}>
      <Ionicons name="cloud-upload-outline" size={36} color={colors.text.tertiary} />
      <Text style={styles.uploadText}>Upload a demo video or screenshots</Text>
      <Text style={styles.uploadHint}>MP4, MOV up to 30s · PNG, JPG</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  uploadArea: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 36,
    alignItems: 'center',
    gap: 10,
  },
  uploadText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  uploadHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.text.tertiary,
  },
  preview: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    aspectRatio: 16 / 9,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  changeText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: '#fff',
  },
});
