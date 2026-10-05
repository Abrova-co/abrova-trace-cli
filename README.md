# Abrova Trace CLI

Uploads JavaScript source maps to Abrova Trace so that minified stack traces are shown with their original file names and line numbers.

## Requirements

- Node.js 18 or later

## Install

```
# .npmrc (in your project root)
@abrova-trace:registry=https://center.abrova.ir/api/packages/abrova/npm/
```

```
npm install --save-dev @abrova-trace/cli
```

Run it from your project with `npx`:

```
npx abrova-trace --help
```

## Quick start

You need a personal access token (it starts with `ab_pat_`) and your project ID. Both come from the Abrova console. A project API key does not work here.

```
export ABROVA_TRACE_TOKEN=ab_pat_your_token
export ABROVA_TRACE_PROJECT=your_project_id

npx abrova-trace sourcemaps upload ./dist --release 1.2.3
```

Every `.map` file in the directory and its subdirectories is uploaded and attached to the release. Use the same release value that you pass to the SDK as `release`.

## Usage

```
abrova-trace sourcemaps upload <directory> --release <version> [options]
```

| Flag | Environment variable | Description |
|---|---|---|
| `--release <version>` | none | Release the source maps belong to. Required. |
| `--project <id>` | `ABROVA_TRACE_PROJECT` | Project ID. Required, as a flag or a variable. |
| `--token <token>` | `ABROVA_TRACE_TOKEN` | Personal access token. Required, as a flag or a variable. |
| `--api-url <url>` | `ABROVA_TRACE_API_URL` | Base URL of the Trace API. Default: `https://trace.abrova.ir`. |
| `--dry-run` | none | List the files that would be uploaded without sending them. |

A flag takes precedence over its environment variable. The command exits with code `0` on success and `1` on any error, so a failed upload can stop a deployment.

### CI example

Upload the source maps of a Next.js build (with `productionBrowserSourceMaps: true` in `next.config.js`). Store `ABROVA_TRACE_TOKEN` and `ABROVA_TRACE_PROJECT` as secrets in your CI system.

```
npm ci
npm run build
npx abrova-trace sourcemaps upload .next/static/chunks --release "$NEXT_PUBLIC_APP_VERSION"
```

## License

MIT, see LICENSE
