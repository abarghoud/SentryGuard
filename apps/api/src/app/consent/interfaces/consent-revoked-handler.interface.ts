export const ConsentRevokedHandlerSymbol = Symbol('ConsentRevokedHandler');

export interface ConsentRevokedEvent {
  userId: string;
  vehicleVins: string[];
}

export interface ConsentRevokedHandler {
  handleConsentRevoked(event: ConsentRevokedEvent): Promise<void>;
}
