# Security Policy

The Playwright Field Guide is primarily documentation and executable testing examples, but security reports are still taken seriously.

## What to report privately

Please avoid opening a public issue when a finding could expose:

- credentials, tokens, or secrets;
- a vulnerable dependency with a credible exploitation path in repository automation;
- unsafe example code that could materially compromise a reader's environment;
- a GitHub Actions or supply-chain weakness that could allow unauthorized code execution.

Use GitHub's private vulnerability reporting feature if it is enabled for this repository. If private reporting is unavailable, use a private contact method associated with the repository owner rather than publishing exploit details.

## Documentation corrections

Ordinary testing mistakes, stale Playwright advice, broken links, or non-sensitive code corrections should be reported through a normal issue or pull request.

## Supported versions

Until the first tagged release, only the current `main` branch is maintained. After releases begin, this policy will be updated if older release lines receive security fixes.

## Secrets in examples

Examples must never contain real credentials. Use obvious placeholders and environment variables for sensitive values.
