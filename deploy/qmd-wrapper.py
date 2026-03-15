#!/usr/bin/env python3
"""Thin REST wrapper around QMD CLI.

Exposes QMD search/get/status as simple JSON endpoints,
decoupled from the MCP protocol. Runs on the same host as QMD.

Usage:
    python3 qmd-wrapper.py --port 8787
"""

import json
import subprocess
import sys
from http.server import HTTPServer, BaseHTTPRequestHandler


QMD_BIN = "qmd"


def run_qmd(*args: str) -> str:
    """Run a QMD CLI command and return stdout."""
    result = subprocess.run(
        [QMD_BIN, *args],
        capture_output=True,
        text=True,
        timeout=30,
        env={"PATH": "/home/amello/.bun/bin:/usr/local/bin:/usr/bin:/bin"},
    )
    if result.returncode != 0:
        raise RuntimeError(result.stderr or f"QMD exited with code {result.returncode}")
    return result.stdout


class QMDHandler(BaseHTTPRequestHandler):
    def _json_response(self, data: dict | list, status: int = 200) -> None:
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _error(self, status: int, message: str) -> None:
        self._json_response({"error": message}, status)

    def _read_body(self) -> dict:
        length = int(self.headers.get("Content-Length", 0))
        if length == 0:
            return {}
        return json.loads(self.rfile.read(length))

    def do_GET(self) -> None:
        if self.path == "/health":
            try:
                output = run_qmd("status")
                self._json_response({"status": "ok", "detail": output[:200]})
            except Exception as e:
                self._error(503, str(e))
        else:
            self._error(404, "Not found")

    def do_POST(self) -> None:
        try:
            body = self._read_body()
        except json.JSONDecodeError:
            self._error(400, "Invalid JSON")
            return

        if self.path == "/search":
            self._handle_search(body)
        elif self.path == "/vector_search":
            self._handle_vsearch(body)
        elif self.path == "/deep_search":
            self._handle_query(body)
        elif self.path == "/get":
            self._handle_get(body)
        elif self.path == "/status":
            self._handle_status()
        else:
            self._error(404, "Not found")

    def _handle_search(self, body: dict) -> None:
        query = body.get("query", "")
        if not query:
            self._error(400, "query is required")
            return
        limit = body.get("limit", 10)
        collection = body.get("collection")

        args = ["search", query, "-n", str(limit), "--json"]
        if collection:
            args.extend(["-c", collection])

        try:
            output = run_qmd(*args)
            results = json.loads(output) if output.strip() else []
            self._json_response({"results": results})
        except json.JSONDecodeError:
            self._json_response({"results": [], "raw": output[:500]})
        except Exception as e:
            self._error(502, str(e))

    def _handle_vsearch(self, body: dict) -> None:
        query = body.get("query", "")
        if not query:
            self._error(400, "query is required")
            return
        limit = body.get("limit", 10)
        collection = body.get("collection")

        args = ["vsearch", query, "-n", str(limit), "--json"]
        if collection:
            args.extend(["-c", collection])

        try:
            output = run_qmd(*args)
            results = json.loads(output) if output.strip() else []
            self._json_response({"results": results})
        except json.JSONDecodeError:
            self._json_response({"results": [], "raw": output[:500]})
        except Exception as e:
            self._error(502, str(e))

    def _handle_query(self, body: dict) -> None:
        query = body.get("query", "")
        if not query:
            self._error(400, "query is required")
            return
        limit = body.get("limit", 10)
        collection = body.get("collection")

        args = ["query", query, "-n", str(limit), "--json"]
        if collection:
            args.extend(["-c", collection])

        try:
            output = run_qmd(*args)
            results = json.loads(output) if output.strip() else []
            self._json_response({"results": results})
        except json.JSONDecodeError:
            self._json_response({"results": [], "raw": output[:500]})
        except Exception as e:
            self._error(502, str(e))

    def _handle_get(self, body: dict) -> None:
        file = body.get("file", "")
        if not file:
            self._error(400, "file is required")
            return

        try:
            output = run_qmd("get", file)
            self._json_response({"file": file, "content": output})
        except Exception as e:
            self._error(502, str(e))

    def _handle_status(self) -> None:
        try:
            output = run_qmd("status")
            self._json_response({"status": "ok", "detail": output})
        except Exception as e:
            self._error(502, str(e))

    def log_message(self, format: str, *args: object) -> None:
        """Suppress default logging noise."""
        pass


def main() -> None:
    port = int(sys.argv[sys.argv.index("--port") + 1]) if "--port" in sys.argv else 8787
    server = HTTPServer(("0.0.0.0", port), QMDHandler)
    print(f"QMD REST wrapper listening on 0.0.0.0:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    server.server_close()


if __name__ == "__main__":
    main()
