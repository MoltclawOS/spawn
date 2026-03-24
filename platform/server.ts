import manifest from "../manifest.json" with { type: "json" };
import indexHtml from "./index.html";

interface LaunchRequest {
  agent?: string;
  cloud?: string;
  prompt?: string;
  model?: string;
  mode?: "preview" | "launch";
}

const repoRoot = new URL("../", import.meta.url);
const platformRoot = new URL("./", import.meta.url);
const cliEntry = new URL("../packages/cli/src/index.ts", import.meta.url);
const port = Number(process.env.PORT ?? "4173");

const mimeTypes: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".html": "text/html; charset=utf-8",
};

function getImplementedClouds(agent: string): string[] {
  return Object.entries(manifest.matrix)
    .filter(([pair, status]) => status === "implemented" && pair.endsWith(`/${agent}`))
    .map(([pair]) => pair.split("/")[0]);
}

function buildManifestResponse() {
  return {
    agents: Object.entries(manifest.agents)
      .map(([key, agent]) => ({
        key,
        ...agent,
        clouds: getImplementedClouds(key),
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    clouds: Object.entries(manifest.clouds)
      .map(([key, cloud]) => ({ key, ...cloud }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}

function json(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data, null, 2), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...init?.headers,
    },
  });
}

function validateRequest(body: LaunchRequest): { ok: true } | { ok: false; error: string } {
  if (!body.agent || !manifest.agents[body.agent]) {
    return { ok: false, error: "Select a valid agent." };
  }
  if (!body.cloud || !manifest.clouds[body.cloud]) {
    return { ok: false, error: "Select a valid cloud." };
  }
  if (!getImplementedClouds(body.agent).includes(body.cloud)) {
    return { ok: false, error: `${body.agent} is not implemented on ${body.cloud}.` };
  }
  return { ok: true };
}

function shellArgs(body: LaunchRequest): string[] {
  const args = ["run", cliEntry.pathname, body.agent!, body.cloud!];
  if (body.mode === "preview") {
    args.push("--dry-run");
  } else {
    args.push("--output", "json");
  }
  if (body.prompt?.trim()) {
    args.push("--prompt", body.prompt.trim());
  }
  if (body.model?.trim()) {
    args.push("--model", body.model.trim());
  }
  return args;
}

function commandPreview(body: LaunchRequest): string {
  const args = ["spawn", body.agent, body.cloud];
  if (body.mode === "preview") {
    args.push("--dry-run");
  } else {
    args.push("--output", "json");
  }
  if (body.prompt?.trim()) {
    args.push("--prompt", JSON.stringify(body.prompt.trim()));
  }
  if (body.model?.trim()) {
    args.push("--model", body.model.trim());
  }
  return args.join(" ");
}

async function handleRun(request: Request): Promise<Response> {
  const body = (await request.json()) as LaunchRequest;
  const validation = validateRequest(body);
  if (!validation.ok) {
    return json({ ok: false, error: validation.error }, { status: 400 });
  }

  const proc = Bun.spawn({
    cmd: ["bun", ...shellArgs(body)],
    cwd: repoRoot.pathname,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
      NO_COLOR: "1",
      SPAWN_NO_UPDATE_CHECK: "1",
    },
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  let parsedJson: unknown = null;
  if (body.mode === "launch" && stdout.trim()) {
    try {
      parsedJson = JSON.parse(stdout);
    } catch {
      parsedJson = null;
    }
  }

  return json({
    ok: exitCode === 0,
    mode: body.mode,
    command: commandPreview(body),
    exitCode,
    stdout,
    stderr,
    result: parsedJson,
  });
}

async function serveStatic(pathname: string): Promise<Response | null> {
  const path = pathname === "/" ? "/index.html" : pathname;
  const file = Bun.file(new URL(`.${path}`, platformRoot));
  if (!(await file.exists())) {
    return null;
  }
  const extension = path.slice(path.lastIndexOf("."));
  return new Response(file, {
    headers: {
      "content-type": mimeTypes[extension] ?? "application/octet-stream",
    },
  });
}

Bun.serve({
  port,
  routes: {
    "/": new Response(indexHtml, { headers: { "content-type": "text/html; charset=utf-8" } }),
    "/api/manifest": () => json(buildManifestResponse()),
    "/api/run": {
      POST: handleRun,
    },
  },
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/assets/")) {
      const file = Bun.file(new URL(`.${url.pathname}`, repoRoot));
      if (await file.exists()) {
        const extension = url.pathname.slice(url.pathname.lastIndexOf("."));
        return new Response(file, {
          headers: {
            "content-type": mimeTypes[extension] ?? "application/octet-stream",
          },
        });
      }
    }

    const staticResponse = await serveStatic(url.pathname);
    if (staticResponse) {
      return staticResponse;
    }

    return new Response("Not found", { status: 404 });
  },
});

console.log(`Spawn platform running at http://localhost:${port}`);
