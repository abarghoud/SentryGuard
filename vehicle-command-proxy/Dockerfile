ARG TARGETPLATFORM
FROM --platform=$BUILDPLATFORM golang:1.23-alpine AS vehicle-command-binary
RUN apk add --no-cache git
WORKDIR /go/src/github.com/teslamotors/vehicle-command
RUN git clone https://github.com/abarghoud/vehicle-command-with-boombox.git . && git checkout a6468e67f7421b050a8e55cd2c771e4eb081ec06
ARG TARGETOS TARGETARCH
RUN GOOS=$TARGETOS GOARCH=$TARGETARCH CGO_ENABLED=0 go build -ldflags="-s -w" -o /usr/local/bin/tesla-http-proxy ./cmd/tesla-http-proxy

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

COPY vehicle-command-proxy/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

RUN chown -R vehicleuser:vehicleuser /config /entrypoint.sh

USER vehicleuser

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD pgrep tesla-http-proxy || exit 1

ENTRYPOINT ["/entrypoint.sh"]