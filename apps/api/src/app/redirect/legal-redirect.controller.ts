import { Controller, Get, Param, Res } from '@nestjs/common';
import type { Response } from 'express';

@Controller()
export class LegalRedirectController {
  @Get(':locale/legal/:page')
  public redirectLocalized(
    @Param('locale') locale: string,
    @Param('page') page: string,
    @Res() res: Response
  ): void {
    res.redirect(302, this.buildTargetUrl(locale, page));
  }

  @Get('legal/:page')
  public redirectDefault(
    @Param('page') page: string,
    @Res() res: Response
  ): void {
    res.redirect(302, this.buildTargetUrl('en', page));
  }

  private buildTargetUrl(locale: string, page: string): string {
    const webappUrl = (process.env.WEBAPP_URL || 'https://sentryguard.org').replace(/\/+$/, '');
    const targetLocale = locale.toLowerCase().startsWith('fr') ? 'fr' : 'en';
    const isTerms = page.toLowerCase() === 'terms' || page.toLowerCase() === 'cgu';
    const targetPage = isTerms ? 'terms' : 'privacy';
    return `${webappUrl}/${targetLocale}/legal/${targetPage}`;
  }
}
