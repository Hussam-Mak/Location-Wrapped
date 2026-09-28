---
name: Private map tiles
description: Privacy tradeoff for adding online street maps to a local-only location history app.
---

Real-place map markers can be positioned geographically without external requests. Loading third-party street tiles should remain an explicit choice for personal history; demo locations can load tiles without disclosing the user's tracked areas.

**Why:** An online tile request reveals the viewed geographic area to the map provider even when raw GPS points and visits are never uploaded. Quietly enabling tiles would contradict the app's private-history promise.

**How to apply:** Keep real-history tile loading opt-in, explain the request before enabling it, and make the local coordinate-based marker view usable without tiles. Revisit only if using on-device maps with equivalent privacy or the user deliberately chooses a hosted mapping service.