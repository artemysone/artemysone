import { useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
  Platform,
  Pressable,
  Text,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/Colors';
import { fonts } from '@/constants/Typography';
import { getGradient } from '@/utils/gradients';
import type { Project, ProjectMedia } from '@/types/database';

interface MediaCarouselProps {
  items: ProjectMedia[];
  fallbackProject?: Pick<Project, 'id' | 'media_url' | 'media_type' | 'thumbnail_url'>;
  aspectRatio?: number;
}

interface MediaItemProps {
  item: { media_url: string; media_type: 'image' | 'video'; thumbnail_url: string | null };
  width: number;
  aspectRatio: number;
}

function MediaItem({ item, width, aspectRatio }: MediaItemProps) {
  const [videoLoading, setVideoLoading] = useState(Platform.OS !== 'web');
  const [videoError, setVideoError] = useState(false);
  const videoRef = useCallback((el: HTMLVideoElement | null) => {
    if (el && el.readyState >= 2) setVideoLoading(false);
  }, []);

  const itemStyle = { width, aspectRatio };

  if (item.media_type === 'video') {
    return (
      <View style={[styles.mediaItem, itemStyle]}>
        {Platform.OS === 'web' ? (
          // @ts-ignore: web-only element
          <video
            ref={videoRef}
            src={item.media_url}
            controls
            playsInline
            poster={item.thumbnail_url || undefined}
            style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: '#000' }}
            onLoadedData={() => setVideoLoading(false)}
            onError={() => setVideoError(true)}
          />
        ) : (
          <Video
            source={{ uri: item.media_url }}
            style={StyleSheet.absoluteFill}
            useNativeControls
            resizeMode={ResizeMode.CONTAIN}
            posterSource={item.thumbnail_url ? { uri: item.thumbnail_url } : undefined}
            usePoster={!!item.thumbnail_url}
            onLoad={() => setVideoLoading(false)}
            onError={() => setVideoError(true)}
          />
        )}
        {videoLoading && !videoError && (
          <View style={styles.mediaOverlay}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        )}
        {videoError && (
          <View style={styles.mediaOverlay}>
            <Ionicons name="videocam-off-outline" size={32} color={colors.text.tertiary} />
            <Text style={styles.videoErrorText}>Video failed to load</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <Image
      source={{ uri: item.media_url }}
      style={[styles.mediaItem, itemStyle]}
      contentFit="cover"
    />
  );
}

export function MediaCarousel({ items, fallbackProject, aspectRatio = 4 / 3 }: MediaCarouselProps) {
  const { width: screenWidth } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);

  const displayItems = useMemo(() => {
    if (items.length > 0) {
      return items.map((m) => ({
        id: m.id,
        media_url: m.media_url,
        media_type: m.media_type as 'image' | 'video',
        thumbnail_url: m.thumbnail_url,
      }));
    }
    if (fallbackProject?.media_url) {
      return [{
        id: fallbackProject.id,
        media_url: fallbackProject.media_url,
        media_type: fallbackProject.media_type,
        thumbnail_url: fallbackProject.thumbnail_url,
      }];
    }
    return [];
  }, [items, fallbackProject]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: { index: number | null }[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setActiveIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  // No media at all — gradient placeholder
  if (displayItems.length === 0) {
    const grad = fallbackProject ? getGradient(fallbackProject.id) : (['#E07A5F', '#F2CC8F'] as const);
    return (
      <View style={[styles.placeholder, { aspectRatio }]}>
        <LinearGradient colors={grad as [string, string]} style={styles.gradientFill}>
          <Ionicons name="image-outline" size={48} color="rgba(255,255,255,0.5)" />
        </LinearGradient>
      </View>
    );
  }

  // Single item — no carousel needed
  if (displayItems.length === 1) {
    return (
      <MediaItem
        item={displayItems[0]}
        width={screenWidth}
        aspectRatio={aspectRatio}
      />
    );
  }

  return (
    <View>
      <FlatList
        data={displayItems}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        snapToAlignment="start"
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        renderItem={({ item }) => (
          <MediaItem item={item} width={screenWidth} aspectRatio={aspectRatio} />
        )}
      />
      {/* Pagination dots */}
      <View style={styles.dots}>
        {displayItems.map((item, index) => (
          <View
            key={item.id}
            style={[
              styles.dot,
              index === activeIndex ? styles.dotActive : styles.dotInactive,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mediaItem: {
    backgroundColor: colors.card,
  },
  mediaOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  videoErrorText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: '#fff',
    marginTop: 8,
  },
  placeholder: {
    width: '100%',
    overflow: 'hidden',
  },
  gradientFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  dotActive: {
    backgroundColor: colors.accent,
  },
  dotInactive: {
    backgroundColor: colors.borderLight,
  },
});
