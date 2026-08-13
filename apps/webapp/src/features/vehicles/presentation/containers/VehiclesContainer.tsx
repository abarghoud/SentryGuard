import { VehiclesView } from '../views/VehiclesView';
import { useVehiclesQuery } from '../../../vehicles/di';
import { VehicleActionOutcome } from '../../domain/entities';
import { useTranslation } from 'react-i18next';

const resolveActionOutcome = async (
  action: Promise<unknown>,
  fallback: string
): Promise<VehicleActionOutcome> => {
  try {
    await action;
    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error && error.message ? error.message : fallback,
    };
  }
};

export function VehiclesContainer() {
  const {
    query,
    configureTelemetryMutation,
    deleteTelemetryMutation,
    toggleBreakInMutation,
    updateOffensiveResponseMutation,
  } = useVehiclesQuery();
  const { t } = useTranslation();

  const { data: vehicles = [], isLoading, isFetching, error, refetch } = query;

  return (
    <VehiclesView
      vehicles={vehicles}
      isLoading={isLoading || isFetching}
      error={error?.message || null}
      onRefresh={refetch}
      onConfigureTelemetry={async (vin) => configureTelemetryMutation.mutateAsync(vin)}
      onDeleteTelemetry={async (vin) =>
        resolveActionOutcome(
          deleteTelemetryMutation.mutateAsync(vin),
          t('Failed to disable telemetry')
        )
      }
      onToggleBreakInMonitoring={async (vin, enable) =>
        resolveActionOutcome(
          toggleBreakInMutation.mutateAsync({ vin, enable }),
          t('Failed to update Break-in monitoring')
        )
      }
      onUpdateBreakInOffensive={async (vin, breakInResponse) =>
        resolveActionOutcome(
          updateOffensiveResponseMutation.mutateAsync({ vin, breakInResponse }),
          t('Failed to update offensive response')
        )
      }
      onUpdateAutoSentry={async (vin, autoSentryEnabled) =>
        resolveActionOutcome(
          updateOffensiveResponseMutation.mutateAsync({ vin, autoSentryEnabled }),
          t('Failed to update auto sentry mode')
        )
      }
    />
  );
}
