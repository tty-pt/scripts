Release checklist

1. Bump version in `package.json` following SemVer.
2. Run `pnpm install && pnpm build && pnpm test`.
3. Create a tarball: `pnpm pack --pack-destination /tmp` and test by installing in a temp project.
4. Push tag and create GitHub release with changelog.
