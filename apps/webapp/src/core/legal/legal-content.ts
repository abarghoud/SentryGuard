/**
 * Legal content (Privacy Policy + Terms of Service), EN/FR.
 *
 * DRAFT — to be reviewed by legal counsel before publication.
 * Kept as structured data (rather than i18n keys) so the full documents stay
 * readable and easy to hand to a lawyer.
 */

export interface LegalSection {
  heading: string;
  paragraphs: string[];
}

export interface LegalDocument {
  title: string;
  lastUpdated: string;
  intro: string;
  sections: LegalSection[];
}

export type LegalLocale = 'en' | 'fr';

const CONTACT_EMAIL = 'hello@sentryguard.org';
const LAST_UPDATED = '2026-06-04';

const privacyEn: LegalDocument = {
  title: 'Privacy Policy',
  lastUpdated: LAST_UPDATED,
  intro:
    'SentryGuard ("we", "us") provides real-time Tesla Sentry Mode monitoring and security alerts. This Privacy Policy explains what personal data we process, why, and the rights you have. SentryGuardOrg is the data controller.',
  sections: [
    {
      heading: '1. Data we collect',
      paragraphs: [
        'Account data: your email address and display name, obtained from Tesla when you sign in.',
        'Vehicle data strictly necessary to operate the service: vehicle identifier (VIN), Sentry Mode status, and security event metadata (date/time, event type).',
        'Notification data: your push notification token and notification preferences, and — if you link it — your Telegram chat identifier.',
        'Technical data: minimal logs and diagnostics used to operate, secure and troubleshoot the service.',
      ],
    },
    {
      heading: '2. How we use your data (purposes & legal basis)',
      paragraphs: [
        'To provide monitoring and send you security alerts (performance of our contract with you).',
        'To associate Sentry Mode events with your account and vehicle (performance of contract).',
        'To keep the service reliable and secure, including incident diagnostics (our legitimate interest and your security).',
        'To comply with applicable legal obligations.',
      ],
    },
    {
      heading: '3. Tesla integration',
      paragraphs: [
        'We connect to your Tesla account through the official Tesla Fleet API, using the access you explicitly authorize. We only request the scopes required for monitoring and, where you enable it, the offensive response feature.',
        'Your Tesla access tokens are encrypted at rest and never shared. Please also review the Tesla Customer Privacy Notice.',
      ],
    },
    {
      heading: '4. Service providers (sub-processors)',
      paragraphs: [
        'We rely on a small number of processors acting on our behalf, including Expo (push notification delivery) and Telegram (the optional alert channel).',
        'We also use operational providers for transactional email, hosting, logging, error monitoring and asset storage. These providers may change over time; in all cases we only share the data each one needs for its function and require appropriate safeguards (such as data processing agreements and encryption).',
        'You can request the current list of our sub-processors at hello@sentryguard.org.',
      ],
    },
    {
      heading: '5. Data retention',
      paragraphs: [
        'We keep your personal data only as long as needed to provide the service. Security alert history is automatically deleted after a defined retention period.',
        'When you delete your account, your profile, vehicles, encrypted tokens and consent records are deleted.',
      ],
    },
    {
      heading: '6. International transfers',
      paragraphs: [
        'Some providers may process data outside your country. Where required, such transfers are covered by appropriate safeguards (e.g., Standard Contractual Clauses).',
      ],
    },
    {
      heading: '7. Security',
      paragraphs: [
        'We apply administrative, technical and physical safeguards, including encryption of data in transit and encryption of sensitive tokens at rest. No password is ever stored: authentication is delegated to Tesla.',
      ],
    },
    {
      heading: '8. Your rights',
      paragraphs: [
        'Subject to applicable law (including the GDPR), you may request access to, correction of, or deletion of your personal data, and you may withdraw your consent at any time.',
        'You can delete your account and all associated data directly from the app settings, or by contacting us.',
      ],
    },
    {
      heading: '9. Children',
      paragraphs: [
        'SentryGuard is not directed to children and is intended for Tesla account holders.',
      ],
    },
    {
      heading: '10. Changes & contact',
      paragraphs: [
        'We may update this policy; we will indicate the latest revision date above.',
        `Questions or requests: ${CONTACT_EMAIL}.`,
      ],
    },
  ],
};

