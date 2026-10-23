import { addHingeListener, getHinge, type HingeStatus } from 'expo-hinge';
import { createContext, useContext, useEffect, useState, type JSX, type ReactNode } from 'react';
import { useWindowDimensions } from 'react-native';

import { FoldDivision, selectFoldToLayOut } from './fold';
import { readFoldDivisions } from './fold-division-module';

const VerticalFoldContext = createContext<FoldDivision | null>(null);

export function VerticalFoldProvider({ children }: { children: ReactNode }): JSX.Element {
  const verticalFold = useVerticalFoldReading();

  return <VerticalFoldContext.Provider value={verticalFold}>{children}</VerticalFoldContext.Provider>;
}

export function useVerticalFold(): FoldDivision | null {
  return useContext(VerticalFoldContext);
}

function useVerticalFoldReading(): FoldDivision | null {
  const { height, width } = useWindowDimensions();
  const hingeStatus = useHingeStatus();
  const [divisions, setDivisions] = useState<FoldDivision[]>([]);

  useEffect(() => {
    let isCurrent = true;

    void readFoldDivisions().then((nextDivisions) => {
      if (isCurrent) {
        setDivisions(nextDivisions);
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [height, width]);

  return selectFoldToLayOut(divisions, hingeStatus === 'partiallyOpen');
}

function useHingeStatus(): HingeStatus | null {
  const [hingeStatus, setHingeStatus] = useState<HingeStatus | null>(() => getHinge()?.status ?? null);

  useEffect(() => {
    const subscription = addHingeListener(({ hinge }) => setHingeStatus(hinge ? hinge.status : null));

    return () => subscription.remove();
  }, []);

  return hingeStatus;
}
