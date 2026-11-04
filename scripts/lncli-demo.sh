#!/usr/bin/env bash
# LND tutorial stage 1 evidence: drive the Polar regtest cluster with lncli.
#   ./scripts/lncli-demo.sh            (alice creates an invoice, bob pays it)
# Requires: Polar network running, bob → alice channel open.
source "$(dirname "$0")/_common.sh"

step "alice: getinfo (the freelancer's node)"
alice getinfo | grep -E '"(alias|identity_pubkey|num_active_channels|synced_to_chain|block_height)"'

step "bob: listchannels (bob → alice channel)"
bob listchannels | grep -E '"(remote_pubkey|capacity|local_balance|remote_balance|active)"'

step "alice: addinvoice 1000 sats"
INV=$(alice addinvoice --amt 1000 --memo "lncli demo")
echo "$INV"
BOLT11=$(echo "$INV" | grep -o '"payment_request": *"[^"]*"' | cut -d'"' -f4)
RHASH=$(echo "$INV" | grep -o '"r_hash": *"[^"]*"' | cut -d'"' -f4)

step "alice: lookupinvoice (before payment → OPEN)"
alice lookupinvoice "$RHASH" | grep -E '"(state|value|amt_paid_sat)"'

step "bob: payinvoice"
bob payinvoice --force "$BOLT11" | tail -n 5

step "alice: lookupinvoice (after payment → SETTLED)"
alice lookupinvoice "$RHASH" | grep -E '"(state|amt_paid_sat|settle_date)"'
