# Deploy later — public link on Founder yes (same pattern as WhatsApp app)

This app is Phase 1: local + draft-only. It does NOT publish to any social account.

## Local test
```bash
ADMIN_PASSWORD=apna-strong-password node server.js
# http://localhost:3000 — login: owner
```

## Public link (when Founder says yes)
1. Put this folder in a GitHub repo.
2. Deploy on SnapDeploy free (Dockerfile included, port 3000) or another free host that runs Node — Netlify cannot run this Node backend.
3. Set ONLY ADMIN_PASSWORD in host env. Leave social tokens blank — this app has no social token fields by design.
4. Verify: public URL loads, Owner Login shows, /api/health returns ok:true, mode draft_only, dashboard shows 30-day calendar, Day 1 package, and analytics TBD (not invented).
5. Free-tier honesty: container sleeps when idle, SQLite disk is not permanent — move to Postgres before this becomes the permanent content/analytics record.

## After deploy, still NOT automatic publishing
Publishing to Instagram/Facebook/YouTube happens only through the platform's own flow / Founder-approved API step, with a real URL entered back into this app. This app tracks and reports; it does not claim to have published anything it did not.
