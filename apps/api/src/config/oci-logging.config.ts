import { OciLoggingConfig } from '../common/services/oci-logging.service';

export function getOciLoggingConfig(): OciLoggingConfig {
  return {
    userOcid: process.env.OCI_USER_OCID,
    tenancyOcid: process.env.OCI_TENANCY_OCID,
    fingerprint: process.env.OCI_FINGERPRINT,
    privateKey: process.env.OCI_PRIVATE_KEY,
    privateKeyPath: process.env.OCI_PRIVATE_KEY_PATH,
    privateKeyBase64: process.env.OCI_PRIVATE_KEY_BASE64,
    region: process.env.OCI_REGION ?? '',
    logId: process.env.OCI_LOG_ID ?? '',
    enabled: process.env.OCI_LOGGING_ENABLED !== 'false',
  };
}

