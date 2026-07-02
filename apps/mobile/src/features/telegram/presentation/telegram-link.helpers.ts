export function resolveRemainingLinkMinutes(expiresAt: string | undefined, now: Date): number | null {
  if (!expiresAt) {
    return null;
  }

  const remainingMilliseconds = new Date(expiresAt).getTime() - now.getTime();

  if (Number.isNaN(remainingMilliseconds)) {
    return null;
  }

  return Math.max(0, Math.ceil(remainingMilliseconds / 60000));
}
