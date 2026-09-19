import { IsIn } from 'class-validator';

const ALLOWED_MUTE_DURATIONS = [30, 60, 120, 240, 1440] as const;

export class MuteNotificationsDto {
  @IsIn(ALLOWED_MUTE_DURATIONS)
  public minutes!: number;
}
