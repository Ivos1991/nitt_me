# Code style

- Use TypeScript for application code. Extend the Expo base TypeScript configuration, enable `strict` and `noUncheckedIndexedAccess`, and run `tsc --noEmit`. Give exported domain and adapter boundaries explicit types and infer straightforward local values.
- Use `unknown` for unvalidated input and narrow it with runtime checks. Use discriminated unions and exhaustive handling for stitch variants and outcomes. Avoid `any`, unchecked assertions, and non-null assertions. Any unavoidable interop assertion requires a local explanation and a test of the invariant.
- Use PascalCase for React components and types, camelCase for functions and variables, and `use` for hooks. Name component files after their exported components. Use descriptive kebab-case for ordinary module files. Follow Expo Router's required names and conventions within the route tree.
- Prefer meaningful names such as `selectedStitchId` and `yarnRadiusMm`. Declare units, axes, winding, and tolerances at geometry boundaries. Explain mathematical invariants and unusual optimizations in comments.
- Use `const` by default, small single-purpose functions, and clear control flow. Keep app state updates immutable and confine performance-sensitive mutation to owned rendering buffers and transforms. Handle rejected promises and give errors enough context for diagnosis.
- Use Expo's ESLint configuration and the React Hooks rules. Apply Prettier through a committed configuration when scaffolding. Use two-space indentation and let the formatter govern syntax conventions. Keep formatting changes scoped to the work.
- Provide scripts for linting, format checking, and type checking during app setup. Fix the underlying issue before adding a lint suppression. Any necessary suppression must be narrow and explain the reason.

References: [Expo ESLint and Prettier](https://docs.expo.dev/guides/using-eslint/), [TypeScript strict](https://www.typescriptlang.org/tsconfig/strict.html), [TypeScript indexed access](https://www.typescriptlang.org/tsconfig/noUncheckedIndexedAccess.html), [Rules of React](https://react.dev/reference/rules).
