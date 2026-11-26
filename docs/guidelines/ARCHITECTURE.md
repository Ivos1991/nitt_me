# Architecture

Use Expo and React Native with TypeScript for the app and Three.js for the viewer. Keep dependencies pointing toward the crochet model and its use cases. Treat screens, storage, and rendering as adapters.

## Folder structure

Create directories as their responsibilities emerge.

| Path | Responsibility |
| --- | --- |
| `src/app/` | Expo Router route files, layouts, providers, and route parameters |
| `src/features/patterns/` | Pattern editor, import and export flows, and feature hooks |
| `src/features/viewer/` | Viewer screen, camera controls, selection, and display options |
| `src/domain/crochet/` | Pattern types, stitch rules, validation, normalization, and topology |
| `src/application/` | Use cases such as opening, editing, and saving patterns, with storage interfaces |
| `src/rendering/` | Pure geometry generation and Three.js scene integration in separate modules |
| `src/infrastructure/` | Storage, file import, and platform API implementations |
| `src/shared/` | UI primitives and utilities with multiple real consumers |

Keep route files thin. Compose feature screens and route-level dependencies there. Keep tests beside their subjects or under `tests/`, outside the route tree. Keep domain code free of React, Expo, Three.js, and persistence imports. The application layer depends on the domain and declares its external interfaces. Platform adapters implement those interfaces. Wire adapters at the app or feature entry point.

## Pattern and scene data

Own pattern truth in a serializable model with stable stitch IDs, explicit connection semantics, and a versioned file schema. Normalize imported data before it reaches use cases. Preserve supported older formats through explicit migrations and leave the original available if migration fails. Keep camera state, selected stitch, and render quality outside the saved pattern unless a product feature explicitly saves viewer settings.

Use this flow: validated pattern → stitch topology and layout → mesh data → Three.js scene. Make geometry generation deterministic and testable without a graphics context. Pass renderer-neutral buffers, transforms, and stitch IDs to the scene adapter. Keep a stable mapping from rendered parts back to their source stitches.

## State ownership

- Keep temporary screen state local. Use a typed reducer for related edit transitions with invariants or undo requirements. Scope context to the feature when several consumers need the same state.
- Derive stitch counts, selected entities, and mesh inputs from their canonical data. Store selection by ID and represent mutually exclusive loading, ready, and error states with a discriminated union.
- Keep per-frame transforms in the viewer runtime. Publish meaningful changes such as selection or settled camera settings at the appropriate boundary.
- Add app-wide state dependencies only after local state and scoped context prove insufficient and the owner confirms the change.

References: [Expo Router core concepts](https://docs.expo.dev/router/basics/core-concepts/), [React state structure](https://react.dev/learn/choosing-the-state-structure), [React reducer and context](https://react.dev/learn/scaling-up-with-reducer-and-context).
