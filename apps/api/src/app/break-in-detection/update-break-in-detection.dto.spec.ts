import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { UpdateBreakInDetectionDto } from './update-break-in-detection.dto';

describe('The UpdateBreakInDetectionDto class', () => {
  const validateBody = async (body: Record<string, unknown>): Promise<string[]> => {
    const errors = await validate(plainToInstance(UpdateBreakInDetectionDto, body));
    return errors.map(error => error.property);
  };

  describe('When the settings are supported', () => {
    it('should accept them', async () => {
      expect(await validateBody({ reactionDelaySeconds: 20, sensitivity: 'repeated_pulls' })).toStrictEqual([]);
    });
  });

  describe('When the reaction delay is not one of the proposed values', () => {
    it('should reject the reaction delay', async () => {
      expect(await validateBody({ reactionDelaySeconds: 15, sensitivity: 'single_pull' })).toStrictEqual(['reactionDelaySeconds']);
    });
  });

  describe('When the sensitivity is unknown', () => {
    it('should reject the sensitivity', async () => {
      expect(await validateBody({ reactionDelaySeconds: 3, sensitivity: 'paranoid' })).toStrictEqual(['sensitivity']);
    });
  });
});
