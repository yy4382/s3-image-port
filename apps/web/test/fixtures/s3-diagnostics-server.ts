import { createServer } from "node:http";
import type { TestProject } from "vitest/node";

// A real second origin. No credentials or external storage services are used.
export default async function setup(project: TestProject) {
  const requests: Array<{
    path: string;
    method?: string;
    query: Record<string, string>;
    aborted: boolean;
    region?: string;
  }> = [];
  const server = createServer((req, res) => {
    const url = new URL(req.url!, "http://localhost");
    const scenario = url.pathname.split("/")[1];
    if (scenario === "__requests") {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.end(JSON.stringify(requests));
      return;
    }
    const record = {
      path: url.pathname,
      method: req.method,
      query: Object.fromEntries(url.searchParams),
      aborted: false,
      region: req.headers.authorization?.match(
        /Credential=[^/]+\/\d+\/([^/]+)\//,
      )?.[1],
    };
    requests.push(record);
    res.on("close", () => {
      if (!res.writableEnded) record.aborted = true;
    });
    if (scenario === "unreachable") {
      req.socket.destroy();
      return;
    }
    if (scenario === "preflight-denied" && req.method === "OPTIONS") {
      res.writeHead(403);
      res.end();
      return;
    }
    if (
      (scenario !== "hidden" &&
        !(scenario === "cors-hidden" && url.searchParams.has("cors"))) ||
      req.method === "OPTIONS"
    ) {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, PUT, DELETE");
      res.setHeader("Access-Control-Allow-Headers", "*");
    }
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }
    res.setHeader("Content-Type", "application/xml");
    if (scenario === "slow") return;
    if (scenario === "bare403") {
      res.writeHead(403);
      res.end();
      return;
    }
    if (url.searchParams.has("cors") && scenario === "cors-code") {
      res.writeHead(404);
      res.end(
        `<Error><Code>${url.pathname.split("/")[2]}</Code><Message>DO-NOT-SHOW-RAW-SERVICE-MESSAGE</Message></Error>`,
      );
      return;
    }
    if (scenario === "slow-body") {
      res.writeHead(200);
      res.write("<ListBucketResult>");
      return;
    }
    if (scenario === "html") {
      res.end("<html><body>Proxy login</body></html>");
      return;
    }
    if (scenario === "malformed") {
      res.end("<ListBucketResult><KeyCount>0</ListBucketResult>");
      return;
    }
    if (
      scenario === "denied" ||
      scenario === "hidden" ||
      scenario === "code" ||
      scenario === "retryable" ||
      (url.searchParams.has("cors") && scenario !== "cors-rules")
    ) {
      const code =
        scenario === "code"
          ? url.pathname.split("/")[2]
          : scenario === "retryable"
            ? "SlowDown"
            : "AccessDenied";
      res.writeHead(scenario === "retryable" ? 503 : 403);
      res.end(
        `<Error><Code>${code}</Code><Message>DO-NOT-SHOW-RAW-SERVICE-MESSAGE</Message></Error>`,
      );
      return;
    }
    if (url.searchParams.has("cors")) {
      res.end(
        "<CORSConfiguration><CORSRule><AllowedOrigin>*</AllowedOrigin><AllowedMethod>GET</AllowedMethod><AllowedMethod>HEAD</AllowedMethod><AllowedMethod>PUT</AllowedMethod><AllowedMethod>DELETE</AllowedMethod><AllowedHeader>Content-Type</AllowedHeader><AllowedHeader>x-amz-*</AllowedHeader></CORSRule></CORSConfiguration>",
      );
      return;
    }
    const contents =
      scenario === "populated"
        ? "<Contents><Key>prefix/test.webp</Key></Contents><NextContinuationToken>must-not-follow</NextContinuationToken>"
        : "";
    res.end(
      `<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Name>images</Name><Prefix>${url.searchParams.get("prefix") ?? ""}</Prefix><MaxKeys>1</MaxKeys><KeyCount>${contents ? 1 : 0}</KeyCount><IsTruncated>${contents ? "true" : "false"}</IsTruncated>${contents}</ListBucketResult>`,
    );
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("No fixture port");
  project.provide("s3FixtureUrl", `http://127.0.0.1:${address.port}`);
  return async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  };
}

declare module "vitest" {
  export interface ProvidedContext {
    s3FixtureUrl: string;
  }
}
