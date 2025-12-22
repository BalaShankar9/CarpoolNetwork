export function getUserProfilePath(userId: string, currentUserId?: string | null): string {
  if (userId === currentUserId) {
    return '/profile';
  }
  return `/user/${userId}`;
}

export function navigateToUserProfile(
  userId: string,
  currentUserId: string | undefined | null,
  navigate: (path: string) => void
): void {
  const path = getUserProfilePath(userId, currentUserId);
  navigate(path);
}

export function openProfileInNewTab(userId: string): void {
  const url = `${window.location.origin}/user/${userId}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}
