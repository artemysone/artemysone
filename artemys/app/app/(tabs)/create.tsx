import { View, Text, ScrollView, StyleSheet, Pressable, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { colors, spacing, radius } from '@/constants/Colors';
import { fonts } from '@/constants/Typography';

const TAG_OPTIONS = ['Design', 'Mobile', 'Web', 'AI / ML', 'Hardware', 'Music', 'Film', 'Games'];

const MOCK_TAGGED = [
  { name: 'Aiden Park', initials: 'AP', gradient: ['#3D5A80', '#98C1D9'] as const },
  { name: 'Sofia R.', initials: 'SR', gradient: ['#D84797', '#F09ABC'] as const },
];

export default function CreateScreen() {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.appBar}>
        <Text style={styles.appBarTitle}>New Project</Text>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Upload area */}
        <Pressable style={styles.uploadArea}>
          <Ionicons name="cloud-upload-outline" size={36} color={colors.text.tertiary} />
          <Text style={styles.uploadText}>Upload a demo video or screenshots</Text>
          <Text style={styles.uploadHint}>MP4, MOV up to 30s · PNG, JPG</Text>
        </Pressable>

        {/* Title */}
        <View style={styles.field}>
          <Text style={styles.label}>Project Title</Text>
          <TextInput
            style={styles.input}
            placeholder="What did you build?"
            placeholderTextColor={colors.text.tertiary}
          />
        </View>

        {/* Description */}
        <View style={styles.field}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="Tell the story behind this project..."
            placeholderTextColor={colors.text.tertiary}
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* Tags */}
        <View style={styles.field}>
          <Text style={styles.label}>Tags</Text>
          <View style={styles.tagsRow}>
            {TAG_OPTIONS.map((tag) => (
              <Pressable
                key={tag}
                style={[styles.tagChip, selectedTags.includes(tag) && styles.tagChipSelected]}
                onPress={() => toggleTag(tag)}
              >
                <Text style={[styles.tagChipText, selectedTags.includes(tag) && styles.tagChipTextSelected]}>
                  {tag}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Collaborators */}
        <View style={styles.field}>
          <Text style={styles.label}>Collaborators</Text>
          <TextInput
            style={styles.input}
            placeholder="Search people to tag..."
            placeholderTextColor={colors.text.tertiary}
          />
          <View style={styles.taggedRow}>
            {MOCK_TAGGED.map((person) => (
              <View key={person.initials} style={styles.collabChip}>
                <LinearGradient colors={person.gradient} style={styles.collabChipAvatar}>
                  <Text style={styles.collabChipInitials}>{person.initials}</Text>
                </LinearGradient>
                <Text style={styles.collabChipName}>{person.name}</Text>
                <Pressable style={styles.collabChipRemove}>
                  <Ionicons name="close" size={12} color={colors.text.secondary} />
                </Pressable>
              </View>
            ))}
          </View>
        </View>

        {/* Submit */}
        <Pressable style={styles.postBtn}>
          <Text style={styles.postBtnText}>Post Project</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.bg,
  },
  appBarTitle: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.text.primary,
  },
  content: {
    padding: spacing.lg,
    paddingTop: 0,
  },
  uploadArea: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 36,
    alignItems: 'center',
    gap: 10,
    marginBottom: spacing.lg,
  },
  uploadText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  uploadHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.text.tertiary,
  },
  field: {
    marginBottom: spacing.lg,
  },
  label: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.card,
    padding: 13,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.text.primary,
  },
  textarea: {
    height: 100,
    paddingTop: 13,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tagChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.sm,
    backgroundColor: colors.input,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  tagChipSelected: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  tagChipText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.text.secondary,
  },
  tagChipTextSelected: {
    color: colors.accent,
  },
  taggedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: 10,
  },
  collabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 10,
    paddingLeft: 6,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.input,
  },
  collabChipAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  collabChipInitials: {
    fontSize: 8,
    fontWeight: '600',
    color: '#fff',
  },
  collabChipName: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.text.primary,
  },
  collabChipRemove: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  postBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    padding: 15,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  postBtnText: {
    fontFamily: fonts.display,
    fontSize: 16,
    color: '#fff',
  },
});
