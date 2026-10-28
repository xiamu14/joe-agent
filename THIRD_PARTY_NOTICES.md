# Rare UI components

The fluid shader in `web/src/orb-shaders.js` is adapted from [Rare UI FluidOrb](https://www.rareui.com/components/fluidorb), with the original fluid field and color bands. Rendering uses the existing Three.js lifecycle, and the circular edge uses defined smoothstep bounds.

The static workspace also uses the official [FAQ](https://www.rareui.com/components/faq), [Fluid Orb](https://www.rareui.com/components/fluidorb), [Bounce Sidebar](https://www.rareui.com/components/bouncesidebar), and [Task List](https://www.rareui.com/components/tasklist) sources in `web/src/components/rare-ui/`. Import paths and the Next.js link were adapted to this React application; Task List was split into two files.

[Inline AI Status](https://www.rareui.com/components/aistatus) is vendored from the official Rare UI registry in `ai-status.tsx` and `ai-status-icon.tsx`. Only the import paths and file split were adapted; backend state labels use the component props.


MIT + Commons Clause License Condition v1.0 + Attribution

Copyright (c) 2026 Swami Malode

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, and distribute the Software as part of an
application, website, or product, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

Attribution Requirement

Any project that ships any part of the Software must credit Rare UI with a
visible link to https://rareui.com, placed where a visitor or user can find it,
such as a site footer, an about page, a credits screen or a README. The credit
and the copyright notice above must not be removed from the source you copied.

Commons Clause Restriction

You may use this Software, including for any commercial purpose, so long as you
do not sell, sublicense, or redistribute the components themselves, whether
alone, in a bundle, or as a ported version.

No Warranty

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

# OrbKit SHDR-01

The empty-canvas orb uses [OrbKit SHDR-01](https://orbkit.zzzzshawn.cloud/), a shader by [XorDev](https://x.com/XorDev), ported by zzzzshawn with permission. The shader is for **non-commercial use only**, with attribution to XorDev; its source notice is preserved.

The runtime is adapted from the official registry, split into smaller modules, with unused decorative wrappers omitted. The shader and default presets are unchanged.

MIT License

Copyright (c) 2026 zzzzshawn

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

# Licence for the ported shaders

The orb files listed under "Shaders by XorDev" in [OrbKit CREDITS.md](https://github.com/zzzzshawn/orbkit/blob/main/CREDITS.md) are
derived from shaders by XorDev (https://x.com/XorDev) and are used with the
author's permission on these terms:

1. Non-commercial use only.
2. Attribution to XorDev must be kept with every copy, including the notice at
   the top of each file.
3. Any further use of XorDev's work requires asking the author first.

Everything else in this repository, including the runtime
(`orbkit-core.tsx`), the site, the build scripts, and the original orbs, is
licensed under the MIT licence in [LICENSE](LICENSE).
