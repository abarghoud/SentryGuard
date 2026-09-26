const TESLA_SCHEME = 'tesla://';
const VIN_PLACEHOLDER = '{vin}';
const VIN_FORMAT = /^[A-HJ-NPR-Z0-9]{17}$/;

export function resolveTeslaCameraUrl(vin?: string): string | null {
  const template = readCameraUrlTemplate();

  if (!template || !isSupportedVin(vin)) {
    return null;
  }

  return template.split(VIN_PLACEHOLDER).join(vin);
}

function readCameraUrlTemplate(): string | null {
  const template = process.env.EXPO_PUBLIC_TESLA_CAMERA_DEEP_LINK_TEMPLATE?.trim();

  if (!template || !isUsableTemplate(template)) {
    return null;
  }

  return template;
}

function isUsableTemplate(template: string): boolean {
  return template.startsWith(TESLA_SCHEME) && template.includes(VIN_PLACEHOLDER);
}

function isSupportedVin(vin?: string): vin is string {
  return typeof vin === 'string' && VIN_FORMAT.test(vin);
}
