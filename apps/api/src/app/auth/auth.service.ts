import { Injectable, Logger, UnauthorizedException, OnModuleDestroy } from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';

interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_at: Date;
  created_at: Date;
}

interface PendingState {
  state: string;
  created_at: Date;
}

@Injectable()
export class AuthService implements OnModuleDestroy {
  private readonly logger = new Logger(AuthService.name);
  private readonly tokenStore = new Map<string, TokenData>();
  private readonly pendingStates = new Map<string, PendingState>();
  private readonly STATE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Nettoyer les states expirés toutes les minutes
    this.cleanupInterval = setInterval(() => this.cleanupExpiredStates(), 60 * 1000);
  }

  /**
   * Nettoyage lors de la destruction du module
   */
  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  /**
   * Génère une URL de connexion Tesla OAuth
   */
  generateLoginUrl(): { url: string; state: string } {
    const state = crypto.randomBytes(32).toString('hex');
    const clientId = process.env.TESLA_CLIENT_ID;
    const redirectUri = process.env.TESLA_REDIRECT_URI || 'https://sentryguard.org/callback/auth';

    if (!clientId) {
      throw new Error('TESLA_CLIENT_ID non défini dans les variables d\'environnement');
    }

    // Stocker le state temporairement
    this.pendingStates.set(state, {
      state,
      created_at: new Date()
    });

    const params = new URLSearchParams({
      client_id: clientId,
      locale: 'en-US',
      prompt: 'login',
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid vehicle_device_data offline_access user_data',
      state: state
    });

    const url = `https://auth.tesla.com/oauth2/v3/authorize?${params.toString()}`;

    this.logger.log(`🔐 URL de connexion générée avec state: ${state}`);
    return { url, state };
  }

  /**
   * Valide le state OAuth
   */
  private validateState(state: string): boolean {
    const pendingState = this.pendingStates.get(state);
    
    if (!pendingState) {
      this.logger.warn(`⚠️ State invalide ou expiré: ${state}`);
      return false;
    }

    const now = new Date();
    const elapsed = now.getTime() - pendingState.created_at.getTime();

    if (elapsed > this.STATE_TIMEOUT_MS) {
      this.logger.warn(`⚠️ State expiré: ${state}`);
      this.pendingStates.delete(state);
      return false;
    }

    // Supprimer le state après validation
    this.pendingStates.delete(state);
    return true;
  }

  /**
   * Échange le code d'autorisation contre des tokens
   */
  async exchangeCodeForTokens(code: string, state: string): Promise<{ userId: string; access_token: string }> {
    // Valider le state
    if (!this.validateState(state)) {
      throw new UnauthorizedException('State invalide ou expiré');
    }

    const clientId = process.env.TESLA_CLIENT_ID;
    const clientSecret = process.env.TESLA_CLIENT_SECRET;
    const audience = process.env.TESLA_AUDIENCE || 'https://fleet-api.prd.na.vn.cloud.tesla.com';
    const redirectUri = process.env.TESLA_REDIRECT_URI || 'https://sentryguard.org/callback/auth';

    if (!clientId || !clientSecret) {
      throw new Error('TESLA_CLIENT_ID ou TESLA_CLIENT_SECRET non définis');
    }

    try {
      this.logger.log('🔄 Échange du code d\'autorisation contre des tokens...');

      const response = await axios.post(
        'https://fleet-auth.prd.vn.cloud.tesla.com/oauth2/v3/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: clientId,
          client_secret: clientSecret,
          code: code,
          audience: audience,
          redirect_uri: redirectUri
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      const { access_token, refresh_token, expires_in } = response.data;

      // Générer un userId unique
      const userId = crypto.randomBytes(16).toString('hex');

      // Calculer la date d'expiration
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + (expires_in || 3600));

      // Stocker les tokens
      this.tokenStore.set(userId, {
        access_token,
        refresh_token,
        expires_at: expiresAt,
        created_at: new Date()
      });

      this.logger.log(`✅ Tokens stockés pour l'utilisateur: ${userId}`);
      this.logger.log(`📅 Expiration du token: ${expiresAt.toISOString()}`);

      return { userId, access_token };
    } catch (error: unknown) {
      const errorData = (error as any)?.response?.data;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('❌ Erreur lors de l\'échange du code:', errorData || errorMessage);
      throw new UnauthorizedException('Échec de l\'authentification Tesla');
    }
  }

  /**
   * Récupère le token d'accès pour un utilisateur
   */
  getAccessToken(userId: string): string | null {
    const tokenData = this.tokenStore.get(userId);

    if (!tokenData) {
      this.logger.warn(`⚠️ Aucun token trouvé pour l'utilisateur: ${userId}`);
      return null;
    }

    // Vérifier si le token a expiré
    const now = new Date();
    if (now > tokenData.expires_at) {
      this.logger.warn(`⚠️ Token expiré pour l'utilisateur: ${userId}`);
      this.tokenStore.delete(userId);
      return null;
    }

    return tokenData.access_token;
  }

  /**
   * Vérifie si un utilisateur a un token valide
   */
  hasValidToken(userId: string): boolean {
    const token = this.getAccessToken(userId);
    return token !== null;
  }

  /**
   * Récupère les informations du token pour un utilisateur
   */
  getTokenInfo(userId: string): { exists: boolean; expires_at?: Date; created_at?: Date } {
    const tokenData = this.tokenStore.get(userId);

    if (!tokenData) {
      return { exists: false };
    }

    return {
      exists: true,
      expires_at: tokenData.expires_at,
      created_at: tokenData.created_at
    };
  }

  /**
   * Nettoie les states expirés
   */
  private cleanupExpiredStates(): void {
    const now = new Date();
    let cleaned = 0;

    for (const [state, data] of this.pendingStates.entries()) {
      const elapsed = now.getTime() - data.created_at.getTime();
      if (elapsed > this.STATE_TIMEOUT_MS) {
        this.pendingStates.delete(state);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`🧹 ${cleaned} state(s) expiré(s) nettoyé(s)`);
    }
  }

  /**
   * Statistiques du service
   */
  getStats(): { activeUsers: number; pendingStates: number } {
    return {
      activeUsers: this.tokenStore.size,
      pendingStates: this.pendingStates.size
    };
  }
}

