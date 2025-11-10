import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { User } from '../../entities/user.entity';
import { UserLanguageService } from './user-language.service';
import { ThrottleOptions } from '../../config/throttle.config';

interface UpdateLanguageDto {
  language: string;
}

@Controller('user')
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(private readonly userLanguageService: UserLanguageService) {}

  @Throttle(ThrottleOptions.authenticatedRead())
  @UseGuards(JwtAuthGuard)
  @Get('language')
  async getLanguage(
    @CurrentUser() user: User
  ): Promise<{ language: string }> {
    const language = await this.userLanguageService.getUserLanguage(
      user.userId
    );

    return { language };
  }

  @Throttle(ThrottleOptions.authenticatedWrite())
  @UseGuards(JwtAuthGuard)
  @Patch('language')
  async updateLanguage(
    @CurrentUser() user: User,
    @Body() body: UpdateLanguageDto
  ): Promise<{ success: boolean; language: string }> {
    if (!body.language || (body.language !== 'en' && body.language !== 'fr')) {
      throw new BadRequestException('Language must be "en" or "fr"');
    }

    const language = body.language as 'en' | 'fr';

    this.logger.log(
      `🌍 Updating language for user ${user.userId} to ${language}`
    );

    await this.userLanguageService.updateUserLanguage(user.userId, language);

    return {
      success: true,
      language,
    };
  }
}

