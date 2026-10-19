"""Trigger procedural audit-ticket generation through the live application."""

import argparse
import json
import time
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


def generate_batch(base_url: str, count: int) -> dict:
    url = base_url.rstrip("/") + f"/api/v1/generate-tickets?count={count}"
    request = Request(url, data=b"{}", headers={"Content-Type": "application/json"}, method="POST")
    with urlopen(request, timeout=300) as response:
        return json.loads(response.read().decode("utf-8"))


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate procedural tickets in the live Auditrix database.")
    parser.add_argument("--count", type=int, default=10, help="Tickets per batch (1-100).")
    parser.add_argument("--base-url", default="http://localhost:8000", help="Auditrix server base URL.")
    parser.add_argument("--continuous", action="store_true", help="Keep generating batches until interrupted.")
    parser.add_argument("--interval", type=float, default=5.0, help="Seconds between continuous batches.")
    args = parser.parse_args()
    if not 1 <= args.count <= 100:
        parser.error("--count must be between 1 and 100")
    if args.interval < 0:
        parser.error("--interval cannot be negative")

    try:
        while True:
            result = generate_batch(args.base_url, args.count)
            print(json.dumps(result, indent=2), flush=True)
            if not args.continuous:
                return 0
            time.sleep(args.interval)
    except KeyboardInterrupt:
        print("Generation stopped.")
        return 0
    except (HTTPError, URLError, TimeoutError, ValueError) as exc:
        print(f"Ticket generation failed: {exc}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
