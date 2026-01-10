ARG TARGETPLATFORM
FROM --platform=$TARGETPLATFORM tesla/fleet-telemetry:v0.7.2 AS fleet-binary

FROM --platform=$TARGETPLATFORM ubuntu:22.04

LABEL maintainer="TeslaGuard Team"
LABEL description="Tesla Fleet Telemetry service without volumes"
LABEL version="1.0.0"

RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates && \
    rm -rf /var/lib/apt/lists/*

RUN groupadd -g 1001 fleetuser && \
    useradd -u 1001 -g fleetuser -s /usr/sbin/nologin -d /home/fleetuser fleetuser

RUN mkdir -p /etc/fleet-telemetry/certs

COPY --from=fleet-binary /fleet-telemetry /fleet-telemetry
RUN chmod +x /fleet-telemetry

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

RUN chown -R fleetuser:fleetuser /etc/fleet-telemetry /entrypoint.sh /fleet-telemetry

USER fleetuser

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD pgrep fleet-telemetry || exit 1

ENTRYPOINT ["/entrypoint.sh"]