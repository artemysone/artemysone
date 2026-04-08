import { View, Text, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/Colors';
import { fonts } from '@/constants/Typography';
import { getGradient } from '@/utils/gradients';
import type { Project } from '@/types/database';

type ProjectMediaPreviewProps = {
  project: Pick<Project, 'id' | 'media_url' | 'media_type' | 'thumbnail_url'> & {
    project_media?: { id: string }[];
  };
  fallback: 'icon' | 'gradient';
  aspectRatio: number;
  playButtonSize: number;
  borderRadius?: number;
};

function PlayOverlay({ size }: { size: number }) {
  return (
    <View style={styles.playOverlay}>
      <View style={[styles.playButton, { width: size, height: size, borderRadius: size / 2 }]}>
        <Ionicons
          name="play"
          size={Math.max(12, Math.round(size / 2.3))}
          color="#fff"
          style={styles.playIcon}
        />
      </View>
    </View>
  );
}

function MediaCountBadge({ count }: { count: number }) {
  if (count <= 1) return null;
  return (
    <View style={styles.mediaBadge}>
      <Ionicons name="images-outline" size={10} color="#fff" />
      <Text style={styles.mediaBadgeText}>{count}</Text>
    </View>
  );
}

export function ProjectMediaPreview({
  project,
  fallback,
  aspectRatio,
  playButtonSize,
  borderRadius = 0,
}: ProjectMediaPreviewProps) {
  const imageUri = project.thumbnail_url ?? (project.media_type !== 'video' ? project.media_url : null);
  const wrapperStyle = [styles.mediaWrapper, { aspectRatio, borderRadius }];
  const mediaCount = project.project_media?.length ?? 0;

  if (imageUri) {
    return (
      <View style={wrapperStyle}>
        <Image source={{ uri: imageUri }} style={styles.media} contentFit="cover" />
        {project.media_type === 'video' ? <PlayOverlay size={playButtonSize} /> : null}
        <MediaCountBadge count={mediaCount} />
      </View>
    );
  }

  if (project.media_type === 'video' && project.media_url) {
    if (Platform.OS === 'web') {
      return (
        <View style={[styles.mediaWrapper, styles.videoFallback, { aspectRatio, borderRadius }]}>
          {/* @ts-ignore: web-only element */}
          <video
            src={project.media_url}
            muted
            playsInline
            preload="metadata"
            style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <PlayOverlay size={playButtonSize} />
        </View>
      );
    }

    if (fallback === 'gradient') {
      const grad = getGradient(project.id);
      return (
        <View style={wrapperStyle}>
          <LinearGradient colors={grad as [string, string]} style={styles.gradient}>
            <View style={styles.thumbUI}>
              <View style={styles.thumbLine} />
              <View style={[styles.thumbLine, { width: '45%' }]} />
              <View style={styles.thumbCircle} />
            </View>
          </LinearGradient>
          <PlayOverlay size={playButtonSize} />
        </View>
      );
    }

    return (
      <View style={[styles.mediaWrapper, styles.iconFallback, styles.videoFallback, { aspectRatio, borderRadius }]}>
        <Ionicons name="image-outline" size={48} color={colors.text.tertiary} />
        <PlayOverlay size={playButtonSize} />
      </View>
    );
  }

  if (fallback === 'gradient') {
    const grad = getGradient(project.id);
    return (
      <View style={wrapperStyle}>
        <LinearGradient colors={grad as [string, string]} style={styles.gradient}>
          <View style={styles.thumbUI}>
            <View style={styles.thumbLine} />
            <View style={[styles.thumbLine, { width: '45%' }]} />
            <View style={styles.thumbCircle} />
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={[styles.mediaWrapper, styles.iconFallback, { aspectRatio, borderRadius }]}>
      <Ionicons name="image-outline" size={48} color={colors.text.tertiary} />
    </View>
  );
}

const styles = StyleSheet.create({
  mediaWrapper: {
    position: 'relative',
    width: '100%',
    overflow: 'hidden',
  },
  media: {
    width: '100%',
    height: '100%',
  },
  iconFallback: {
    backgroundColor: colors.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoFallback: {
    backgroundColor: '#1a1a1a',
  },
  gradient: {
    flex: 1,
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
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    marginLeft: 2,
  },
  mediaBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  mediaBadgeText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    color: '#fff',
  },
});
