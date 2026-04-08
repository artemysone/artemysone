import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '@/constants/Colors';
import { fonts } from '@/constants/Typography';

interface AppBarProps {
  title: string;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightPress?: () => void;
  badgeCount?: number;
}

export function AppBar({ title, rightIcon, onRightPress, badgeCount }: AppBarProps) {
  return (
    <View style={styles.appBar}>
      <Text style={styles.title}>{title}</Text>
      {rightIcon && (
        <Pressable onPress={onRightPress}>
          <View>
            <Ionicons name={rightIcon} size={24} color={colors.text.primary} />
            {badgeCount != null && badgeCount > 0 && <View style={styles.badge} />}
          </View>
        </Pressable>
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
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.text.primary,
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
