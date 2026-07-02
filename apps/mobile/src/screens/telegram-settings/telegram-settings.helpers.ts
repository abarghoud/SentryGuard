export function resolveTelegramStatusKey(isLinked: boolean): string {
  return isLinked ? 'telegram.linked' : 'common.toConfigure';
}

export function shouldShowLinkReturnHint(isAwaitingReturn: boolean, isLinked: boolean): boolean {
  return isAwaitingReturn && !isLinked;
}
