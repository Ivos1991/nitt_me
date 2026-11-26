# Infrastructure and security

## Continuous integration and delivery

- During app scaffolding, commit a package lockfile and specify compatible Node, package manager, and Expo SDK versions. Use a frozen install such as `npm ci` with npm. Use Expo's dependency tooling for compatible package versions and run Expo Doctor when dependencies or native configuration change.
- Configure pull request checks on GitHub Actions for a frozen install, lint, format, type checks, and the unit and integration suites. Require passing checks before merging to `main` once configured. Keep untrusted pull request jobs read-only and isolated from release credentials. Pin third-party actions to full commit SHAs and grant each job the minimum permissions it needs.
- Define EAS Build profiles in `eas.json` for development clients, internal previews, and production builds. Separate application identifiers or distribution settings as needed for safe parallel testing. Run device smoke tests on preview builds and test physical devices for native graphics changes.
- Gate production signing, submission, and over-the-air publication behind owner approval. Use protected environments and limited credentials. Track the commit, profile, build or update ID, and test results. If EAS Update is enabled, keep channels and runtime versions aligned and test a rollback on a non-production channel. Ship native compatibility changes with a new build and a compatible runtime.

References: [Expo Build](https://docs.expo.dev/build/introduction/), [EAS build profiles](https://docs.expo.dev/build/eas-json/), [EAS runtime versions](https://docs.expo.dev/eas-update/runtime-versions/), [GitHub Actions secure use](https://docs.github.com/en/actions/reference/security/secure-use).

## Secrets and mobile data

- Never commit secrets, tokens, signing keys, credentials, or local environment files containing values. Use ignored local files, a placeholder-only `.env.example` when configuration is needed, and EAS or GitHub managed secrets for trusted build jobs. Keep production and preview credentials separate and prevent credential values from reaching logs or artifacts.
- Treat any value embedded in a shipped app as public, including `EXPO_PUBLIC_*` values. Use them only for public configuration such as an API base URL. Put privileged keys on trusted infrastructure if one is approved. Store device-held credentials, if introduced, in platform-backed secure storage. Revoke and rotate exposed secrets promptly.
- Treat imported patterns and assets as untrusted. Allow only supported formats. Validate schemas, finite numbers, identifiers, counts, and file sizes before creating geometry. Bound expanded size when handling compressed data. Reject unsupported content with an actionable error and keep the existing pattern intact. Use operating-system file pickers and grant the minimum required permissions.
- Prefer local processing for user patterns. Request approval before introducing uploads or telemetry with sensitive data. Redact user content from logs. Use HTTPS for remote traffic and platform trust validation. Review dependency changes and minimize permissions, SDKs, and retained data. Use applicable OWASP MASVS controls for storage, network, platform interaction, and privacy as features are added.

References: [Expo environment variables](https://docs.expo.dev/guides/environment-variables/), [EAS environment variables](https://docs.expo.dev/eas/environment-variables/usage/), [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/), [OWASP MASVS](https://mas.owasp.org/MASVS/).
