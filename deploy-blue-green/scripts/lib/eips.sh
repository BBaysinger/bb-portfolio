#!/usr/bin/env bash
# Centralized Elastic IP constants for bb-portfolio
# Override via environment variables if needed before invoking scripts.

# Production (green/active) EIP
export PROD_EIP="${PROD_EIP:-44.246.43.116}"

# Blue (candidate) EIP - typically attached to staging/candidate
export BLUE_EIP="${BLUE_EIP:-52.37.142.50}"

# Red (tainted/problem) EIP - reserved for tainted instances
export RED_EIP="${RED_EIP:-35.167.120.233}"
