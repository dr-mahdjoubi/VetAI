# Render sleep mitigation — Batch F (audit item 5)

Status: COULD-NOT-VERIFY. No live effect is claimed anywhere in this
document, and no uptime-monitor account was created.

## What the audit could and could not establish

- Measured live (13 Nov 2026): every asset on the Render origin returned
  `Cache-Control: public, max-age=0, s-maxage=300`, with gzip/Brotli
  working. One sample showed TTFB 0.75s behind `cf-cache-status: HIT`.
- A single cached sample proves nothing about sleep/wake behaviour.
  Whether the Render service is a Static Site (which does not sleep) or
  a free Web Service (which sleeps after inactivity) cannot be
  determined from response headers. Only Noe can confirm the service
  type and plan from the Render dashboard. Until then, free-tier sleep
  is COULD-NOT-VERIFY — neither confirmed nor ruled out.
- The new `render.yaml` in the repo root (Batch F) declares cache
  headers for the Render mirror only. Its live effect is UNVERIFIED:
  nothing in this program deploys, and the file has only been
  YAML-validated locally. GitHub Pages and the Workers mirror ignore it.

## The periodic-ping option (mitigation, not a guarantee)

If the service turns out to be a sleeping free Web Service, the usual
mitigation is an external uptime monitor that requests the Render URL
(e.g. `https://drvet.onrender.com/`) every few minutes, keeping the
instance warm:

- How: Noe creates the monitor in his own uptime-monitor account (any
  provider he already uses), pointed at the Render URL, with a 5-minute
  interval. No credentials, code, or repo change is involved.
- Caveats, stated plainly:
  - It is a mitigation, not a guarantee: monitors can miss intervals,
    and Render may still spin the instance down.
  - It generates perpetual traffic to the site; if the plan is
    usage-metered, that traffic counts.
  - It does nothing for the GitHub Pages / Workers mirrors (which do
    not sleep in the same way) and nothing for first-visit cold starts
    after a deploy.
  - If the service is a Static Site, pinging is pointless — confirm the
    service type first.
- No account was created here, and none should be created by an agent:
  the monitor lives in Noe's own account under his own control.

## What would settle it

Noe checking the Render dashboard: service type (Static Site vs Web
Service) and plan. If it is a Static Site, close this item as not
applicable. If it is a free Web Service and cold starts matter, either
accept the ping mitigation above or upgrade the plan — both are Noe's
decisions.
