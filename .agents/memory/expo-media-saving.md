---
name: Expo media saving
description: SDK 57 photo-save API mismatch between type declarations and runtime behavior.
---

In this Expo SDK generation, the deprecated media-library save-to-library function remains typed but throws at runtime. Use the supported asset creation API for a captured local image instead.

**Why:** Static type checks and web PNG downloads both passed while native Save to Photos would always fail; platform-specific APIs need version-aware review.

**How to apply:** When changing mobile media exports, inspect the installed package's implementation and validate save permissions and result on actual iOS/Android development builds, not just web or typecheck.