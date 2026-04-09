import { Pressable, StyleSheet } from 'react-native';
import { ProjectMediaPreview } from './ProjectMediaPreview';
import type { Project } from '@/types/database';

export const THUMB_GAP = 2;

export function ProjectThumb({
  project,
  thumbSize,
  onPress,
}: {
  project: Project;
  thumbSize: number;
  onPress?: () => void;
}) {
  return (
    <Pressable style={[styles.thumb, { maxWidth: thumbSize }]} onPress={onPress}>
      <ProjectMediaPreview
        project={project}
        fallback="gradient"
        aspectRatio={1}
        playButtonSize={28}
        borderRadius={12}
      />
    </Pressable>
  );
}

export const thumbStyles = StyleSheet.create({
  gridRow: {
    gap: THUMB_GAP,
    paddingHorizontal: THUMB_GAP,
  },
});

const styles = StyleSheet.create({
  thumb: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
});
