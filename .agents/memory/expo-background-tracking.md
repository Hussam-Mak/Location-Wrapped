---
name: Expo background tracking
description: Native background task bootstrapping and verification limits for the Location Wrapped mobile app.
---

Background location callbacks need task registration at module scope before Router entry, not only from a mounted screen or context provider.

**Why:** The OS may launch the JavaScript bundle headlessly without rendering React. Registration inside a component would be absent in that case. Expo Go does not execute background location tasks, so a web preview or Expo Go session cannot validate background collection.

**How to apply:** Preserve an early import of the task module from the app entry. Test background transitions and permission revocation in an iOS/Android development build on a device; treat successful bundling as a build check, not proof of native runtime behavior.