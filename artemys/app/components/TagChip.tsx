import { Pressable, Text, StyleSheet } from 'react-native';
import { colors, radius } from '@/constants/Colors';
import { fonts } from '@/constants/Typography';

interface TagChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

export function TagChip({ label, selected, onPress }: TagChipProps) {
  if (onPress) {
    return (
      <Pressable
        style={[styles.chip, selected && styles.chipSelected]}
        onPress={onPress}
      >
        <Text style={[styles.text, selected && styles.textSelected]}>{label}</Text>
      </Pressable>
    );
  }

  return (
    <Pressable style={styles.displayChip}>
      <Text style={styles.displayText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.sm,
    backgroundColor: colors.input,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  chipSelected: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  text: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.text.secondary,
  },
  textSelected: {
    color: colors.accent,
  },
  displayChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.input,
  },
  displayText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.text.secondary,
  },
});
