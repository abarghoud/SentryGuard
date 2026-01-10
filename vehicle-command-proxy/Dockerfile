ARG TARGETPLATFORM
FROM --platform=$TARGETPLATFORM tesla/vehicle-command:0.4.0 AS vehicle-command-binary

FROM --platform=$TARGETPLATFORM ubuntu:22.04

LABEL maintainer="TeslaGuard Team"
LABEL description="Tesla Vehicle Command service without volumes"
LABEL version="1.0.0"

RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates && \
    rm -rf /var/lib/apt/lists/*

RUN groupadd -g 1001 vehicleuser && \
    useradd -u 1001 -g vehicleuser -s /usr/sbin/nologin -d /home/vehicleuser vehicleuser

RUN mkdir -p /config

COPY --from=vehicle-command-binary /usr/local/bin/tesla-http-proxy /usr/local/bin/tesla-http-proxy
RUN chmod +x /usr/local/bin/tesla-http-proxy

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

RUN chown -R vehicleuser:vehicleuser /config /entrypoint.sh

USER vehicleuser

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD pgrep tesla-http-proxy || exit 1

ENTRYPOINT ["/entrypoint.sh"]