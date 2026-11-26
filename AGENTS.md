# Instructions for working on nitt_me

nitt_me is a cross-platform mobile app for visualizing crochet patterns in 3D. The approved stack is Expo, React Native, TypeScript, and Three.js.

## Start every task here

On every prompt, before planning or making changes, read and strictly follow every Markdown file under `docs/guidelines/`. Enumerate the directory so new guidelines are included. The current required reading is:

- [Architecture](docs/guidelines/ARCHITECTURE.md)
- [Design patterns](docs/guidelines/DESIGN_PATTERNS.md)
- [Code style](docs/guidelines/CODE_STYLE.md)
- [Implementation and 3D](docs/guidelines/IMPLEMENTATION_AND_3D.md)
- [Testing and QA](docs/guidelines/TESTING_AND_QA.md)
- [Infrastructure and security](docs/guidelines/INFRASTRUCTURE_AND_SECURITY.md)

Treat these files as requirements. Surface conflicts or missing prerequisites before acting on the affected work.

## Work with the project owner

- The project owner is a non-coder. Always explain what changed, why it matters, and what was verified in simple, plain English. Explain any technical term needed for a decision.
- Ask for and receive the owner's confirmation before implementing major architectural changes. Examples include switching the mobile framework or renderer, changing the app-wide state or storage model, changing the persisted pattern format incompatibly, or adding a backend or native build architecture. Explain the reason, user impact, and migration implications first.
- Run automated tests appropriate to the work before finishing every implementation or documentation task. Use the checks in [Testing and QA](docs/guidelines/TESTING_AND_QA.md). Report what passed and any checks that were blocked, with the reason. Treat failures as unfinished work until fixed or explicitly reported as blocked.
