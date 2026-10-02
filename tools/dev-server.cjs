const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const port = Number(process.env.PORT || 4174);
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
};

function send(response, statusCode, headers, body) {
  response.writeHead(statusCode, {
    "Cache-Control": "no-store, no-cache, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
    ...headers,
  });
  response.end(body);
}

const server = http.createServer((request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);
  const pathname = decodeURIComponent(requestUrl.pathname);
  const relativePath = pathname === "/" ? "index.html" : pathname.slice(1);
  const filePath = path.resolve(root, relativePath);

  if (!filePath.startsWith(`${root}${path.sep}`) && filePath !== root) {
    send(response, 403, {}, "Forbidden");
    return;
  }

  fs.stat(filePath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      send(response, 404, {}, "Not Found");
      return;
    }

    fs.readFile(filePath, (readError, content) => {
      if (readError) {
        send(response, 500, {}, "Internal Server Error");
        return;
      }

      const contentType =
        mimeTypes[path.extname(filePath).toLowerCase()] ||
        "application/octet-stream";
      send(response, 200, { "Content-Type": contentType }, content);
    });
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Todo app: http://127.0.0.1:${port}/`);
});

