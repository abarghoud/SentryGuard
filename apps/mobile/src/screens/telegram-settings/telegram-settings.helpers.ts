export function resolveTelegramStatusKey(isLinked: boolean): string {
  return isLinked ? 'telegram.linked' : 'common.toConfigure';
}
