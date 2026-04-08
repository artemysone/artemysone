export const WEB_BASE_URL = 'https://artemys.app';

export function projectUrl(projectId: string): string {
  return `${WEB_BASE_URL}/project/${projectId}`;
}

export function profileUrl(profileId: string): string {
  return `${WEB_BASE_URL}/user/${profileId}`;
}
