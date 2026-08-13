import Rollbar from 'rollbar';

const baseConfig = {
  captureUncaught: true,
  captureUnhandledRejections: true,
  environment: process.env.NODE_ENV,
  scrubFields: ['token', 'jwt_token', 'accessToken', 'refresh_token', 'authorization', 'vin', 'link_token'],
  scrubTelemetryInputs: true,
  scrubRequestBody: true,
};

export const serverInstance = new Rollbar({
  accessToken: process.env.ROLLBAR_SERVER_TOKEN,
  ...baseConfig,
});