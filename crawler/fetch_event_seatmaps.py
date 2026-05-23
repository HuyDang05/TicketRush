# Purpose: Crawler/script tao du lieu su kien va seatmap mau cho moi truong dev.
#!/usr/bin/env python3
"""
Fetch seatmapJson from selected TicketRush events by title and append them to
the crawler seatmap template file as JSONL records.

Usage:
  python crawler/fetch_event_seatmaps.py
  BACKEND_URL=http://localhost:3000 python crawler/fetch_event_seatmaps.py
  python crawler/fetch_event_seatmaps.py --replace
  python crawler/fetch_event_seatmaps.py --dry-run
"""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
from typing import Any

import requests


EVENT_TITLES = [
    "Test1",
    "Test2",
    "Test3",
    "Test4",
]

DEFAULT_BASE_URL = os.getenv("BACKEND_URL", "http://localhost:3000")
DEFAULT_OUTPUT = Path(__file__).with_name("venue KDT Vin zones x.txt")


def event_urls(base_url: str, event_id: str) -> list[str]:
    base = base_url.rstrip("/")
    return [
        f"{base}/api/events/{event_id}",
        f"{base}/api/event/{event_id}",
        f"{base}/events/{event_id}",
        f"{base}/event/{event_id}",
    ]


def event_search_urls(base_url: str) -> list[str]:
    base = base_url.rstrip("/")
    return [
        f"{base}/api/events",
        f"{base}/api/event",
        f"{base}/events",
        f"{base}/event",
    ]


def normalize_title(value: Any) -> str:
    return " ".join(str(value or "").split()).casefold()


def compact_title(value: Any) -> str:
    return normalize_title(value).replace(" ", "")


def request_events_by_title(base_url: str, title: str, timeout: int) -> dict[str, Any]:
    errors: list[str] = []
    expected = normalize_title(title)
    expected_compact = compact_title(title)

    search_terms = [title]
    compact_search = str(title).replace(" ", "")
    if compact_search and compact_search not in search_terms:
        search_terms.append(compact_search)

    for url in event_search_urls(base_url):
        found_events: list[dict[str, Any]] = []
        for search_term in search_terms:
            try:
                response = requests.get(
                    url,
                    params={"search": search_term, "limit": 50},
                    timeout=timeout,
                )
            except requests.RequestException as exc:
                errors.append(f"{url}: {exc}")
                continue

            if response.status_code == 404:
                errors.append(f"{url}: 404")
                break

            try:
                response.raise_for_status()
            except requests.HTTPError as exc:
                errors.append(f"{url}: {exc}")
                continue

            payload = response.json()
            events = payload.get("events", payload)
            if not isinstance(events, list):
                errors.append(f"{url}: response khong co list events")
                continue

            found_events.extend(events)

        if not found_events:
            continue

        exact_match = next(
            (
                event for event in found_events
                if normalize_title(event.get("title")) == expected
                or compact_title(event.get("title")) == expected_compact
            ),
            None,
        )
        if exact_match:
            return exact_match

        errors.append(f"{url}: khong thay title exact {title!r}")

    raise RuntimeError(f"Khong tim thay event title {title!r}:\n- " + "\n- ".join(errors))


def request_event(base_url: str, event_id: str, timeout: int) -> dict[str, Any]:
    errors: list[str] = []

    for url in event_urls(base_url, event_id):
        try:
            response = requests.get(url, timeout=timeout)
        except requests.RequestException as exc:
            errors.append(f"{url}: {exc}")
            continue

        if response.status_code == 404:
            errors.append(f"{url}: 404")
            continue

        try:
            response.raise_for_status()
        except requests.HTTPError as exc:
            errors.append(f"{url}: {exc}")
            continue

        payload = response.json()
        event = payload.get("event", payload)
        if not isinstance(event, dict):
            raise ValueError(f"Response cua {url} khong co object event")
        return event

    raise RuntimeError(f"Khong fetch duoc event {event_id}:\n- " + "\n- ".join(errors))


def normalize_seatmap(event: dict[str, Any], event_id: str) -> dict[str, Any]:
    seatmap = event.get("seatmapJson")
    if isinstance(seatmap, str):
        seatmap = json.loads(seatmap)

    if not isinstance(seatmap, dict):
        raise ValueError(f"Event {event_id} khong co seatmapJson object")

    if not seatmap.get("venue") and event.get("venue"):
        # Keep template records self-contained so crawler.py can later use them
        # without fetching the original event again.
        seatmap["venue"] = event["venue"]

    zones = seatmap.get("zones")
    if not isinstance(zones, list) or not zones:
        raise ValueError(f"Event {event_id} seatmapJson thieu zones")

    for zone_index, zone in enumerate(zones):
        if not isinstance(zone, dict):
            raise ValueError(f"Event {event_id} zones[{zone_index}] khong phai object")
        seats = zone.get("seats")
        if not isinstance(seats, list) or not seats:
            raise ValueError(f"Event {event_id} zones[{zone_index}] thieu seats")

    # The script intentionally validates only the fields crawler.py requires.
    # Extra editor metadata is preserved in the JSON line for future use.
    return seatmap


def existing_template_lines(output: Path) -> set[str]:
    if not output.exists():
        return set()

    return {
        line.strip()
        for line in output.read_text(encoding="utf-8").splitlines()
        if line.strip().startswith("{")
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Fetch seatmapJson cua cac event va append vao file template crawler."
    )
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--timeout", type=int, default=15)
    parser.add_argument("--replace", action="store_true", help="Ghi de file output bang cac seatmap vua fetch")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    json_lines: list[str] = []
    for title in EVENT_TITLES:
        summary_event = request_events_by_title(args.base_url, title, args.timeout)
        event_id = summary_event.get("id")
        if not event_id:
            raise ValueError(f"Event {title!r} khong co id")

        event = request_event(args.base_url, event_id, args.timeout)
        seatmap = normalize_seatmap(event, event_id)
        line = json.dumps(seatmap, ensure_ascii=False, separators=(",", ":"))
        json_lines.append(line)
        print(
            f"OK {title!r} ({event_id}): venue={seatmap.get('venue')!r}, "
            f"zones={len(seatmap.get('zones', []))}"
        )

    if args.dry_run:
        print("\n".join(json_lines))
        return 0

    args.output.parent.mkdir(parents=True, exist_ok=True)
    if args.replace:
        args.output.write_text("\n\n".join(json_lines) + "\n", encoding="utf-8")
        print(f"Da ghi de {len(json_lines)} seatmap vao {args.output}")
        return 0

    existing_lines = existing_template_lines(args.output)
    new_lines = [line for line in json_lines if line not in existing_lines]

    if not new_lines:
        print(f"Khong co seatmap moi de append vao {args.output}")
        return 0

    with args.output.open("a", encoding="utf-8") as file:
        if args.output.stat().st_size > 0:
            file.write("\n")
        file.write("\n\n".join(new_lines))
        file.write("\n")

    print(f"Da append {len(new_lines)} seatmap vao {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
