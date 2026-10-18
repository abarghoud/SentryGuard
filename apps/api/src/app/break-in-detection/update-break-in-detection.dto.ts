import { IsEnum, IsIn } from 'class-validator';

import { BREAK_IN_REACTION_DELAYS_SECONDS, BreakInSensitivity } from '../alerts/enums/break-in-sensitivity.enum';

export class UpdateBreakInDetectionDto {
  @IsIn(BREAK_IN_REACTION_DELAYS_SECONDS)
  public reactionDelaySeconds!: number;

  @IsEnum(BreakInSensitivity)
  public sensitivity!: BreakInSensitivity;
}
