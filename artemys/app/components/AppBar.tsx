import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '@/constants/Colors';
import { fonts } from '@/constants/Typography';
import { BrandWordmark } from './BrandWordmark';

interface AppBarProps {
  title: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  onLeftPress?: () => void;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightPress?: () => void;
  rightText?: string;
  rightTextColor?: string;
  badgeCount?: number;
}

export function AppBar({
  title,
  leftIcon,
  onLeftPress,
  rightIcon,
  onRightPress,
  rightText,
  rightTextColor = colors.text.primary,
  badgeCount,
}: AppBarProps) {
  return (
    <View style={styles.appBar}>
      <View pointerEvents="none" style={styles.titleContainer}>
        {title === 'artemys' ? <BrandWordmark /> : <Text style={styles.title}>{title}</Text>}
      </View>

      {leftIcon ? (
        <Pressable onPress={onLeftPress} style={styles.leftAction}>
          <Ionicons name={leftIcon} size={24} color={colors.text.primary} />
        </Pressable>
      ) : (
        <View style={styles.leftAction} />
      )}
      {rightText ? (
        <Pressable onPress={onRightPress} style={styles.rightTextAction}>
          <Text style={[styles.rightText, { color: rightTextColor }]}>{rightText}</Text>
        </Pressable>
      ) : rightIcon ? (
        <Pressable onPress={onRightPress} style={styles.rightAction}>
          <View>
            <Ionicons name={rightIcon} size={24} color={colors.text.primary} />
            {badgeCount != null && badgeCount > 0 && <View style={styles.badge} />}
          </View>
        </Pressable>
      ) : (
        <View style={styles.rightAction} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  appBar: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.bg,
    minHeight: 56,
  },
  titleContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: spacing.xl,
    right: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftAction: {
    width: 32,
    alignItems: 'flex-start',
    zIndex: 1,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.text.primary,
    textAlign: 'center',
  },
  rightAction: {
    width: 32,
    alignItems: 'flex-end',
    zIndex: 1,
  },
  rightTextAction: {
    zIndex: 1,
  },
  rightText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
});
