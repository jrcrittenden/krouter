## Next.js version

This app runs a Next.js release newer than most training data. APIs, conventions and
file structure differ from older versions: middleware is `src/proxy.js`, for example.
Before writing Next-specific code, read the matching guide in `node_modules/next/dist/docs/`
and heed its deprecation notices.

This file is maintained by hand. `agentRules: false` in `next.config.mjs` stops `next dev`
from writing its own block here, and `experimental.agentUpgrade: false` stops `next build`
and `next dev` from pausing on upgrade prompts. Upgrade Next deliberately, on a branch.
