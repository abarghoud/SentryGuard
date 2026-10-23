import { requireOptionalNativeModule } from 'expo';

import { FoldDivision } from './fold';

interface FoldDivisionNativeModule {
  getFoldDivisions(): Promise<FoldDivision[]>;
}

const nativeModule = requireOptionalNativeModule<FoldDivisionNativeModule>('SentryGuardFoldDivision');

export async function readFoldDivisions(): Promise<FoldDivision[]> {
  return (await nativeModule?.getFoldDivisions()) ?? [];
}
