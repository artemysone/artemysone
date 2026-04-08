import { View, Pressable, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { Project } from '@/types/database';

export const THUMB_GAP = 2;

const GRADIENTS: readonly [string, string][] = [
  ['#F4845F', '#F7B267'],
  ['#7B2FBE', '#4A90D9'],
  ['#2D936C', '#47B5A0'],
  ['#E07A5F', '#F2CC8F'],
  ['#D84797', '#F09ABC'],
  ['#3D5A80', '#98C1D9'],
  ['#CB4B16', '#F5A623'],
  ['#7C6AEF', '#C084FC'],
  ['#0F766E', '#5EEAD4'],
];

function getGradient(id: string): readonly [string, string] {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

export function ProjectThumb({
  project,
  thumbSize,
  onPress,
}: {
  project: Project;
  thumbSize: number;
  onPress?: () => void;
}) {
  const imageUri = project.thumbnail_url
    ?? (project.media_type !== 'video' ? project.media_url : null);

  if (imageUri) {
    return (
      <Pressable style={[styles.thumb, { maxWidth: thumbSize }]} onPress={onPress}>
        <View style={styles.thumbImageWrapper}>
          <Image
            source={{ uri: imageUri }}
            style={styles.thumbImage}
            contentFit="cover"
            transition={200}
          />
          {project.media_type === 'video' && (
            <View style={styles.thumbPlayOverlay}>
              <View style={styles.thumbPlayButton}>
                <Ionicons name="play" size={12} color="#fff" style={styles.thumbPlayIcon} />
              </View>
            </View>
          )}
        </View>
      </Pressable>
    );
  }

  // Video without thumbnail — show first frame on web, gradient on native
  if (project.media_type === 'video' && project.media_url && Platform.OS === 'web') {
    return (
      <Pressable style={[styles.thumb, { maxWidth: thumbSize }]} onPress={onPress}>
        <View style={styles.thumbImageWrapper}>
          {/* @ts-ignore: web-only element — renders first frame as preview */}
          <video
            src={project.media_url}
            muted
            playsInline
            preload="metadata"
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 2 }}
          />
          <View style={styles.thumbPlayOverlay}>
            <View style={styles.thumbPlayButton}>
              <Ionicons name="play" size={12} color="#fff" style={styles.thumbPlayIcon} />
            </View>
          </View>
        </View>
      </Pressable>
    );
  }

  const grad = getGradient(project.id);
  return (
    <Pressable style={[styles.thumb, { maxWidth: thumbSize }]} onPress={onPress}>
      <LinearGradient colors={grad as [string, string]} style={styles.thumbGradient}>
        <View style={styles.thumbUI}>
          <View style={styles.thumbLine} />
          <View style={[styles.thumbLine, { width: '45%' }]} />
          <View style={styles.thumbCircle} />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

export const thumbStyles = StyleSheet.create({
  gridRow: {
    gap: THUMB_GAP,
    paddingHorizontal: THUMB_GAP,
  },
});

const styles = StyleSheet.create({
  thumb: {
    flex: 1,
    aspectRatio: 1,
  },
  thumbImageWrapper: {
    flex: 1,
    position: 'relative',
  },
  thumbImage: {
    flex: 1,
    borderRadius: 2,
  },
  thumbPlayOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbPlayButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbPlayIcon: {
    marginLeft: 1,
  },
  thumbGradient: {
    flex: 1,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbUI: {
    width: '60%',
    gap: 6,
    alignItems: 'flex-start',
  },
  thumbLine: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.35)',
    width: '70%',
  },
  thumbCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginTop: 4,
  },
});
