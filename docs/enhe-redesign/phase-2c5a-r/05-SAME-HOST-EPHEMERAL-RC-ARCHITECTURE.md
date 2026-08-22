# Same-Host Ephemeral RC Architecture

## Locked topology

```text
RC_COMPOSE_PROJECT=enhe-public-rc1-ephemeral
RC_ACCESS=SSH_TUNNEL_LOOPBACK_ONLY
RC_APP_BIND=127.0.0.1:3101
RC_DB_HOST_BIND=NONE
RC_MAX_WINDOW_MINUTES=90
STAGING_HOST_ISOLATION=LOGICAL_CONTAINER_ISOLATION
STAGING_PERSISTENCE=TEMPORARY_ACCEPTANCE_WINDOW
```

The operator reaches the RC app through an SSH tunnel to the host loopback listener. The app and database communicate on isolated RC networks. The database network is internal. No RC listener is exposed on a public interface.

```text
operator loopback
  -> authorized SSH tunnel
    -> host 127.0.0.1:3101
      -> RC app on isolated app network
        -> RC database on internal DB network
```

## Isolation invariants

- No production network, database, container, volume, secret, Compose project, or container name is reused.
- No production Nginx configuration, DNS record, domain, certificate, public port, crawler route, sitemap submission, or Search Console property is added or changed.
- No long-running RC website or database remains after the acceptance window.
- No host database port is bound.
- No production process is restarted, recreated, reconfigured, paused, or scaled.
- RC ownership labels must make every created resource attributable to `enhe-public-rc1-ephemeral`.
- Start is forbidden unless the capacity gate, port-free check, RC-conflict check, immutable-image check, and production baseline fingerprint all close with fresh evidence.

## Mandatory resource labels

```text
com.enhe.rc.id=ENHE-PHASE2C4-PUBLIC-RC1
com.enhe.ephemeral=true
com.enhe.phase=phase2c5b
```

The staging wrapper must apply all three exact labels to every RC-created container and network. Create, inspect, stop, and cleanup selectors must match all three labels simultaneously. Fuzzy name, prefix, substring, or single-label selection is prohibited.

## Model boundary

```text
NEW_WEBSITE_CREATED=NO
SECOND_LONG_RUNNING_WEBSITE=NO
SECOND_LONG_RUNNING_DATABASE=NO
NEW_PUBLIC_STAGING_DOMAIN_REQUIRED=NO
SAME_HOST_EPHEMERAL_RC_ISOLATION_STATUS=PASS
RC_RUNTIME_DEPLOYED=NO
```

The isolation status is a design-contract result, not runtime evidence. Phase 2C.5B validates only this temporary RC. Production replacement remains `PHASE_2C_6_IN_PLACE_PRODUCTION_UPGRADE`.
