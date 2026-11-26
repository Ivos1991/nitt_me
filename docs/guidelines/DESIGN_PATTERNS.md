# Design patterns

## Composition and interfaces

- Compose feature screens from reusable React Native controls with typed props and documented accessibility behavior. Extract shared UI when consumers share semantics and behavior. Keep one-off UI in its feature.
- Keep calculations pure. Use event handlers for user-triggered actions and effects for synchronization with external systems. Unsubscribe and cancel outstanding work in cleanup. Make setup and teardown safe when repeated.
- Put file access and persistence behind narrow, typed adapters. Inject them at a feature or app entry point so tests can supply deterministic replacements.
- Use a reducer with explicit events for related editor transitions. Model expected failures with typed outcomes and translate them into actionable messages at the UI boundary.
- Use a typed stitch-to-builder mapping when stitch families genuinely need different geometry algorithms. Keep stitch rules and connectivity in the domain and expose a single geometry-building contract. Prefer a direct pure function for simple cases.

## Reuse and lifecycle

- Expose a small public interface per feature. Keep internal modules private and avoid cyclic dependencies or imports into another feature's internals.
- Give each Three.js allocation and subscription an owner. Document when ownership transfers and how shared resources are released. Apply the lifecycle rules in [Implementation and 3D](IMPLEMENTATION_AND_3D.md).
- When an edit or import triggers async geometry generation, associate the result with the source pattern revision. Cancel superseded jobs where supported and drop stale results. Retain the previous valid scene when a new result fails.
- Cache expensive results only after measuring. Key caches by all inputs that affect output, including pattern revision, geometry settings, and quality level. Evict by a bounded size or byte budget and release resources when ownership ends.
- Keep visual tokens and named interaction states consistent. Share behavior through composition and hooks with narrow responsibilities.

References: [React component purity](https://react.dev/learn/keeping-components-pure), [React effects](https://react.dev/learn/synchronizing-with-effects), [React reducer and context](https://react.dev/learn/scaling-up-with-reducer-and-context), [Three.js resource disposal](https://threejs.org/manual/pages/how-to-dispose-of-objects.html).
