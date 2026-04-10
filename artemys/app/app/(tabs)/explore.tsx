import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { AppBar } from '@/components/AppBar';
import { Avatar } from '@/components/Avatar';
import { getTags } from '@/services/tags';
import { searchAll } from '@/services/search';
import {
  getExploreProjects,
  getProjectsByCategory,
  type ExploreProject,
} from '@/services/explore';
import { colors, spacing, radius } from '@/constants/Colors';
import { fonts } from '@/constants/Typography';
import type { Tag, Profile, Project } from '@/types/database';

const HORIZONTAL_PAD = spacing.lg;
const CARD_GAP = 2;

const GRADIENTS: [string, string, string][] = [
  ['#D946EF', '#A855F7', '#7C3AED'],
  ['#14B8A6', '#0D9488', '#047857'],
  ['#F97316', '#FB923C', '#F59E0B'],
  ['#475569', '#334155', '#1E293B'],
  ['#3B82F6', '#6366F1', '#8B5CF6'],
  ['#EC4899', '#F472B6', '#F9A8D4'],
  ['#10B981', '#06B6D4', '#0EA5E9'],
  ['#E11D48', '#BE185D', '#9333EA'],
];

function ExploreCard({
  project,
  index,
  onPress,
}: {
  project: ExploreProject;
  index: number;
  onPress: () => void;
}) {
  const gradient = GRADIENTS[index % GRADIENTS.length];
  const imageUri =
    project.thumbnail_url ?? (project.media_type !== 'video' ? project.media_url : null);

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
        />
      ) : (
        <View style={styles.cardFallback}>
          <Ionicons name="image-outline" size={24} color="rgba(255,255,255,0.85)" />
        </View>
      )}
      {project.media_type === 'video' && (
        <View style={styles.videoBadge}>
          <Ionicons name="play" size={11} color="#FFFFFF" />
        </View>
      )}
    </Pressable>
  );
}

function CategoryChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.categoryChip, selected && styles.categoryChipSelected]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.categoryChipText,
          selected && styles.categoryChipTextSelected,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

type ViewMode = 'browse' | 'search';

