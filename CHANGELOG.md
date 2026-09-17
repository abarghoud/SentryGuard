# Changelog

Notable changes to SentryGuard, newest first.

**Self-hosters: read this before `docker compose pull`.** Images are published as `:latest` on every push
to `main`, so a pull can bring in a change that needs a new variable. Entries marked **BREAKING** require
action before the new image starts. See [SELF_HOSTING.md §8.4](SELF_HOSTING.md#84-updating-an-existing-installation).

## BREAKING — the vehicle-command hop is now TLS-verified

The API used to accept **any** TLS certificate from **any** host when talking to the vehicle-command proxy,
on the hop that carries your decrypted Tesla access tokens. It now verifies that certificate, and there is
no flag to turn the check back off.

**Action required before updating** — add to your `.env`:

```bash
# Let's Encrypt setup: pin the ISRG roots (valid to 2035/2040, so renewals need no further change)
echo "TESLA_PROXY_CA_CERT_BASE64=$(cat /etc/ssl/certs/ISRG_Root_X1.pem /etc/ssl/certs/ISRG_Root_X2.pem | base64 -w 0)"

# Own CA setup: pin your root
echo "TESLA_PROXY_CA_CERT_BASE64=$(base64 -w 0 fleet-telemetry/certs/ca.crt)"
```

It must be a **self-signed root**. `chain.pem` does *not* work here even though it is the correct value for
`LETS_ENCRYPT_CERTIFICATE`: it is an intermediate, and Node rejects it with `UNABLE_TO_GET_ISSUER_CERT`.

Without the variable the API container prints the migration steps and stops, rather than starting with the
hop unprotected. Full guide: [SELF_HOSTING.md §7.6](SELF_HOSTING.md#76-pinning-the-vehicle-command-hop).

## Changed

- `vehicle-command` is now aliased on the Docker network to your `TESLA_FLEET_TELEMETRY_SERVER_HOSTNAME`,
  and the API dials that name. Hostname verification therefore matches the certificate you already reuse
  from fleet-telemetry, with nothing extra to configure. `TESLA_PROXY_TLS_SERVERNAME` overrides the verified
  name if your certificate is issued for something else.
- `TESLA_API_BASE_URL` no longer has a compiled-in default; the self-host compose sets it for you.
- Image tags are selectable with `SENTRYGUARD_IMAGE_TAG` (default `latest`). Set it to a commit sha to
  update deliberately instead of following `main`.

## Fixed

- The self-hosting guide claimed the API would accept the vehicle-command certificate "even if the domain
  doesn't match". That was true only because verification was disabled; it is no longer the case.
