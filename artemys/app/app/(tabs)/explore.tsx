import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppBar } from '@/components/AppBar';
import { Avatar } from '@/components/Avatar';
import { TagChip } from '@/components/TagChip';
import { getTags } from '@/services/tags';
import { searchAll, getProjectsByTag } from '@/services/search';
import { colors, spacing, radius } from '@/constants/Colors';
import { fonts } from '@/constants/Typography';
import type { Tag, Profile, Project } from '@/types/database';

type ViewMode = 'browse' | 'search' | 'tag';

export default function ExploreScreen() {
  const router = useRouter();

  // Search state
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [profileResults, setProfileResults] = useState<Profile[]>([]);
  const [projectResults, setProjectResults] = useState<Project[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Tags state
  const [tags, setTags] = useState<Tag[]>([]);

  // Tag filter state
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [tagProjects, setTagProjects] = useState<Project[]>([]);
  const [tagLoading, setTagLoading] = useState(false);

  const viewMode: ViewMode =
    selectedTag ? 'tag' : query.trim().length >= 2 ? 'search' : 'browse';

  // Load tags on mount
  useEffect(() => {
    getTags()
      .then(setTags)
      .catch((err) => console.error('Failed to load tags:', err));
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setProfileResults([]);
      setProjectResults([]);
      setSearching(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchAll(trimmed);
        setProfileResults(results.profiles);
        setProjectResults(results.projects);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleTagPress = useCallback(async (tag: Tag) => {
    setSelectedTag(tag);
    setTagLoading(true);
    try {
      const projects = await getProjectsByTag(tag.id);
      setTagProjects(projects);
    } catch (err) {
      console.error('Failed to load tag projects:', err);
    } finally {
      setTagLoading(false);
    }
  }, []);

  const clearTagFilter = useCallback(() => {
    setSelectedTag(null);
    setTagProjects([]);
  }, []);

  // ---------- Renderers ----------

  const renderProjectItem = useCallback(
    ({ item }: { item: Project }) => (
      <Pressable
        style={styles.projectItem}
        onPress={() => router.push(`/project/${item.id}`)}
      >
        <View style={styles.projectItemBody}>
          <Text style={styles.projectItemTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.projectItemDesc} numberOfLines={2}>
            {item.description}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
      </Pressable>
    ),
    [router],
  );

  const renderProfileItem = useCallback(
    ({ item }: { item: Profile }) => (
      <Pressable
        style={styles.profileItem}
        onPress={() => router.push(`/user/${item.id}`)}
      >
        <Avatar uri={item.avatar_url} name={item.name} size="sm" />
        <View style={styles.profileItemInfo}>
          <Text style={styles.profileItemName}>{item.name}</Text>
          <Text style={styles.profileItemHandle}>@{item.handle}</Text>
        </View>
      </Pressable>
    ),
    [router],
  );

  // ---------- Search results ----------

  const renderSearchResults = () => {
    if (searching && profileResults.length === 0 && projectResults.length === 0) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      );
    }

    if (!searching && profileResults.length === 0 && projectResults.length === 0) {
      return (
        <View style={styles.center}>
          <Ionicons name="search-outline" size={40} color={colors.text.tertiary} />
          <Text style={styles.emptyText}>No results found</Text>
        </View>
      );
    }

    const sections: { key: string; data: unknown }[] = [];
    if (profileResults.length > 0) sections.push({ key: 'profiles', data: profileResults });
    if (projectResults.length > 0) sections.push({ key: 'projects', data: projectResults });

    return (
      <FlatList
        data={sections}
        keyExtractor={(item) => item.key}
        renderItem={({ item: section }) => (
          <View>
            <Text style={styles.sectionHeader}>
              {section.key === 'profiles' ? 'People' : 'Projects'}
            </Text>
            {section.key === 'profiles'
              ? (section.data as Profile[]).map((p) => (
                  <View key={p.id}>{renderProfileItem({ item: p })}</View>
                ))
              : (section.data as Project[]).map((p) => (
                  <View key={p.id}>{renderProjectItem({ item: p })}</View>
                ))}
          </View>
        )}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
      />
    );
  };

  // ---------- Tag filtered view ----------

  const renderTagView = () => {
    if (tagLoading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      );
    }

    return (
      <FlatList
        data={tagProjects}
        keyExtractor={(item) => item.id}
        renderItem={renderProjectItem}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <Pressable style={styles.tagHeader} onPress={clearTagFilter}>
            <Ionicons name="arrow-back" size={20} color={colors.text.primary} />
            <Text style={styles.tagHeaderText}>{selectedTag?.name}</Text>
          </Pressable>
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>No projects with this tag yet</Text>
          </View>
        }
        keyboardShouldPersistTaps="handled"
      />
    );
  };

  // ---------- Browse (default) view ----------

  const renderBrowse = () => (
    <View style={styles.browseContainer}>
      <Text style={styles.sectionHeader}>Browse by tag</Text>
      <FlatList
        data={tags}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tagsRow}
        renderItem={({ item: tag }) => (
          <TagChip label={tag.name} onPress={() => handleTagPress(tag)} />
        )}
      />
    </View>
  );

  // ---------- Main render ----------

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppBar title="Explore" />

      {/* Search bar */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={colors.text.tertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search people or projects..."
            placeholderTextColor={colors.text.tertiary}
            value={query}
            onChangeText={(text) => {
              setQuery(text);
              if (selectedTag) clearTagFilter();
            }}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.text.tertiary} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Content */}
      {viewMode === 'tag' && renderTagView()}
      {viewMode === 'search' && renderSearchResults()}
      {viewMode === 'browse' && renderBrowse()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  searchBarContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.input,
    borderRadius: radius.md,
    paddingHorizontal: 13,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.text.primary,
    paddingVertical: spacing.md,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xxl * 2,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.text.tertiary,
    marginTop: spacing.md,
  },
  sectionHeader: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  browseContainer: {
    paddingHorizontal: spacing.lg,
  },
  tagsRow: {
    gap: spacing.sm,
  },
  tagHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  tagHeaderText: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.text.primary,
  },
  profileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  profileItemInfo: {
    flex: 1,
  },
  profileItemName: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.text.primary,
  },
  profileItemHandle: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 1,
  },
  projectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  projectItemBody: {
    flex: 1,
  },
  projectItemTitle: {
    fontFamily: fonts.serif,
    fontSize: 15,
    color: colors.text.primary,
    marginBottom: 2,
  },
  projectItemDesc: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 18,
  },
});
