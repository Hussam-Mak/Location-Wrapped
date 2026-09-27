---
name: Expo workspace packages
description: Installing Expo dependencies into the correct artifact in the pnpm monorepo.
---

The generic Node package installer attempted to add Expo packages at the workspace root and was rejected by pnpm's root check.

**Why:** The mobile artifact owns its dependencies, and a root installation would not establish the correct workspace package contract.

**How to apply:** Check Expo's bundled native-module versions, then use a pnpm command filtered to the mobile workspace package for SDK-aligned additions. Recheck Expo dependency alignment afterward.