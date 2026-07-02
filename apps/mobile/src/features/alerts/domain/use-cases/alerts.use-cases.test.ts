import { mock, MockProxy } from 'jest-mock-extended';

import { AlertEvent } from '../entities';
import { AlertRepositoryRequirements } from '../alert.repository.requirements';
import { ClearAlertsUseCase, DeleteAlertUseCase, GetAlertsUseCase } from './alerts.use-cases';

describe('The alerts use cases', () => {
  const fakeAlertId = 'alert-123';
  let mockRepository: MockProxy<AlertRepositoryRequirements>;

  beforeEach(() => {
    mockRepository = mock<AlertRepositoryRequirements>();
  });

  describe('The GetAlertsUseCase class', () => {
    describe('When alerts are available', () => {
      const expectedAlerts = [{ id: fakeAlertId }] as unknown as AlertEvent[];
      let result: AlertEvent[];

      beforeEach(async () => {
        mockRepository.getAlerts.mockResolvedValue(expectedAlerts);
        result = await new GetAlertsUseCase(mockRepository).execute();
      });

      it('should return the alerts from the repository', () => {
        expect(result).toBe(expectedAlerts);
      });
    });
  });

  describe('The ClearAlertsUseCase class', () => {
    describe('When clearing all alerts', () => {
      let result: { success: boolean };

      beforeEach(async () => {
        mockRepository.clearAlerts.mockResolvedValue({ success: true });
        result = await new ClearAlertsUseCase(mockRepository).execute();
      });

      it('should delegate to the repository', () => {
        expect(mockRepository.clearAlerts).toHaveBeenCalled();
      });

      it('should return the repository response', () => {
        expect(result).toStrictEqual({ success: true });
      });
    });
  });

  describe('The DeleteAlertUseCase class', () => {
    describe('When deleting a single alert', () => {
      let result: { success: boolean };

      beforeEach(async () => {
        mockRepository.deleteAlert.mockResolvedValue({ success: true });
        result = await new DeleteAlertUseCase(mockRepository).execute(fakeAlertId);
      });

      it('should delegate to the repository with the alert id', () => {
        expect(mockRepository.deleteAlert).toHaveBeenCalledWith(fakeAlertId);
      });

      it('should return the repository response', () => {
        expect(result).toStrictEqual({ success: true });
      });
    });
  });
});
