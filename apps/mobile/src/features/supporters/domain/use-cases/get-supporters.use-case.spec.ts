import { mock } from 'jest-mock-extended';
import { GetSupportersUseCase } from './get-supporters.use-case';
import { SupportersRepositoryRequirements } from '../supporters.repository.requirements';
import { SupportersData } from '../entities';

describe('The GetSupportersUseCase class', () => {
  describe('The execute() method', () => {
    describe('When supporters data is requested', () => {
      it('should return supporters data from the repository', async () => {
        const mockRepo = mock<SupportersRepositoryRequirements>();
        const expectedData: SupportersData = {
          hasActiveSupporters: true,
          subscribers: [],
          supporters: [
            {
              coffees: 5,
              id: 'sup-1',
              name: 'Alice',
              supportDate: '2026-08-01T00:00:00.000Z',
            },
          ],
          totalCoffeesCount: 5,
        };
        mockRepo.getSupporters.mockResolvedValue(expectedData);

        const useCase = new GetSupportersUseCase(mockRepo);
        const result = await useCase.execute();

        expect(result).toStrictEqual(expectedData);
        expect(mockRepo.getSupporters).toHaveBeenCalledTimes(1);
      });
    });
  });
});
