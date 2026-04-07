import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '@/constants/Colors';
import { fonts } from '@/constants/Typography';

interface AppBarProps {
  title: string;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightPress?: () => void;
}

export function AppBar({ title, rightIcon, onRightPress }: AppBarProps) {
  return (
    <View style={styles.appBar}>
      <Text style={styles.title}>{title}</Text>
      {rightIcon && (
        <Pressable onPress={onRightPress}>
          <Ionicons name={rightIcon} size={24} color={colors.text.primary} />
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
});
