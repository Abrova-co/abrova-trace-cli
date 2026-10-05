import { readdirSync, statSync, createReadStream } from 'node:fs';
import { join, resolve, basename } from 'node:path';
import FormData from 'form-data';
import pc from 'picocolors';

interface UploadOptions {
  directory: string;
  project?: string;
  release: string;
  token?: string;
  apiUrl?: string;
  dryRun: boolean;
}

const DEFAULT_API_URL = 'https://trace.abrova.ir';

export async function sourcemapsUpload(opts: UploadOptions): Promise<void> {
  const token = resolveToken(opts.token);
  const projectId = resolveProject(opts.project);
  const apiUrl = resolveApiUrl(opts.apiUrl);
  const directory = resolve(opts.directory);
  const files = collectMapFiles(directory);

  if (files.length === 0) {
    throw new Error(`No .map files found in ${directory}`);
  }

  const totalBytes = files.reduce((sum, f) => sum + statSync(f).size, 0);

  console.log(pc.bold(`\nAbrova Trace — sourcemaps upload`));
  console.log(`  directory: ${pc.dim(directory)}`);
  console.log(`  files:     ${pc.cyan(String(files.length))} (${humanBytes(totalBytes)})`);
  console.log(`  release:   ${pc.cyan(opts.release)}`);
  console.log(`  project:   ${pc.dim(projectId)}`);
  console.log(`  api:       ${pc.dim(apiUrl)}`);

  if (opts.dryRun) {
    console.log(pc.yellow(`\n[dry-run] Would upload ${files.length} files. Skipping request.`));
    for (const f of files.slice(0, 10)) {
      console.log(`  ${pc.dim('•')} ${basename(f)}`);
    }
    if (files.length > 10) console.log(pc.dim(`  ... and ${files.length - 10} more`));
    return;
  }

  console.log(pc.dim(`\nuploading...`));
  const started = Date.now();

  const url = `${apiUrl}/api/projects/${encodeURIComponent(projectId)}/sourcemaps`;
  const form = new FormData();
  form.append('release', opts.release);
  for (const f of files) {
    form.append('sourcemaps', createReadStream(f), { filename: basename(f) });
  }

  const response = await postFormData(url, form, token);
  const elapsed = ((Date.now() - started) / 1000).toFixed(1);

  if (response.status < 200 || response.status >= 300) {
    const body = safeParse(response.body);
    const errMsg = body?.error || body?.message || response.body || 'Unknown error';
    throw new Error(`HTTP ${response.status}: ${errMsg}`);
  }

  const body = safeParse(response.body) || {};
  const count = body.count ?? files.length;
  console.log(pc.green(`\n✓ Uploaded ${count} sourcemap${count === 1 ? '' : 's'} in ${elapsed}s`));
  if (Array.isArray(body.errors) && body.errors.length > 0) {
    console.log(pc.yellow(`  ${body.errors.length} file(s) had errors:`));
    for (const err of body.errors.slice(0, 5)) {
      console.log(pc.yellow(`    ${err.file}: ${err.error}`));
    }
  }
}

// ─── helpers ─────────────────────────────────────────────────────────────

function resolveToken(explicit?: string): string {
  const token = explicit || process.env.ABROVA_TRACE_TOKEN;
  if (!token) {
    throw new Error(
      'No token provided. Pass --token ab_pat_xxx or set ABROVA_TRACE_TOKEN. ' +
      'Create a token at https://console.abrova.ir/dashboard/settings/tokens',
    );
  }
  if (!token.startsWith('ab_pat_')) {
    throw new Error(
      'Token must be a personal access token starting with "ab_pat_". ' +
      'Get one at https://console.abrova.ir/dashboard/settings/tokens',
    );
  }
  return token;
}

function resolveApiUrl(explicit?: string): string {
  return explicit || process.env.ABROVA_TRACE_API_URL || DEFAULT_API_URL;
}

/**
 * Project ID lookup order: explicit --project flag → ABROVA_TRACE_PROJECT
 * env var → legacy ABROVA_TRACE_DSN env var (kept so existing CI configs
 * don't break silently). Explicit --dsn is handled at the cli layer.
 */
function resolveProject(explicit?: string): string {
  const projectId =
    explicit ||
    process.env.ABROVA_TRACE_PROJECT ||
    process.env.ABROVA_TRACE_DSN;
  if (!projectId) {
    throw new Error(
      'No project ID provided. Pass --project <id> or set ABROVA_TRACE_PROJECT. ' +
      'Copy your project ID from the Trace dashboard.',
    );
  }
  return projectId;
}

/**
 * Walk `dir` recursively, returning the full path of every *.map file.
 * We stay simple: sync recursion, no exclude patterns. Users pointing at
 * bundle dirs like Sareban's `sourcemaps/2.0.6+112-staging/` will typically
 * have a flat folder anyway.
 */
function collectMapFiles(dir: string): string[] {
  const out: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch (err: any) {
    throw new Error(`Cannot read directory ${dir}: ${err.message}`);
  }

  for (const entry of entries) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      out.push(...collectMapFiles(full));
    } else if (entry.endsWith('.map')) {
      out.push(full);
    }
  }
  return out.sort();
}

/**
 * Wrap FormData's stream API in a Promise. Node's fetch can accept a
 * FormData body directly, but the `form-data` package's streaming
 * implementation plays nicer with large multipart requests + gives us
 * `getLengthSync()` for Content-Length (Abrova's nginx wants it).
 */
function postFormData(
  url: string,
  form: FormData,
  token: string,
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    form.submit(
      {
        protocol: new URL(url).protocol as 'http:' | 'https:',
        host: new URL(url).host,
        path: new URL(url).pathname + new URL(url).search,
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      (err, res) => {
        if (err) return reject(err);
        let body = '';
        res.on('data', (chunk: Buffer) => {
          body += chunk.toString('utf8');
        });
        res.on('end', () => {
          resolve({ status: res.statusCode ?? 500, body });
        });
        res.on('error', reject);
      },
    );
  });
}

function safeParse(s: string): any {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function humanBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
