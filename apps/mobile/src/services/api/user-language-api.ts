import { requestApi } from './api-client';

export enum UserLanguage {
  English = 'en',
  French = 'fr',
}

export interface UserLanguageResponse {
  language: UserLanguage;
}

export function getUserLanguage(): Promise<UserLanguageResponse> {
  return requestApi<UserLanguageResponse>('/user/language');
}

export function updateUserLanguage(language: UserLanguage): Promise<UserLanguageResponse> {
  return requestApi<UserLanguageResponse>('/user/language', {
    body: JSON.stringify({ language }),
    method: 'PATCH',
  });
}
