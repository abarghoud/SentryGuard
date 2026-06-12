import { mock, MockProxy } from 'jest-mock-extended';

import { User } from '../../entities/user.entity';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';

describe('The AlertsController class', () => {
  const fakeUser = { userId: 'user-123' } as User;
  const fakeAlertId = '4c1f1a52-7a44-4d2b-9b3f-9a9f0b7f6e21';

  let controller: AlertsController;
  let mockAlertsService: MockProxy<AlertsService>;

  beforeEach(() => {
    mockAlertsService = mock<AlertsService>();
    controller = new AlertsController(mockAlertsService);
  });

  describe('The clearAlerts() method', () => {
    describe('When the user clears all alerts', () => {
      let result: { success: boolean };

      beforeEach(async () => {
        result = await controller.clearAlerts(fakeUser);
      });

      it('should clear the alerts of the current user', () => {
        expect(mockAlertsService.clearForUser).toHaveBeenCalledWith(fakeUser.userId);
      });

      it('should return a success response', () => {
        expect(result).toStrictEqual({ success: true });
      });
    });
  });

  describe('The deleteAlert() method', () => {
    describe('When the user deletes a single alert', () => {
      let result: { success: boolean };

      beforeEach(async () => {
        result = await controller.deleteAlert(fakeUser, fakeAlertId);
      });

      it('should delete the alert scoped to the current user', () => {
        expect(mockAlertsService.deleteForUser).toHaveBeenCalledWith(fakeUser.userId, fakeAlertId);
      });

      it('should return a success response', () => {
        expect(result).toStrictEqual({ success: true });
      });
    });
  });
});
