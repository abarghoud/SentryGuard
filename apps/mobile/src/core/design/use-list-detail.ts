import { useState } from 'react';

import { useTwoPaneLayout } from './use-two-pane-layout';

export interface ListDetail<Id> {
  isSplit: boolean;
  open(id: Id, openAlone?: () => void): void;
  select(id: Id | null): void;
  selectedId: Id | null;
}

export function useListDetail<Id>(): ListDetail<Id> {
  const isSplit = useTwoPaneLayout() !== null;
  const [selectedId, setSelectedId] = useState<Id | null>(null);

  const open = (id: Id, openAlone?: () => void): void => {
    if (isSplit) {
      setSelectedId(id);
      return;
    }

    openAlone?.();
  };

  return { isSplit, open, select: setSelectedId, selectedId: isSplit ? selectedId : null };
}
