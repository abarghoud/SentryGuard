import { mock, MockProxy } from 'jest-mock-extended';
import { SupportersController } from './supporters.controller';
import { PublicSupportersResponse, SupportersService } from './supporters.service';

describe('The SupportersController class', () => {
  let controller: SupportersController;
  let supportersService: MockProxy<SupportersService>;

  beforeEach(() => {
    supportersService = mock<SupportersService>();
    controller = new SupportersController(supportersService);
  });

  describe('The getSupporters() method', () => {
    describe('When called by client', () => {
      it('should delegate to supportersService.getPublicSupporters()', async () => {
        const mockResponse: PublicSupportersResponse = {
          subscribers: [],
          supporters: [
            {
              id: '1',
              name: 'John',
              coffees: 1,
              supportDate: '2024-01-01',
            },
          ],
          totalCoffeesCount: 1,
          hasActiveSupporters: true,
        };

        supportersService.getPublicSupporters.mockResolvedValue(mockResponse);

        const result = await controller.getSupporters();

        expect(result).toStrictEqual(mockResponse);
        expect(supportersService.getPublicSupporters).toHaveBeenCalled();
      });
    });
  });

  describe('The handleWebhook() method', () => {
    describe('When a webhook payload is received', () => {
      it('should pass payload and signature to supportersService and return success', async () => {
        const payload = { test: 'data' };
        const signature = 'test-signature';

        const result = await controller.handleWebhook(payload, signature);

        expect(result).toStrictEqual({ success: true });
        expect(supportersService.handleWebhook).toHaveBeenCalledWith(
          payload,
          JSON.stringify(payload),
          signature
        );
      });
    });
  });
});
