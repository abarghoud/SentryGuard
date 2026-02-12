import { Test, TestingModule } from '@nestjs/testing';
import { RetryManager } from './retry-manager.service';

describe('The RetryManager class', () => {
  let service: RetryManager;
  let mockExecute: jest.MockedFunction<() => Promise<void>>;
  let maxRetries: number;
  let baseDelay: number;
  let maxDelay: number;
  
  beforeEach(async () => {
    maxRetries = 3;
    baseDelay = 1000;
    maxDelay = 30000;
    mockExecute = jest.fn();
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: RetryManager,
          useFactory: () => new RetryManager(maxRetries, baseDelay, maxDelay),
        },
      ],
    }).compile();
    
    service = module.get(RetryManager);
    
    jest.useFakeTimers();
  });
  
  afterEach(() => {
    jest.useRealTimers();
    service.stop();
    mockExecute.mockReset();
  });
  
  describe('The addToRetry() method', () => {
    describe('When adding first attempt', () => {
      it('should execute operation immediately', () => {
        mockExecute.mockResolvedValue(undefined);
        
        service.addToRetry(mockExecute, new Error('Test error'), 'test-1', 1);
        
        expect(mockExecute).toHaveBeenCalledTimes(1);
      });
      
      it('should schedule retry when operation fails', async () => {
        let callCount = 0;
        mockExecute.mockImplementation(async () => {
          callCount++;
          if (callCount === 1) {
            throw new Error('First failure');
          }
          return undefined;
        });
        
        service.addToRetry(mockExecute, new Error('Test error'), 'test-retry', 1);
        
        expect(mockExecute).toHaveBeenCalledTimes(1);
        
        await jest.advanceTimersByTimeAsync(2000);

        expect(mockExecute).toHaveBeenCalledTimes(2);
      });
    });
    
    describe('When adding retry attempts', () => {
      it('should schedule retry with exponential backoff', async () => {
        mockExecute.mockResolvedValue(undefined);
        
        service.addToRetry(mockExecute, new Error('Test error'), 'test-1', 2);
        service.addToRetry(mockExecute, new Error('Test error'), 'test-2', 2);
        
        await jest.advanceTimersByTimeAsync(2000);
        
        expect(mockExecute).toHaveBeenCalledTimes(2);
      });
    });
    
    describe('When operation fails and retries are scheduled', () => {
      it('should retry failed operation with increasing delays', async () => {
        mockExecute.mockImplementation(async () => {
          throw new Error('Always fails');
        });

        service.addToRetry(mockExecute, new Error('Initial error'), 'test-retry', 1);

        expect(mockExecute).toHaveBeenCalledTimes(1);

        await jest.advanceTimersByTimeAsync(6000);
        expect(mockExecute).toHaveBeenCalledTimes(3);
      });
      
      it('should eventually succeed after retries', async () => {
        let callCount = 0;
        mockExecute.mockImplementation(async () => {
          callCount++;
          if (callCount <= 2) throw new Error(`Failure ${callCount}`);
          return undefined;
        });

        service.addToRetry(mockExecute, new Error('Initial error'), 'test-success', 1);

        expect(mockExecute).toHaveBeenCalledTimes(1);

        await jest.advanceTimersByTimeAsync(6000);
        expect(mockExecute).toHaveBeenCalledTimes(3);
      });
    });
    
    describe('When max attempts reached', () => {
      it('should not execute operation and not schedule retry', async () => {
        service.addToRetry(mockExecute, new Error('Test error'), 'test-1', 4);
        
        await jest.advanceTimersByTimeAsync(10000);
        
        expect(mockExecute).toHaveBeenCalledTimes(0);
      });
      
      it('should stop retrying after max attempts even with failures', async () => {
        mockExecute.mockImplementation(async () => {
          throw new Error('Always fails');
        });
        
        service.addToRetry(mockExecute, new Error('Initial error'), 'test-max-fail', 1);
        
        expect(mockExecute).toHaveBeenCalledTimes(1);
        
        await jest.advanceTimersByTimeAsync(6000);
        expect(mockExecute).toHaveBeenCalledTimes(3);
        
        await jest.advanceTimersByTimeAsync(4000);
        expect(mockExecute).toHaveBeenCalledTimes(3);
      });
    });
  });
  
  
  describe('The clearPendingRetries() method', () => {
    it('should clear all pending retries', async () => {
      mockExecute.mockResolvedValue(undefined);
      
      service.addToRetry(mockExecute, new Error('Test'), 'test-1', 2);
      service.addToRetry(mockExecute, new Error('Test'), 'test-2', 2);
      
      service.stop();
      
      await jest.advanceTimersByTimeAsync(1000);
      
      expect(mockExecute).toHaveBeenCalledTimes(0);
    });
  });
  
  describe('The stop() method', () => {
    it('should clear all pending retries', async () => {
      mockExecute.mockResolvedValue(undefined);
      
      service.addToRetry(mockExecute, new Error('Test'), 'test-1', 2);
      
      service.stop();
      
      await jest.advanceTimersByTimeAsync(1000);
      
      expect(mockExecute).toHaveBeenCalledTimes(0);
    });
  });
  
});