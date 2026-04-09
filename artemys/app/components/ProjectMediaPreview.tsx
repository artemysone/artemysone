import { useCallback, useState, type ReactNode } from 'react';
import { View, Text, StyleSheet, Platform, ActivityIndicator, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Video, ResizeMode } from 'expo-av';
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
  overlay?: ReactNode;
  showFormatBadge?: boolean;
  showMediaCountBadge?: boolean;
  showPlayOverlay?: boolean;
  isInlineVideoActive?: boolean;
  onPlayPress?: () => void;
  onPress?: () => void;
};

function PlayOverlay({ size, onPress }: { size: number; onPress?: () => void }) {
  const blurWebFocus = () => {
    if (Platform.OS !== 'web') return;
    const activeElement = globalThis.document?.activeElement;
    if (activeElement instanceof HTMLElement) {
      activeElement.blur();
    }
  };

  const content = (
    <View style={[styles.playButton, { width: size, height: size, borderRadius: size / 2 }]}>
      <Ionicons
        name="play"
        size={Math.max(12, Math.round(size / 2.3))}
        color="#fff"
        style={styles.playIcon}
      />
    </View>
  );

  return (
    <View style={styles.playOverlay} pointerEvents="box-none">
      {onPress ? (
        <Pressable
          onPress={(event) => {
            event.stopPropagation();
            blurWebFocus();
            onPress();
          }}
          hitSlop={12}
        >
          {content}
        </Pressable>
      ) : content}
    </View>
  );
}

function MediaFormatBadge({ label, icon }: { label: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.formatBadge}>
      <Ionicons name={icon} size={11} color="#fff" />
      <Text style={styles.formatBadgeText}>{label}</Text>
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

function InlineVideoPlayer({
  mediaUrl,
  thumbnailUrl,
}: {
  mediaUrl: string;
  thumbnailUrl: string | null;
}) {
  const [videoLoading, setVideoLoading] = useState(Platform.OS !== 'web');
  const [videoError, setVideoError] = useState(false);
  const videoRef = useCallback((el: HTMLVideoElement | null) => {
    if (el && el.readyState >= 2) setVideoLoading(false);
  }, []);

  return (
    <>
      {Platform.OS === 'web' ? (
        // @ts-ignore: web-only element
        <video
          ref={videoRef}
          src={mediaUrl}
          controls
          autoPlay
          playsInline
          poster={thumbnailUrl || undefined}
          style={styles.inlineVideo}
          onLoadedData={() => setVideoLoading(false)}
          onError={() => setVideoError(true)}
        />
      ) : (
        <Video
          source={{ uri: mediaUrl }}
          style={StyleSheet.absoluteFill}
          shouldPlay
          useNativeControls
          resizeMode={ResizeMode.COVER}
          posterSource={thumbnailUrl ? { uri: thumbnailUrl } : undefined}
          usePoster={!!thumbnailUrl}
          onLoad={() => setVideoLoading(false)}
          onError={() => setVideoError(true)}
        />
      )}
      {videoLoading && !videoError ? (
        <View style={styles.videoStateOverlay}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      ) : null}
      {videoError ? (
        <View style={styles.videoStateOverlay}>
          <Ionicons name="videocam-off-outline" size={32} color="#fff" />
          <Text style={styles.videoErrorText}>Video failed to load</Text>
        </View>
      ) : null}
    </>
  );
}

export function ProjectMediaPreview({
  project,
  fallback,
  aspectRatio,
  playButtonSize,
  borderRadius = 0,
  overlay,
  showFormatBadge = true,
  showMediaCountBadge = true,
  showPlayOverlay = true,
  isInlineVideoActive = false,
  onPlayPress,
  onPress,
}: ProjectMediaPreviewProps) {
  const imageUri = project.thumbnail_url ?? (project.media_type !== 'video' ? project.media_url : null);
  const wrapperStyle = [styles.mediaWrapper, { aspectRatio, borderRadius }];
  const mediaCount = project.project_media?.length ?? 0;
  const isVideo = project.media_type === 'video';
  const hasInlineVideo = isVideo && isInlineVideoActive;
  const formatLabel = isVideo ? 'Video' : mediaCount > 1 ? 'Gallery' : 'Image';
  const activeOverlay = hasInlineVideo ? null : overlay;
  const mediaTapTarget = onPress && !hasInlineVideo ? (
    <Pressable style={styles.mediaTapTarget} onPress={onPress} />
  ) : null;
  const formatBadge = showFormatBadge ? (
    <View style={styles.topLeftBadge}>
      <MediaFormatBadge label={formatLabel} icon={isVideo ? 'play' : 'images'} />
    </View>
  ) : null;
  const playOverlay = isVideo && showPlayOverlay && !hasInlineVideo ? (
    <PlayOverlay size={playButtonSize} onPress={onPlayPress} />
  ) : null;

  if (imageUri) {
    return (
      <View style={wrapperStyle}>
        {hasInlineVideo && project.media_url ? (
          <InlineVideoPlayer mediaUrl={project.media_url} thumbnailUrl={project.thumbnail_url} />
        ) : (
          <Image source={{ uri: imageUri }} style={styles.media} contentFit="cover" />
        )}
        {mediaTapTarget}
        {formatBadge}
        {playOverlay}
        {showMediaCountBadge ? <MediaCountBadge count={mediaCount} /> : null}
        {activeOverlay}
      </View>
    );
  }

  if (project.media_type === 'video' && project.media_url) {
    if (hasInlineVideo) {
      return (
        <View style={[styles.mediaWrapper, styles.videoFallback, { aspectRatio, borderRadius }]}>
          <InlineVideoPlayer mediaUrl={project.media_url} thumbnailUrl={project.thumbnail_url} />
          {activeOverlay}
        </View>
      );
    }

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
          {mediaTapTarget}
          {formatBadge}
          {playOverlay}
          {activeOverlay}
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
          {mediaTapTarget}
          {formatBadge}
          {playOverlay}
          {activeOverlay}
        </View>
      );
    }

    return (
      <View style={[styles.mediaWrapper, styles.iconFallback, styles.videoFallback, { aspectRatio, borderRadius }]}>
        <Ionicons name="image-outline" size={48} color={colors.text.tertiary} />
        {mediaTapTarget}
        {formatBadge}
        {playOverlay}
        {activeOverlay}
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
        {mediaTapTarget}
        {formatBadge}
        {activeOverlay}
      </View>
    );
  }

  return (
    <View style={[styles.mediaWrapper, styles.iconFallback, { aspectRatio, borderRadius }]}>
      <Ionicons name="image-outline" size={48} color={colors.text.tertiary} />
      {mediaTapTarget}
      {formatBadge}
      {activeOverlay}
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
  mediaTapTarget: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  inlineVideo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    backgroundColor: '#000',
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
  topLeftBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 2,
  },
  formatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  formatBadgeText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    color: '#fff',
    letterSpacing: 0.2,
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  playButton: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    marginLeft: 2,
  },
  videoStateOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  videoErrorText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: '#fff',
    marginTop: 8,
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
