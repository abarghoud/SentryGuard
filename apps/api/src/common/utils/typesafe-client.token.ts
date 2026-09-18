import { Provider } from '@nestjs/common';
import { getTypeSafeClient } from './typesafe-client.util';

export const typeSafeClient = Symbol('typeSafeClient');

export const typeSafeClientProvider: Provider = {
  provide: typeSafeClient,
  useFactory: getTypeSafeClient,
};
