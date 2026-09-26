/**
 * @jest-environment jsdom
 */
import { act, createElement } from 'react';
import { createRoot, Root } from 'react-dom/client';

import { useUserInitiatedRefresh } from './use-user-initiated-refresh';

type RefreshHookResult = ReturnType<typeof useUserInitiatedRefresh>;

interface Deferred {
  promise: Promise<unknown>;
  reject: (error: Error) => void;
  resolve: () => void;
}

const createDeferred = (): Deferred => {
  let resolve: () => void = () => undefined;
  let reject: (error: Error) => void = () => undefined;
  const promise = new Promise<unknown>((onResolve, onReject) => {
    resolve = () => onResolve(undefined);
    reject = onReject;
  });

  return { promise, reject, resolve };
};

const mountedRoots: Root[] = [];

const renderRefreshHook = async (refetchers: readonly (() => Promise<unknown>)[]): Promise<() => RefreshHookResult> => {
  const results: RefreshHookResult[] = [];
  const Probe = (): null => {
    results.push(useUserInitiatedRefresh(refetchers));
    return null;
  };
  const root = createRoot(document.createElement('div'));
  mountedRoots.push(root);

  await act(async () => {
    root.render(createElement(Probe));
  });

  return () => results[results.length - 1];
};

describe('The useUserInitiatedRefresh() hook', () => {
  const globalWithActEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
  const expectedError = 'Network request failed';

  beforeAll(() => {
    globalWithActEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    act(() => {
      mountedRoots.splice(0).forEach((root) => root.unmount());
    });
  });

  afterAll(() => {
    delete globalWithActEnvironment.IS_REACT_ACT_ENVIRONMENT;
  });

  describe('When the user has not pulled to refresh', () => {
    let refetchVehicles: jest.Mock<Promise<unknown>, []>;
    let latest: () => RefreshHookResult;

    beforeEach(async () => {
      refetchVehicles = jest.fn().mockResolvedValue(undefined);

      latest = await renderRefreshHook([refetchVehicles]);
    });

    it('should not report a refresh', () => {
      expect(latest().isRefreshing).toBe(false);
    });

    it('should not refetch anything', () => {
      expect(refetchVehicles).not.toHaveBeenCalled();
    });
  });

  describe('When the user pulls to refresh and the refetches are pending', () => {
    let refetchVehicles: jest.Mock<Promise<unknown>, []>;
    let refetchAlerts: jest.Mock<Promise<unknown>, []>;
    let latest: () => RefreshHookResult;

    beforeEach(async () => {
      refetchVehicles = jest.fn().mockReturnValue(createDeferred().promise);
      refetchAlerts = jest.fn().mockReturnValue(createDeferred().promise);
      latest = await renderRefreshHook([refetchVehicles, refetchAlerts]);

      await act(async () => {
        latest().onRefresh();
      });
    });

    it('should report a refresh', () => {
      expect(latest().isRefreshing).toBe(true);
    });

    it('should refetch every source', () => {
      expect([refetchVehicles.mock.calls.length, refetchAlerts.mock.calls.length]).toStrictEqual([1, 1]);
    });
  });

  describe('When only some of the refetches have settled', () => {
    let latest: () => RefreshHookResult;

    beforeEach(async () => {
      const vehiclesDeferred = createDeferred();
      const alertsDeferred = createDeferred();
      latest = await renderRefreshHook([() => vehiclesDeferred.promise, () => alertsDeferred.promise]);

      await act(async () => {
        latest().onRefresh();
      });
      await act(async () => {
        vehiclesDeferred.resolve();
      });
    });

    it('should keep reporting the refresh', () => {
      expect(latest().isRefreshing).toBe(true);
    });
  });

  describe('When every refetch has resolved', () => {
    let latest: () => RefreshHookResult;

    beforeEach(async () => {
      const vehiclesDeferred = createDeferred();
      latest = await renderRefreshHook([() => vehiclesDeferred.promise]);

      await act(async () => {
        latest().onRefresh();
      });
      await act(async () => {
        vehiclesDeferred.resolve();
      });
    });

    it('should stop reporting the refresh', () => {
      expect(latest().isRefreshing).toBe(false);
    });
  });

  describe('When a refetch rejects', () => {
    let latest: () => RefreshHookResult;

    beforeEach(async () => {
      const vehiclesDeferred = createDeferred();
      latest = await renderRefreshHook([() => vehiclesDeferred.promise]);

      await act(async () => {
        latest().onRefresh();
      });
      await act(async () => {
        vehiclesDeferred.reject(new Error(expectedError));
      });
    });

    it('should stop reporting the refresh', () => {
      expect(latest().isRefreshing).toBe(false);
    });
  });
});
