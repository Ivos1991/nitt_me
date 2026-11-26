# Testing and QA

Run automated verification before finishing every task. When app scaffolding exists, use Jest with the Expo preset for unit tests, React Native Testing Library for component and integration tests, and Expo Router's test helpers for navigation integration. Add Maestro smoke flows after the first runnable app build. Put repeatable check commands in the repository and run the same commands locally and in CI.

## Required automated coverage

| Level | Required coverage |
| --- | --- |
| Unit | Add or update tests for each changed domain rule, parser, reducer, migration, or geometry algorithm. Cover normal input, invalid input, and relevant limits. |
| Integration | Add or update tests for changed user flows and boundaries. Exercise real domain and use case code with controlled storage, clock, or renderer adapters. Assert visible behavior, saved data, or emitted scene inputs. |
| Device smoke | Run relevant flows when changes affect navigation, persistence, native rendering, or gestures. Cover opening a pattern, interacting with the viewer, and recovery from a failed import or renderer initialization once those features exist. |
| Regression | Reproduce reported bugs in the smallest appropriate automated test. Confirm it fails on the old behavior when feasible and passes after the fix. |

Use deterministic fixtures for empty and invalid patterns, supported stitch variants, repeats, older schemas, and representative large patterns. Assert stable IDs, connectivity, finite coordinates, valid indices, and tolerances where applicable. Cover stale edits, failed or interrupted persistence, and repeated viewer teardown when those boundaries change. Assert outcomes observable by the user or adapter consumers. Use focused mocks at boundaries and reserve screenshots for visual regressions that benefit from them.

## Completion checks

- Run focused tests during development, then the full relevant unit and integration suites, lint, formatting checks, and type checking. Run applicable automated smoke flows against the build under test. Record exact commands and outcomes.
- For rendering changes, run the device checks in [Implementation and 3D](IMPLEMENTATION_AND_3D.md) on physical iOS and Android hardware when available. Check touch response, accessibility, resume, cleanup, and performance. JavaScript tests verify logic and adapter calls. Device checks verify the actual graphics path.
- Before the app test harness exists, run automated checks appropriate to the available files. For Markdown changes, use `git diff --check` against the changed content and automatically validate relative link targets and required guideline files. State that no app test suite exists yet.
- If a required check cannot run, report which check is blocked, the reason, and what was verified. Fix test failures before completion when within scope. Never claim an unrun test passed.

References: [Expo Jest setup](https://docs.expo.dev/develop/unit-testing/), [Expo Router integration testing](https://docs.expo.dev/router/reference/testing/), [Maestro on Expo Workflows](https://docs.expo.dev/eas/workflows/examples/e2e-tests/), [React Native testing overview](https://reactnative.dev/docs/testing-overview).
