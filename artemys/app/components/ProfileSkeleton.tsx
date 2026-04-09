import { useEffect } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  type SharedValue,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors, spacing } from '@/constants/Colors';
import { THUMB_GAP } from './ProjectThumb';

const BONE_COLOR = colors.borderLight;

function Bone({
  pulse,
  style,
}: {
  pulse: SharedValue<number>;
  style?: any;
}) {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
  }));
  return <Animated.View style={[styles.bone, style, animatedStyle]} />;
}

export function ProfileSkeleton() {
  const pulse = useSharedValue(1);
  const { width } = useWindowDimensions();
  const thumbSize = (width - THUMB_GAP * 4) / 3;

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(0.4, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [pulse]);

  return (
    <View style={styles.container}>
      {/* Avatar + stats row */}
      <View style={styles.topSection}>
        <View style={styles.topRow}>
          <Bone pulse={pulse} style={styles.avatar} />
          <View style={styles.statsRow}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={styles.statBlock}>
                <Bone pulse={pulse} style={styles.statNum} />
                <Bone pulse={pulse} style={styles.statLabel} />
              </View>
            ))}
          </View>
        </View>

        {/* Name, handle, bio */}
        <Bone pulse={pulse} style={styles.name} />
        <Bone pulse={pulse} style={styles.handle} />
        <Bone pulse={pulse} style={styles.bioLine} />
        <Bone pulse={pulse} style={[styles.bioLine, { width: '55%' }]} />
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        <Bone pulse={pulse} style={styles.actionMain} />
        <Bone pulse={pulse} style={styles.actionSmall} />
      </View>

      {/* Grid divider */}
      <View style={styles.gridDivider}>
        <Bone pulse={pulse} style={styles.gridIcon} />
      </View>

      {/* Thumbnail grid — 2 rows */}
      <View style={styles.thumbRow}>
        {[0, 1, 2].map((i) => (
          <Bone
            key={i}
            pulse={pulse}
            style={[styles.thumb, { width: thumbSize, height: thumbSize }]}
          />
        ))}
      </View>
      <View style={[styles.thumbRow, { marginTop: THUMB_GAP }]}>
        {[0, 1, 2].map((i) => (
          <Bone
            key={i}
            pulse={pulse}
            style={[styles.thumb, { width: thumbSize, height: thumbSize }]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bone: {
    backgroundColor: BONE_COLOR,
    borderRadius: 6,
  },

  // Header section
  topSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    marginHorizontal: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  statsRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBlock: {
    alignItems: 'center',
    gap: 6,
  },
  statNum: {
    width: 28,
    height: 18,
  },
  statLabel: {
    width: 48,
    height: 12,
  },

  // Text lines
  name: {
    width: 120,
    height: 16,
    marginTop: spacing.md,
  },
  handle: {
    width: 90,
    height: 14,
    marginTop: 6,
  },
  bioLine: {
    width: '90%',
    height: 14,
    marginTop: 8,
  },

  // Actions
  actions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  actionMain: {
    flex: 1,
    height: 38,
    borderRadius: 10,
  },
  actionSmall: {
    width: 44,
    height: 38,
    borderRadius: 10,
  },

  // Grid
  gridDivider: {
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.borderLight,
    marginTop: spacing.sm,
    marginBottom: 2,
    paddingVertical: 10,
  },
  gridIcon: {
    width: 20,
    height: 20,
    borderRadius: 4,
  },

  // Thumbnails
  thumbRow: {
    flexDirection: 'row',
    gap: THUMB_GAP,
    paddingHorizontal: THUMB_GAP,
  },
  thumb: {
    borderRadius: 0,
  },
});
