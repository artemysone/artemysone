import { useCallback, useState } from 'react';
import { getProfile, getProfileByHandleWithStats } from '@/services/profiles';
import { getUserProjects } from '@/services/projects';
import type { ProfileWithStats, Project } from '@/types/database';

type ProfileLookup =
  | { userId: string }
  | { handle: string };

export function useProfileData(lookup: ProfileLookup) {
  const [profileData, setProfileData] = useState<ProfileWithStats | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const lookupKey = 'userId' in lookup ? lookup.userId : lookup.handle;

  const fetchData = useCallback(async () => {
    setError(false);
    try {
      // Resolve profile first (by ID or handle)
      const prof = 'userId' in lookup
        ? await getProfile(lookup.userId)
        : await getProfileByHandleWithStats(lookup.handle);
      if (!prof) {
        setError(true);
        return;
      }
      const projs = await getUserProjects(prof.id);
      setProfileData(prof);
      setProjects(projs);
    } catch (err) {
      console.error('Failed to load profile:', err);
      setError(true);
    }
  }, [lookupKey]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  return { profileData, projects, loading, setLoading, refreshing, error, fetchData, refresh };
}
