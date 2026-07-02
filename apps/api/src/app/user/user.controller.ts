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
import {
  SupportedLanguage,
  SUPPORTED_LANGUAGES,
} from '../../common/utils/language.util';

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
    if (
      !body.language ||
      !SUPPORTED_LANGUAGES.includes(body.language as SupportedLanguage)
    ) {
      throw new BadRequestException(
        `Language must be one of: ${SUPPORTED_LANGUAGES.join(', ')}`
      );
    }

    const language = body.language as SupportedLanguage;

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

