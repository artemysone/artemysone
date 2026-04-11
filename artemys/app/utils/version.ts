import type { ProjectBumpType } from '@/types/database';

export const INITIAL_PROJECT_VERSION = '0.1.0';

function parseVersion(version: string): [number, number, number] {
  const parts = version.split('.').map((part) => Number.parseInt(part, 10));
  if (parts.length !== 3 || parts.some((p) => Number.isNaN(p))) {
    return [0, 1, 0];
  }
  return [parts[0], parts[1], parts[2]];
}

export function nextVersion(current: string, bump: ProjectBumpType): string {
  const [major, minor, patch] = parseVersion(current);
  if (bump === 'major') return `${major + 1}.0.0`;
  if (bump === 'minor') return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

export function formatVersionLabel(version: string): string {
  return `v${version}`;
}
