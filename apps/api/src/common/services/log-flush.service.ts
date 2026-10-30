import { OciTransportStream } from '../transports/oci-transport-stream';

export class LogFlushService {
  public constructor(private readonly ociTransportStream: OciTransportStream | null) {}

  public async flush(): Promise<void> {
    if (!this.ociTransportStream) {
      return;
    }

    await this.ociTransportStream.flushPending();
  }
}
