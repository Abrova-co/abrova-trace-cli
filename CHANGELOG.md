# Changelog

## 0.1.1 - 2026-10-05

First public release.

- `abrova-trace sourcemaps upload <directory>` uploads every `.map` file in a directory, including subdirectories, to a release.
- Authentication with a personal access token, passed with `--token` or `ABROVA_TRACE_TOKEN`.
- Project selection with `--project` or `ABROVA_TRACE_PROJECT`.
- `--dry-run` lists the files that would be uploaded without sending them.
- `--api-url` or `ABROVA_TRACE_API_URL` sets the Trace API base URL.
- Exit code `1` on any error, for use in CI pipelines.
