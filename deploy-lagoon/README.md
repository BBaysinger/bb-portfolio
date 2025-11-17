# Lagoon (Blue/Green Deploys)

Lagoon is the codename for the blue/green deployment system.

Entry points:

- Orchestrator: `deploy-lagoon/scripts/lagoon-orchestrator.sh`
- Promote (EIP handover): `deploy/scripts/orchestrator-promote.sh`

These wrappers delegate to the blue/green scripts and keep paths stable while we converge naming.