const privacyFr: LegalDocument = {
  title: 'Politique de confidentialité',
  lastUpdated: LAST_UPDATED,
  intro:
    'SentryGuard (« nous ») fournit une surveillance en temps réel du mode Sentinelle Tesla et des alertes de sécurité. La présente politique explique quelles données personnelles nous traitons, pourquoi, et vos droits. SentryGuardOrg est le responsable du traitement.',
  sections: [
    {
      heading: '1. Données collectées',
      paragraphs: [
        'Données de compte : votre adresse e-mail et votre nom d’affichage, obtenus auprès de Tesla lors de la connexion.',
        'Données véhicule strictement nécessaires au service : identifiant du véhicule (VIN), état du mode Sentinelle et métadonnées des événements de sécurité (date/heure, type d’événement).',
        'Données de notification : votre jeton de notification push et vos préférences, et — si vous le liez — votre identifiant de discussion Telegram.',
        'Données techniques : journaux et diagnostics minimaux nécessaires au fonctionnement, à la sécurité et au dépannage du service.',
      ],
    },
    {
      heading: '2. Utilisation des données (finalités & base légale)',
      paragraphs: [
        'Fournir la surveillance et vous envoyer des alertes de sécurité (exécution de notre contrat avec vous).',
        'Associer les événements Sentinelle à votre compte et votre véhicule (exécution du contrat).',
        'Maintenir la fiabilité et la sécurité du service, y compris le diagnostic d’incidents (notre intérêt légitime et votre sécurité).',
        'Respecter les obligations légales applicables.',
      ],
    },
    {
      heading: '3. Intégration Tesla',
      paragraphs: [
        'Nous nous connectons à votre compte Tesla via l’API officielle Tesla Fleet, avec l’accès que vous autorisez explicitement. Nous ne demandons que les autorisations nécessaires à la surveillance et, si vous l’activez, à la réponse offensive.',
        'Vos jetons d’accès Tesla sont chiffrés au repos et ne sont jamais partagés. Veuillez également consulter l’Avis de confidentialité client Tesla.',
      ],
    },
    {
      heading: '4. Sous-traitants',
      paragraphs: [
        'Nous faisons appel à un petit nombre de sous-traitants agissant pour notre compte, notamment Expo (envoi des notifications push) et Telegram (le canal d’alerte optionnel).',
        'Nous utilisons également des prestataires opérationnels pour l’e-mail transactionnel, l’hébergement, la journalisation, la supervision des erreurs et le stockage. Ces prestataires peuvent évoluer dans le temps ; dans tous les cas, nous ne partageons que les données nécessaires à chaque fonction et exigeons des garanties appropriées (par exemple des accords de traitement des données et le chiffrement).',
        'Vous pouvez demander la liste à jour de nos sous-traitants à hello@sentryguard.org.',
      ],
    },
    {
      heading: '5. Durée de conservation',
      paragraphs: [
        'Nous conservons vos données personnelles uniquement le temps nécessaire à la fourniture du service. L’historique des alertes de sécurité est automatiquement supprimé au-delà d’une durée de conservation définie.',
        'Lorsque vous supprimez votre compte, votre profil, vos véhicules, vos jetons chiffrés et vos enregistrements de consentement sont supprimés.',
      ],
    },
    {
      heading: '6. Transferts internationaux',
      paragraphs: [
        'Certains prestataires peuvent traiter des données hors de votre pays. Lorsque requis, ces transferts sont encadrés par des garanties appropriées (par exemple des Clauses Contractuelles Types).',
      ],
    },
    {
      heading: '7. Sécurité',
      paragraphs: [
        'Nous appliquons des mesures administratives, techniques et physiques, incluant le chiffrement des données en transit et le chiffrement des jetons sensibles au repos. Aucun mot de passe n’est stocké : l’authentification est déléguée à Tesla.',
      ],
    },
    {
      heading: '8. Vos droits',
      paragraphs: [
        'Sous réserve de la loi applicable (notamment le RGPD), vous pouvez demander l’accès, la rectification ou la suppression de vos données personnelles, et retirer votre consentement à tout moment.',
        'Vous pouvez supprimer votre compte et toutes les données associées directement depuis les réglages de l’application, ou en nous contactant.',
      ],
    },
    {
      heading: '9. Mineurs',
      paragraphs: [
        'SentryGuard ne s’adresse pas aux enfants et est destiné aux titulaires d’un compte Tesla.',
      ],
    },
    {
      heading: '10. Modifications & contact',
      paragraphs: [
        'Nous pouvons mettre à jour cette politique ; la date de dernière révision figure ci-dessus.',
        `Questions ou demandes : ${CONTACT_EMAIL}.`,
      ],
    },
  ],
};

