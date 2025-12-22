import { Controller, Get, Logger, Res, Query } from '@nestjs/common';
import type { Response } from 'express';
import i18n from '../../i18n';

@Controller('redirect')
export class TeslaAppRedirectController {
  private readonly logger = new Logger(TeslaAppRedirectController.name);

  @Get('tesla-app')
  teslaRedirect(
    @Res() res: Response,
    @Query('userId') userId?: string,
    @Query('lang') lang?: string
  ) {
    const detectedLang = lang || 'fr';

    this.logger.log('🚗 Tesla app redirect accessed', {
      userId: userId || 'unknown',
      lang: detectedLang,
      timestamp: new Date().toISOString(),
      userAgent: res.req.headers['user-agent'],
    });

    const translations = {
      title: i18n.t('Tesla App Redirect', { lng: detectedLang }),
      openingMessage: i18n.t('Opening Tesla app...', { lng: detectedLang }),
      downloadTitle: i18n.t('Download Tesla App', { lng: detectedLang }),
      choosePlatform: i18n.t('Choose your platform', { lng: detectedLang }),
      iosStore: i18n.t('iOS App Store', { lng: detectedLang }),
      androidStore: i18n.t('Android Play Store', { lng: detectedLang }),
    };

    const html = `<!DOCTYPE html>
<html lang="${detectedLang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${translations.title}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            text-align: center;
            padding: 20px;
            background: linear-gradient(135deg, #000 0%, #333 100%);
            color: white;
            min-height: 100vh;
            margin: 0;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
        }
        .tesla-logo {
            font-size: 4em;
            margin-bottom: 20px;
        }
        .title {
            font-size: 1.5em;
            font-weight: bold;
            margin: 20px 0 10px 0;
        }
        .subtitle {
            font-size: 1.1em;
            margin: 0 0 30px 0;
            opacity: 0.9;
        }
        .buttons {
            display: flex;
            flex-direction: column;
            gap: 15px;
            max-width: 300px;
            width: 100%;
        }
        .button {
            display: block;
            padding: 15px 20px;
            background: #fff;
            color: #000;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 1em;
            transition: all 0.2s ease;
            border: none;
            cursor: pointer;
        }
        .button:hover {
            background: #f0f0f0;
            transform: translateY(-2px);
        }
        .ios-button {
            background: #000;
            color: #fff;
            border: 2px solid #fff;
        }
        .ios-button:hover {
            background: #fff;
            color: #000;
        }
        .android-button {
            background: #3ddc84;
            color: #000;
        }
        .android-button:hover {
            background: #2db864;
        }
        .web-button {
            background: #e82127;
            color: #fff;
        }
        .web-button:hover {
            background: #cc1c22;
        }
        .spinner {
            border: 4px solid rgba(255, 255, 255, 0.3);
            border-top: 4px solid #fff;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            animation: spin 1s linear infinite;
            margin: 20px auto;
            display: none;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="tesla-logo">🚗</div>
    <div class="title">${translations.downloadTitle}</div>
    <div class="subtitle">${translations.choosePlatform}</div>

    <div class="buttons">
        <button class="button ios-button" onclick="openStore('ios')">
            📱 ${translations.iosStore}
        </button>
        <button class="button android-button" onclick="openStore('android')">
            🤖 ${translations.androidStore}
        </button>
    </div>

    <div class="spinner" id="spinner"></div>

    <script>
        window.onload = function() {
            let appOpened = false;

            document.addEventListener('visibilitychange', function() {
                if (document.hidden) {
                    appOpened = true;
                }
            });

            try {
                window.location.href = 'tesla://';
            } catch (e) {
                console.log("An error occurred while trying to open the app", e);
            }

            setTimeout(function() {
                if (appOpened) {
                    try {
                        window.close();
                    } catch (e) {
                        console.log("Unable to close the window:", e);
                    }
                } else {
                    console.log("Could not open the app, displaying the buttons");
                }
            }, 1000);
        };

        function openStore(platform) {
            const spinner = document.getElementById('spinner');
            spinner.style.display = 'block';

            if (platform === 'ios') {
                window.location.href = 'https://apps.apple.com/app/tesla/id582007913';
            } else if (platform === 'android') {
                window.location.href = 'https://play.google.com/store/apps/details?id=com.teslamotors.tesla';
            }
        }
    </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }
}
