# ARR Rebuild Cost Log

## Anthropic API Credit Balance

| Time (PDT) | Balance | Notes |
|---|---|---|
| 2026-04-01 05:30 | $94.45 | Morning start |
| 2026-04-01 08:00 | $92.53 | |
| 2026-04-01 14:20 | $81.68 | |
| 2026-04-01 14:35 | $79.76 | |
| 2026-04-01 15:40 | $78.39 | |
| 2026-04-01 17:43 | $76.74 | |
| 2026-04-01 18:42 | $75.58 | |
| 2026-04-01 18:50 | $99.58 | +$24 credit added. Auto-reload enabled: reloads to $90 when balance hits $60. |

## Burn Rate Analysis
- Total spent 5:30 AM → 6:42 PM (13h 12min): **$18.87**
- Average burn: **~$1.43/hour**
- Active cron session burn (2:20–3:40 PM): **~$3.29/hour**
- Estimated overnight burn (3 agents, ~11 sessions): **~$15–20**

## Auto-reload Status
- Enabled: YES
- Trigger: $60 remaining
- Reload to: $90
- This prevents silent API outages going forward.

## Current Balance (last known)
$99.58 as of 2026-04-01 18:50 PDT

---
_Update this file when you check the Anthropic dashboard. Coordinator reads this file each hour._
