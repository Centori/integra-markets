# mcp.integramarkets.app — TLS in front of the Railway origin

Nothing runs here. This is a Vercel project that exists only to terminate TLS
for `mcp.integramarkets.app` and pass every request through to the Railway
service that actually serves the MCP.

## Why it exists

Railway never issued a certificate for `mcp.integramarkets.app`. The domain sat
in `CERTIFICATE_STATUS_TYPE_VALIDATING_OWNERSHIP` from 2026-09-08 with DNS
propagated, CAA permitting letsencrypt.org, port 80 reachable, and the domain
attached to the service — the same configuration under which
`api.integramarkets.app` got a certificate in the same account. Customers were
being handed `https://integra-mcp-production.up.railway.app/mcp` as the
connector URL in the meantime.

The DNS for this zone is already on Vercel, which issues certificates for
`www` and the dashboard without trouble, so the shortest path to a branded URL
was to let Vercel terminate TLS and leave Railway serving.

## The one thing to watch

MCP's Streamable HTTP transport answers over Server-Sent Events. A proxy that
buffers instead of streaming turns every tool call into a hang rather than an
error. This was tested on the deployment's own `.vercel.app` URL before the
custom domain was pointed at it — do the same after any change here:

    curl -N -X POST https://<deployment>/mcp \
      -H 'Content-Type: application/json' \
      -H 'Accept: application/json, text/event-stream' \
      -H 'Authorization: Bearer <key>' \
      -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

An immediate `event: message` line means it streamed.

## Removing it

If Railway ever issues the certificate, point the `mcp` CNAME back at the
Railway target, remove the domain from this project, and delete this
directory. The connector URL does not change, so nobody has to re-add it.