export default function ExploreScreen() {
  const router = useRouter();

  // Search
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [profileResults, setProfileResults] = useState<Profile[]>([]);
  const [projectResults, setProjectResults] = useState<Project[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Browse
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [trending, setTrending] = useState<ExploreProject[]>([]);
  const [newItems, setNewItems] = useState<ExploreProject[]>([]);
  const [categoryProjects, setCategoryProjects] = useState<ExploreProject[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [categoryLoading, setCategoryLoading] = useState(false);

  const viewMode: ViewMode = query.trim().length >= 2 ? 'search' : 'browse';

  const fetchExploreData = useCallback(async () => {
    const [tagsData, projects] = await Promise.all([
      getTags(),
      getExploreProjects(),
    ]);
    setTags(tagsData);
    setTrending(projects.slice(0, 4));
    setNewItems(projects.slice(4));
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await fetchExploreData();
      } catch (err) {
        console.error('Failed to load explore data:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchExploreData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchExploreData();
    } catch (err) {
      console.error('Failed to refresh:', err);
    } finally {
      setRefreshing(false);
    }
  }, [fetchExploreData]);

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

  const handleCategoryPress = useCallback(async (categoryId: string) => {
    if (categoryId === selectedCategory) return;
    setSelectedCategory(categoryId);
    if (categoryId === 'all') {
      setCategoryProjects([]);
      return;
    }
    setCategoryLoading(true);
    try {
      const projects = await getProjectsByCategory(categoryId);
      setCategoryProjects(projects);
    } catch (err) {
      console.error('Failed to load category:', err);
    } finally {
      setCategoryLoading(false);
    }
  }, [selectedCategory]);

  const navigateToProject = useCallback(
    (id: string) =>
      router.push({ pathname: '/project/[id]', params: { id } }),
    [router],
  );

  const navigateToProfile = useCallback(
    (handle: string) =>
      router.push({ pathname: '/[handle]', params: { handle } }),
    [router],
  );

  const renderCardGrid = (projects: ExploreProject[], indexOffset = 0) => (
    <View style={styles.cardGrid}>
      {projects.map((project, i) => (
        <ExploreCard
          key={project.id}
          project={project}
          index={i + indexOffset}
          onPress={() => navigateToProject(project.id)}
        />
      ))}
    </View>
  );

  const renderBrowse = () => {
    if (loading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      );
    }

    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.browseContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent}
          />
        }
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}
          style={styles.categoryScroll}
        >
          <CategoryChip
            label="All"
            selected={selectedCategory === 'all'}
            onPress={() => handleCategoryPress('all')}
          />
          {tags.map((tag) => (
            <CategoryChip
              key={tag.id}
              label={tag.name}
              selected={selectedCategory === tag.id}
              onPress={() => handleCategoryPress(tag.id)}
            />
          ))}
        </ScrollView>

        {selectedCategory === 'all' ? (
          <>
            {trending.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Trending This Week</Text>
                {renderCardGrid(trending)}
              </>
            )}
            {newItems.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>New & Noteworthy</Text>
                {renderCardGrid(newItems, trending.length)}
              </>
            )}
            {trending.length === 0 && newItems.length === 0 && (
              <View style={styles.centered}>
                <Ionicons
                  name="compass-outline"
                  size={40}
                  color={colors.text.tertiary}
                />
                <Text style={styles.emptyText}>
                  No projects to explore yet
                </Text>
              </View>
            )}
          </>
        ) : categoryLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : categoryProjects.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>
              {tags.find((t) => t.id === selectedCategory)?.name}
            </Text>
            {renderCardGrid(categoryProjects)}
          </>
        ) : (
          <View style={styles.centered}>
            <Text style={styles.emptyText}>
              No projects with this tag yet
            </Text>
          </View>
        )}
      </ScrollView>
    );
  };

  const renderSearchResults = () => {
    if (
      searching &&
      profileResults.length === 0 &&
      projectResults.length === 0
    ) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      );
    }

    if (
      !searching &&
      profileResults.length === 0 &&
      projectResults.length === 0
    ) {
      return (
        <View style={styles.centered}>
          <Ionicons
            name="search-outline"
            size={40}
            color={colors.text.tertiary}
          />
          <Text style={styles.emptyText}>No results found</Text>
        </View>
      );
    }

    return (
      <ScrollView
        contentContainerStyle={styles.searchContent}
        keyboardShouldPersistTaps="handled"
      >
        {profileResults.length > 0 && (
          <>
            <Text style={styles.searchSectionHeader}>People</Text>
            {profileResults.map((profile) => (
              <Pressable
                key={profile.id}
                style={styles.profileItem}
                onPress={() => navigateToProfile(profile.handle)}
              >
                <Avatar
                  uri={profile.avatar_url}
                  name={profile.name}
                  size="sm"
                />
                <View style={styles.profileItemInfo}>
                  <Text style={styles.profileItemName}>{profile.name}</Text>
                  <Text style={styles.profileItemHandle}>
                    @{profile.handle}
                  </Text>
                </View>
              </Pressable>
            ))}
          </>
        )}
        {projectResults.length > 0 && (
          <>
            <Text style={styles.searchSectionHeader}>Projects</Text>
            {projectResults.map((project) => (
              <Pressable
                key={project.id}
                style={styles.projectItem}
                onPress={() => navigateToProject(project.id)}
              >
                <View style={styles.projectItemBody}>
                  <Text style={styles.projectItemTitle} numberOfLines={1}>
                    {project.title}
                  </Text>
                  <Text style={styles.projectItemDesc} numberOfLines={2}>
                    {project.description}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.text.tertiary}
                />
              </Pressable>
            ))}
          </>
        )}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppBar title="artemys" />

      {/* Search bar */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchBar}>
          <Ionicons
            name="search-outline"
            size={18}
            color={colors.text.tertiary}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search projects, people, tags..."
            placeholderTextColor={colors.text.tertiary}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')}>
              <Ionicons
                name="close-circle"
                size={18}
                color={colors.text.tertiary}
              />
            </Pressable>
          )}
        </View>
      </View>

      {/* Content */}
      {viewMode === 'search' ? renderSearchResults() : renderBrowse()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  // Search
  searchBarContainer: {
    paddingHorizontal: HORIZONTAL_PAD,
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

  // Browse
  browseContent: {
    paddingBottom: spacing.xxl,
  },
  categoryScroll: {
    flexGrow: 0,
    marginBottom: spacing.lg,
  },
  categoryRow: {
    paddingHorizontal: HORIZONTAL_PAD,
    gap: spacing.sm,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  categoryChipSelected: {
    backgroundColor: colors.text.primary,
    borderColor: colors.text.primary,
  },
  categoryChipText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.text.secondary,
  },
  categoryChipTextSelected: {
    color: '#FFFFFF',
  },
  sectionTitle: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.text.primary,
    paddingHorizontal: HORIZONTAL_PAD,
    marginBottom: spacing.md,
  },

  // Card grid
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: HORIZONTAL_PAD,
    gap: CARD_GAP,
    marginBottom: spacing.xl,
  },
  card: {
    width: '49%',
    aspectRatio: 1,
    borderRadius: radius.sm,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: CARD_GAP,
  },
  cardFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },

  // States
  centered: {
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

  // Search results
  searchContent: {
    paddingHorizontal: HORIZONTAL_PAD,
    paddingBottom: spacing.xxl,
  },
  searchSectionHeader: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
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
