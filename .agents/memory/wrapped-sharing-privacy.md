---
name: Wrapped sharing privacy
description: Privacy boundary for images exported from personal location history.
---

Real-history Top Places images use generic ranked place labels, not the original names, even when those names look innocuous. Demo images can keep sanitized sample place names. Shared year summaries use coarse aggregate totals.

**Why:** A place name can reveal a home, health visit, workplace, or other sensitive routine without looking like an address. Regex-only filtering cannot guarantee privacy.

**How to apply:** Keep a separate allow-listed sharing model rather than exporting the in-app story directly. Show the exact output before invoking a share sheet or saving it. Avoid raw coordinates, IDs, timestamps, and personal place names in exported images.