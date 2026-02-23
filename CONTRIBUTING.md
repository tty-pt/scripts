Thanks for wanting to contribute — this file has a short checklist to get you started.

Branching
- Use feature/short-desc or fix/short-desc branches.

Commits
- Use Conventional Commits (feat|fix|chore|docs|test|refactor): one-liner summary.

Working locally
- Install dependencies: `pnpm install`
- Run tests: `pnpm test`
- Lint: `pnpm lint`
- Build: `pnpm build`

Pull Requests
- Open a PR from a topic branch with a clear description.
- Include tests for new behavior where reasonable.
- Update README/examples if applicable.
- Ensure CI passes and address review comments.

Maintainer notes
- Use `pnpm pack --pack-destination /tmp` to create a tarball for local install testing.
