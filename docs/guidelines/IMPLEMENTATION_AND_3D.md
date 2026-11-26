# Implementation and 3D

## Native viewer integration

Use Expo development builds for the native integration and release builds for performance verification. Start by testing a minimal scene using React Three Fiber's native entry point and Expo GL. Three.js remains the rendering engine. Check the supported Expo SDK, React, Fiber, and Three.js versions together and lock the combination only after the prototype works. Verify WebGL 2 support and actual renderer initialization on physical iOS and Android devices. Include orbit, touch picking, resize, background and resume, and repeated screen entry in this check. Document the working combination and device coverage. Ask the owner before pursuing a materially different integration if the prototype fails.

Keep the viewer behind an adapter. Provide a clear loading state, a retryable error when possible, and access to the pattern information when rendering is unavailable. Cancel or invalidate work on navigation and pattern changes. Pause rendering when the screen loses focus or the app is inactive. On return, refresh dimensions and presentation and recover or recreate resources when the context is unusable. With a direct Expo GL adapter, present each completed frame according to its API. Let a wrapper that owns frame presentation do that work.

References: [Expo development builds](https://docs.expo.dev/develop/development-builds/introduction/), [Expo GLView](https://docs.expo.dev/versions/latest/sdk/gl-view/), [Fiber native setup and compatibility](https://r3f.docs.pmnd.rs/getting-started/installation), [Three.js WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html), [React Native AppState](https://reactnative.dev/docs/appstate).

## Crochet geometry and performance

- Use indexed buffer geometry for custom yarn meshes. Instance repeated stitches with matching base meshes and materials when it preserves their shape and picking behavior. Batch compatible static segments, retaining a mapping from each instance or segment to its stitch ID. Validate bounds or update them after changing instance transforms where required.
- Build geometry when relevant inputs change. Rebuild only affected regions when dependency boundaries make that safe. Bound stitch count, curve subdivisions, and buffer sizes before allocating. Keep large jobs cancellable and chunk synchronous work if profiling shows it blocks interaction.
- Prefer shared geometry and materials, simple lighting, and restrained texture sizes. Adjust pixel ratio and yarn tessellation based on measurements. Preserve pattern connectivity, selection, and legibility at every quality level.
- Render on demand when idle. Request frames for edits, gestures, selection, and any motion still settling. Reuse temporary vectors and transforms in frame loops. Coalesce frequent input updates and avoid React state changes for every frame.
- Release owned geometries, materials, textures, render targets, and applicable renderer resources when replaced or torn down. Cancel frame callbacks and remove listeners. Release shared resources after their last consumer. Verify repeated open, edit, and close cycles stabilize after warm-up.
- Aim for 60 frames per second during interaction on supported devices where achievable, with about 16.7 ms available per frame on a 60 Hz display. Establish a minimum device and a representative large fixture before release. Record device, build, pattern size, resolution, frame-time percentiles, draw calls, triangles, and memory trend. Use platform profilers for CPU, GPU, and memory where available and Three.js renderer statistics for scene counters. Set release thresholds from measured baselines and investigate regressions.

References: [React Native performance](https://reactnative.dev/docs/performance), [Fiber performance scaling](https://r3f.docs.pmnd.rs/advanced/scaling-performance), [Fiber performance pitfalls](https://r3f.docs.pmnd.rs/advanced/pitfalls), [Three.js instancing](https://threejs.org/docs/pages/InstancedMesh.html), [Three.js disposal](https://threejs.org/manual/pages/how-to-dispose-of-objects.html).

## Mobile interaction

Use native controls, safe areas, readable scalable text, and platform-appropriate touch targets. Provide clear orbit, zoom, and reset controls. Offer accessible controls for essential gesture actions and a text or list view for stitch details. Label buttons for assistive technology, expose state and feedback, support reduced motion, and show selection through more than color. Verify behavior with VoiceOver and TalkBack, large text, and interrupted gestures. [React Native accessibility](https://reactnative.dev/docs/accessibility).
