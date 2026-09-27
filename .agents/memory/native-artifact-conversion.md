---
name: Native artifact conversion
description: Why replacing a web artifact with a native Expo artifact leaves a separate obsolete Library entry.
---

An artifact's kind cannot be changed from web to mobile in place. A native conversion requires a new Expo artifact. The old web workflow can be stopped, but the old artifact remains registered; the documented artifact callbacks do not include deletion.

**Why:** Replit's artifact metadata treats kind as immutable. Replit documentation says an artifact is deleted from the Library sidebar in the Project Editor, which also unregisters its preview workflow. Stopping the workflow alone does not delete the Library entry.

**How to apply:** When finishing a replacement rather than creating a companion app, present the mobile artifact and be transparent that the prior web entry still exists. Do not claim it has been deleted or erase its source directory as a substitute for proper artifact removal.