const termsEn: LegalDocument = {
  title: 'Terms of Service',
  lastUpdated: LAST_UPDATED,
  intro:
    'These Terms govern your use of SentryGuard. By creating an account or using the app, you agree to them.',
  sections: [
    {
      heading: '1. The service',
      paragraphs: [
        'SentryGuard monitors your Tesla’s Sentry Mode and sends security alerts via push and, optionally, Telegram. Some features (e.g., break-in monitoring and the offensive response) may be in beta or require additional Tesla authorizations.',
      ],
    },
    {
      heading: '2. Eligibility & Tesla account',
      paragraphs: [
        'You must be the legitimate holder of, or authorized user for, the Tesla account and vehicle you connect. You are responsible for the authorizations you grant.',
      ],
    },
    {
      heading: '3. Acceptable use',
      paragraphs: [
        'You agree not to misuse the service, attempt to access other users’ data, or use it to trigger vehicle commands on a vehicle you do not own or control.',
      ],
    },
    {
      heading: '4. Offensive response feature',
      paragraphs: [
        'If you enable the offensive response, the service may send commands to your vehicle (e.g., sounding the horn) in response to detected events. You are solely responsible for enabling this feature and for compliance with local laws regarding noise and vehicle operation.',
      ],
    },
    {
      heading: '5. Availability & no warranty',
      paragraphs: [
        'SentryGuard is a community, open-source project provided “as is” and “as available”. We do not guarantee uninterrupted monitoring or delivery of every alert, and the service must not be relied upon as your sole security measure.',
      ],
    },
    {
      heading: '6. Limitation of liability',
      paragraphs: [
        'To the maximum extent permitted by law, we are not liable for indirect or consequential damages, or for missed or delayed alerts arising from factors outside our control (e.g., Tesla API, network, or third-party outages).',
      ],
    },
    {
      heading: '7. Termination',
      paragraphs: [
        'You may stop using the service and delete your account at any time from the app settings. We may suspend or terminate access in case of misuse or legal requirement.',
      ],
    },
    {
      heading: '8. Changes & contact',
      paragraphs: [
        'We may update these Terms; the latest revision date is shown above.',
        `Questions: ${CONTACT_EMAIL}.`,
      ],
    },
  ],
};

const termsFr: LegalDocument = {
  title: 'Conditions Générales d’Utilisation',
  lastUpdated: LAST_UPDATED,
  intro:
    'Les présentes Conditions régissent votre utilisation de SentryGuard. En créant un compte ou en utilisant l’application, vous les acceptez.',
  sections: [
    {
      heading: '1. Le service',
      paragraphs: [
        'SentryGuard surveille le mode Sentinelle de votre Tesla et envoie des alertes de sécurité par push et, en option, via Telegram. Certaines fonctionnalités (par ex. la détection d’effraction et la réponse offensive) peuvent être en bêta ou nécessiter des autorisations Tesla supplémentaires.',
      ],
    },
    {
      heading: '2. Éligibilité & compte Tesla',
      paragraphs: [
        'Vous devez être le titulaire légitime, ou un utilisateur autorisé, du compte Tesla et du véhicule que vous connectez. Vous êtes responsable des autorisations que vous accordez.',
      ],
    },
    {
      heading: '3. Usage acceptable',
      paragraphs: [
        'Vous vous engagez à ne pas détourner le service, à ne pas tenter d’accéder aux données d’autres utilisateurs, et à ne pas l’utiliser pour déclencher des commandes sur un véhicule que vous ne possédez pas ou ne contrôlez pas.',
      ],
    },
    {
      heading: '4. Fonctionnalité de réponse offensive',
      paragraphs: [
        'Si vous activez la réponse offensive, le service peut envoyer des commandes à votre véhicule (par ex. klaxonner) en réponse à des événements détectés. Vous êtes seul responsable de l’activation de cette fonctionnalité et du respect des lois locales relatives au bruit et à l’usage du véhicule.',
      ],
    },
    {
      heading: '5. Disponibilité & absence de garantie',
      paragraphs: [
        'SentryGuard est un projet communautaire open-source fourni « en l’état » et « selon disponibilité ». Nous ne garantissons pas une surveillance ininterrompue ni la délivrance de chaque alerte ; le service ne doit pas constituer votre unique mesure de sécurité.',
      ],
    },
    {
      heading: '6. Limitation de responsabilité',
      paragraphs: [
        'Dans la limite permise par la loi, nous ne sommes pas responsables des dommages indirects, ni des alertes manquées ou retardées résultant de facteurs hors de notre contrôle (par ex. API Tesla, réseau, pannes de tiers).',
      ],
    },
    {
      heading: '7. Résiliation',
      paragraphs: [
        'Vous pouvez cesser d’utiliser le service et supprimer votre compte à tout moment depuis les réglages de l’application. Nous pouvons suspendre ou résilier l’accès en cas d’usage abusif ou d’obligation légale.',
      ],
    },
    {
      heading: '8. Modifications & contact',
      paragraphs: [
        'Nous pouvons mettre à jour ces Conditions ; la date de dernière révision figure ci-dessus.',
        `Questions : ${CONTACT_EMAIL}.`,
      ],
    },
  ],
};

export const privacyPolicy: Record<LegalLocale, LegalDocument> = { en: privacyEn, fr: privacyFr };
export const termsOfService: Record<LegalLocale, LegalDocument> = { en: termsEn, fr: termsFr };

export function resolveLegalLocale(locale: string): LegalLocale {
  return locale === 'fr' ? 'fr' : 'en';
}
