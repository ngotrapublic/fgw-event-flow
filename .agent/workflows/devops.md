---
description: handle deployment, CI/CD pipelines, environment configuration, monitoring, and infrastructure tasks
---

Activate the **devops** skill set for this session.

1. Ask: "What infrastructure or deployment task do you need? (Deploy / CI setup / environment config / monitoring / performance audit)"
2. **Assess current state**: Review existing config files (`.env`, `Dockerfile`, CI configs).
3. **Plan the operation**:
   - Identify risks (downtime, data loss, cascading failures).
   - Prepare rollback strategy.
4. **Execute** the task:

   **Deploy:**
   - Build: `npm run build`
   - Run pre-deployment checks (lint, type check, tests).
   - Deploy to target environment.
   - Verify deployment health (status checks, logs).

   **Environment config:**
   - Document all required env vars in `.env.example`.
   - Never expose secrets in code or logs.
   - Use `.env.{environment}` pattern for multi-environment setups.

   **Monitoring setup:**
   - Add structured logging with timestamps and log levels.
   - Set up health check endpoints.
   - Configure alerts for critical errors.

5. **Post-deployment verification**: Confirm all services are healthy.
6. Report: "Operation complete. Status: [healthy/degraded]. Actions taken: [list]. Monitor for [X] minutes."
