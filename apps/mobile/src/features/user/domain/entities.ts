export enum UserLanguage {
  English = 'en',
  French = 'fr',
  German = 'de',
  Dutch = 'nl',
  Norwegian = 'no',
  Spanish = 'es',
  Italian = 'it',
  Swedish = 'sv',
  Danish = 'da',
}

export interface UserLanguageResponse {
  language: UserLanguage;
}
