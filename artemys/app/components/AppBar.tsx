import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '@/constants/Colors';
import { fonts } from '@/constants/Typography';

interface AppBarProps {
  title: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  onLeftPress?: () => void;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightPress?: () => void;
  badgeCount?: number;
}

export function AppBar({ title, leftIcon, onLeftPress, rightIcon, onRightPress, badgeCount }: AppBarProps) {
  return (
    <View style={styles.appBar}>
      {leftIcon ? (
        <Pressable onPress={onLeftPress} style={styles.leftAction}>
          <Ionicons name={leftIcon} size={24} color={colors.text.primary} />
        </Pressable>
      ) : (
        <View style={styles.leftAction} />
      )}
      <Text style={styles.title}>{title}</Text>
      {rightIcon ? (
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.bg,
    minHeight: 56,
  },
  leftAction: {
    width: 32,
    alignItems: 'flex-start',
  },
  title: {
    flex: 1,
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.text.primary,
    textAlign: 'center',
  },
  rightAction: {
    width: 32,
    alignItems: 'flex-end',
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
