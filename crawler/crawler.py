# Purpose: Crawler/script tao du lieu su kien va seatmap mau cho moi truong dev.
"""
Ticketbox.vn Event Crawler
==========================
Crawl events từ API của ticketbox.vn và lưu ra file JSON
theo cấu trúc model Event trong Prisma schema.

Event model fields:
  - id            : UUID (tự sinh)
  - createdBy     : String (placeholder admin ID)
  - title         : String  ← name
  - description   : String? ← từ trang chi tiết (nếu lấy được)
  - venue         : String  ← từ trang chi tiết (nếu lấy được)
  - date          : DateTime ← day
  - imageUrl      : String? ← imageUrl
  - cardImageUrl  : String? ← imageUrl (dùng chung)
  - status        : EventStatus (DRAFT/PUBLISHED/ENDED theo phân bổ mỗi category)
  - createdAt     : DateTime (now)
  - seatmapJson   : Json?  ← chọn ngẫu nhiên từ file seatmap template
  - seatmapVersion: Int    ← sinh ngẫu nhiên 1–3
  - endDate       : DateTime? (sau date)

Zone model (nhúng vào output, dùng khi seed vào DB):
  - name, rows, cols, price, totalSeats
  - seats nằm trong seatmapJson.zones
"""

import json
import copy
import random
import time
import uuid
import logging
import argparse
import html
from datetime import datetime, timedelta, timezone
from html.parser import HTMLParser
from pathlib import Path
from typing import Any, Optional
from urllib.parse import urljoin

import requests

# ─────────────────────────────────────────
# Cấu hình
# ─────────────────────────────────────────
SEARCH_API = "https://api-v2.ticketbox.vn/search/v2/events"
DETAIL_API  = "https://api-v2.ticketbox.vn/events/{event_id}"

# Ticketbox category slugs. The older slugs festival/theatre/cinema/other
# currently return empty results, so use the active API slugs below instead.
CATEGORIES = [
    "music",
    "seminarsworkshops",
    "sport",
    "theatersandart",
    "attractionsexperiences",
    "others",
]

DEFAULT_ADMIN_ID = "00000000-0000-0000-0000-000000000000"  # placeholder — thay bằng UUID admin thật khi seed
DEFAULT_LIMIT    = 50
DEFAULT_TARGET_PER_CATEGORY = 50
DEFAULT_DRAFT_PER_CATEGORY  = 2
DEFAULT_ENDED_PER_CATEGORY  = 10
SEATMAP_TEMPLATE_FILE = Path(__file__).with_name("venue KDT Vin zones x.txt")
DELAY_PAGES      = 0.5   # giây giữa các trang
DELAY_DETAIL     = 0.3   # giây giữa mỗi detail request

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json",
    "Referer": "https://ticketbox.vn/",
}

HTML_HEADERS = {
    **HEADERS,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

# ─────────────────────────────────────────
# Preset zone layouts (giống seed.js)
# ─────────────────────────────────────────
# Mỗi preset gồm list zone, mỗi zone có:
#   name, price_range (min, max), arcSeatsPerRow
ZONE_PRESETS = [
    # Preset 0 – nhỏ (concert acoustic / nhỏ)
    [
        {"name": "VIP",    "price_range": (500_000,  1_200_000), "arcSeatsPerRow": [7, 9]},
        {"name": "Khu A",  "price_range": (200_000,  500_000),   "arcSeatsPerRow": [11, 13]},
        {"name": "Khu B",  "price_range": (80_000,   200_000),   "arcSeatsPerRow": [15, 17, 19]},
    ],
    # Preset 1 – trung bình (festival vừa)
    [
        {"name": "VIP",    "price_range": (1_500_000, 3_000_000), "arcSeatsPerRow": [9, 11]},
        {"name": "Khu A",  "price_range": (800_000,  1_500_000),  "arcSeatsPerRow": [13, 15]},
        {"name": "Khu B",  "price_range": (300_000,   800_000),   "arcSeatsPerRow": [17, 19, 21]},
    ],
    # Preset 2 – lớn (sân vận động / festival lớn)
    [
        {"name": "SVIP",   "price_range": (3_000_000, 6_000_000), "arcSeatsPerRow": [11, 13]},
        {"name": "VIP",    "price_range": (1_500_000, 3_000_000), "arcSeatsPerRow": [15, 17]},
        {"name": "Khu A",  "price_range": (700_000,  1_500_000),  "arcSeatsPerRow": [19, 21, 23]},
        {"name": "Khu B",  "price_range": (200_000,   700_000),   "arcSeatsPerRow": [25, 27, 29, 31]},
    ],
    # Preset 3 – standing / festival không phân khu phức tạp
    [
        {"name": "VIP Standing",  "price_range": (600_000, 1_500_000), "arcSeatsPerRow": [10, 12]},
        {"name": "General",       "price_range": (150_000,  600_000),  "arcSeatsPerRow": [20, 22, 24]},
    ],
]

ARC_LABELS = list("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
_SEATMAP_TEMPLATES: Optional[list[dict]] = None


# ─────────────────────────────────────────
# Sinh seat labels theo arc layout
# ─────────────────────────────────────────
def build_arc_seats(arc_seats_per_row: list[int]) -> list[dict]:
    """Tạo danh sách seat theo arc layout giống createArcSeats() trong seed.js."""
    seats = []
    for arc_idx, count in enumerate(arc_seats_per_row):
        row_label = ARC_LABELS[arc_idx] if arc_idx < len(ARC_LABELS) else str(arc_idx + 1)
        for col in range(count):
            seats.append({
                "row":   arc_idx,
                "col":   col,
                "label": f"{row_label}{col + 1}",
                "status": "AVAILABLE",
            })
    return seats


# ─────────────────────────────────────────
# Sinh seatmapJson ngẫu nhiên
# ─────────────────────────────────────────
def build_seatmap_json(zones_config: list[dict]) -> dict:
    """
    Tạo seatmapJson theo cấu trúc tương tự mà frontend đọc.
    Dựa trên arc-layout: mỗi zone là 1 cung bán nguyệt.

    Cấu trúc:
    {
      "layout": "arc",
      "zones": [
        {
          "name": "VIP",
          "rows": 2,
          "cols": 11,
          "arcSeatsPerRow": [9, 11],
          "seats": [ {"row":0,"col":0,"label":"A1"}, ... ]
        }
      ]
    }
    """
    seatmap_zones = []
    for z in zones_config:
        arc = z["arcSeatsPerRow"]
        seats = build_arc_seats(arc)
        seatmap_zones.append({
            "name":           z["name"],
            "rows":           len(arc),
            "cols":           max(arc),
            "arcSeatsPerRow": arc,
            "seats":          seats,
        })
    return {
        "layout": "arc",
        "zones":  seatmap_zones,
    }


# ─────────────────────────────────────────
# Chọn preset ngẫu nhiên và xây zones
# ─────────────────────────────────────────
def random_zones_and_seatmap(base_price: Optional[float] = None):
    """
    Chọn ngẫu nhiên 1 preset, tuỳ chỉnh giá dựa theo price của API.
    Trả về (zones_config, seatmap_json, seatmap_version).
    """
    preset = random.choice(ZONE_PRESETS)
    version = random.randint(1, 3)

    # Nếu có base_price từ API (giá vé thấp nhất), dùng để điều chỉnh preset
    scale = 1.0
    if base_price and base_price > 0:
        # Lấy giá trung vị của preset cuối (khu rẻ nhất)
        cheapest = preset[-1]["price_range"]
        mid_cheap = (cheapest[0] + cheapest[1]) / 2
        if mid_cheap > 0:
            scale = base_price / mid_cheap

    zones_config = []
    for zone_def in preset:
        lo, hi = zone_def["price_range"]
        price = int(random.uniform(lo * scale, hi * scale) / 1000) * 1000  # làm tròn 1000đ
        price = max(price, 10_000)  # tối thiểu 10k

        # Thêm biến động nhỏ vào arcSeatsPerRow để mỗi event khác nhau
        arc_base = zone_def["arcSeatsPerRow"]
        arc = [max(4, n + random.choice([-2, -1, 0, 0, 1, 2])) for n in arc_base]

        zones_config.append({
            "name":           zone_def["name"],
            "price":          price,
            "arcSeatsPerRow": arc,
            "rows":           len(arc),
            "cols":           max(arc),
        })

    seatmap = build_seatmap_json(zones_config)
    return zones_config, seatmap, version


def load_seatmap_templates() -> list[dict]:
    """
    Đọc các seatmap JSON hợp lệ từ file template.
    Mỗi dòng bắt đầu bằng "{" được xem là một seatmap độc lập; dòng hỏng sẽ bị bỏ qua.
    """
    global _SEATMAP_TEMPLATES
    if _SEATMAP_TEMPLATES is not None:
        return _SEATMAP_TEMPLATES

    templates: list[dict] = []
    try:
        lines = SEATMAP_TEMPLATE_FILE.read_text(encoding="utf-8").splitlines()
    except FileNotFoundError:
        log.warning(f"Không tìm thấy file seatmap template: {SEATMAP_TEMPLATE_FILE}")
        _SEATMAP_TEMPLATES = []
        return _SEATMAP_TEMPLATES

    for line_no, line in enumerate(lines, 1):
        raw = line.strip()
        if not raw.startswith("{"):
            continue
        try:
            template = json.loads(raw)
        except json.JSONDecodeError as e:
            log.warning(f"Bỏ qua seatmap template không hợp lệ ở dòng {line_no}: {e}")
            continue

        error = validate_seatmap_template(template)
        if error:
            log.warning(f"Bỏ qua seatmap template dòng {line_no}: {error}")
            continue

        # The template file is JSONL-like and may contain notes. Only validated
        # object lines are cached so later event mapping can pick one in O(1).
        templates.append(template)

    _SEATMAP_TEMPLATES = templates
    log.info(
        f"Đã load {len(templates)} seatmap template hợp lệ từ {SEATMAP_TEMPLATE_FILE.name}"
    )
    return _SEATMAP_TEMPLATES


def validate_seatmap_template(template: dict) -> Optional[str]:
    if not isinstance(template, dict):
        return "template không phải object"
    if not template.get("venue"):
        return "thiếu venue"
    zones = template.get("zones")
    if not isinstance(zones, list) or not zones:
        return "thiếu zones"

    for zone_index, zone in enumerate(zones):
        if not isinstance(zone, dict):
            return f"zones[{zone_index}] không phải object"
        if not zone.get("name"):
            return f"zones[{zone_index}] thiếu name"
        if zone.get("price") is None:
            return f"zones[{zone_index}] thiếu price"
        seats = zone.get("seats")
        if not isinstance(seats, list) or not seats:
            return f"zones[{zone_index}] thiếu seats"

        for seat_index, seat in enumerate(seats):
            if not isinstance(seat, dict):
                return f"zones[{zone_index}].seats[{seat_index}] không phải object"
            if not isinstance(seat.get("row"), int):
                return f"zones[{zone_index}].seats[{seat_index}] thiếu row"
            if not isinstance(seat.get("col"), int):
                return f"zones[{zone_index}].seats[{seat_index}] thiếu col"
            if not seat.get("label"):
                return f"zones[{zone_index}].seats[{seat_index}] thiếu label"

    return None


def zone_dimensions(zone: dict) -> tuple[int, int]:
    config = zone.get("config") if isinstance(zone.get("config"), dict) else {}
    rows = config.get("rows") or zone.get("rows")
    cols = config.get("cols") or zone.get("cols")
    seats = zone.get("seats") if isinstance(zone.get("seats"), list) else []

    if not rows:
        rows = max((seat.get("row", 0) for seat in seats), default=-1) + 1
    if not cols:
        cols = max((seat.get("col", 0) for seat in seats), default=-1) + 1

    return max(int(rows or 1), 1), max(int(cols or 1), 1)


def seatmap_from_template(base_price: Optional[float] = None):
    """
    Chọn ngẫu nhiên 1 seatmap mẫu và chuẩn hóa sang cấu trúc seed/frontend dùng.
    Trả về (zones_config, seatmap_json, seatmap_version, venue).
    """
    templates = load_seatmap_templates()
    if not templates:
        log.warning("Không có seatmap template hợp lệ, dùng fallback arc layout cũ")
        zones_config, seatmap_json, seatmap_version = random_zones_and_seatmap(base_price)
        return zones_config, seatmap_json, seatmap_version, None

    template = copy.deepcopy(random.choice(templates))
    zones_config = []

    for zone in template.get("zones", []):
        rows, cols = zone_dimensions(zone)
        seats = zone.get("seats") if isinstance(zone.get("seats"), list) else []
        for seat in seats:
            # Imported templates may omit status because DB seed always starts
            # from an available seatmap.
            seat["status"] = seat.get("status") or "AVAILABLE"

        price = zone.get("price")
        if price is None:
            price = base_price or 500_000

        zone["rows"] = rows
        zone["cols"] = cols
        zone["price"] = price

        zones_config.append({
            "name":       zone.get("name", "Khu"),
            "price":      price,
            "rows":       rows,
            "cols":       cols,
            "totalSeats": len(seats),
        })

    layout_zones = template.get("layout", []) if isinstance(template.get("layout"), list) else []
    for layout_zone in layout_zones:
        rows, cols = zone_dimensions(layout_zone)
        layout_zone["rows"] = rows
        layout_zone["cols"] = cols
        if layout_zone.get("price") is None:
            layout_zone["price"] = base_price or 500_000

    return zones_config, template, random.randint(1, 3), template.get("venue")


# ─────────────────────────────────────────
# Fetch helpers
# ─────────────────────────────────────────
def fetch_events_page(category: str, page: int, limit: int = DEFAULT_LIMIT) -> dict:
    params = {"limit": limit, "page": page, "categories": category}
    resp = requests.get(SEARCH_API, params=params, headers=HEADERS, timeout=15)
    resp.raise_for_status()
    return resp.json()


def fetch_event_detail(event_id: int) -> Optional[dict]:
    url = DETAIL_API.format(event_id=event_id)
    try:
        resp = requests.get(url, headers=HEADERS, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, dict):
                return data.get("data") or data
        return None
    except Exception as e:
        logging.debug(f"Không lấy được chi tiết event {event_id}: {e}")
        return None


class JsonLdParser(HTMLParser):
    """Extract JSON-LD script blocks from a Ticketbox event HTML page."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self._in_json_ld = False
        self._buffer: list[str] = []
        self.scripts: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, Optional[str]]]) -> None:
        if tag.lower() != "script":
            return

        attr_map = {name.lower(): value for name, value in attrs if name}
        script_type = (attr_map.get("type") or "").lower()
        if script_type == "application/ld+json":
            self._in_json_ld = True
            self._buffer = []

    def handle_data(self, data: str) -> None:
        if self._in_json_ld:
            self._buffer.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "script" and self._in_json_ld:
            self.scripts.append("".join(self._buffer).strip())
            self._in_json_ld = False
            self._buffer = []


def iter_jsonld_objects(value: Any):
    if isinstance(value, dict):
        graph = value.get("@graph")
        if isinstance(graph, list):
            for item in graph:
                yield from iter_jsonld_objects(item)
        yield value
    elif isinstance(value, list):
        for item in value:
            yield from iter_jsonld_objects(item)


def find_event_jsonld(html_text: str) -> Optional[dict]:
    parser = JsonLdParser()
    parser.feed(html_text)

    for script in parser.scripts:
        if not script:
            continue
        try:
            payload = json.loads(html.unescape(script))
        except json.JSONDecodeError as e:
            log.debug(f"Bỏ qua JSON-LD không hợp lệ: {e}")
            continue

        for item in iter_jsonld_objects(payload):
            item_type = item.get("@type")
            if item_type == "Event" or (
                isinstance(item_type, list) and "Event" in item_type
            ):
                return item

    return None


def fetch_event_schema(deeplink: Optional[str]) -> Optional[dict]:
    if not deeplink:
        return None

    url = urljoin("https://ticketbox.vn/", deeplink)
    try:
        resp = requests.get(url, headers=HTML_HEADERS, timeout=15)
        if resp.status_code != 200:
            log.debug(f"Không lấy được HTML event {url}: HTTP {resp.status_code}")
            return None
        return find_event_jsonld(resp.text)
    except Exception as e:
        log.debug(f"Không lấy được schema.org event {url}: {e}")
        return None


def compact_schema_venue(schema_event: Optional[dict]) -> tuple[Optional[str], Optional[dict]]:
    if not schema_event:
        return None, None

    location = schema_event.get("location")
    if not isinstance(location, dict):
        location = None

    venue = None
    if location:
        address = location.get("address")
        if isinstance(address, dict):
            venue = address.get("streetAddress")
        venue = venue or location.get("name")

    geo = schema_event.get("geo")
    compact_geo = None
    if isinstance(geo, dict):
        latitude = geo.get("latitude")
        longitude = geo.get("longitude")
        if latitude is not None and longitude is not None:
            compact_geo = {
                "latitude": latitude,
                "longitude": longitude,
            }

    return venue, compact_geo


# ─────────────────────────────────────────
# Mapping
# ─────────────────────────────────────────
def map_event(
    raw: dict,
    detail: Optional[dict] = None,
    category: str = "",
    schema_event: Optional[dict] = None,
) -> dict:
    """
    Map dữ liệu từ API + sinh ngẫu nhiên seatmapJson, seatmapVersion, zones.
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    schema_venue, geo = compact_schema_venue(schema_event)

    # Venue & description từ detail
    venue       = schema_venue or "TBD"
    description = None
    if detail:
        if venue == "TBD":
            venue = (
                detail.get("location")
                or detail.get("venue")
                or detail.get("venueName")
                or detail.get("address")
                or "TBD"
            )
        description = (
            detail.get("description")
            or detail.get("content")
            or detail.get("shortDescription")
        )

    # Ticketbox price is only an anchor. The selected template still controls the
    # zone count and relative layout so generated events look realistic.
    base_price = raw.get("price")

    # Chọn 1 seatmap mẫu từ file template
    zones_config, seatmap_json, seatmap_version, template_venue = seatmap_from_template(base_price)
    if venue == "TBD" and template_venue:
        venue = template_venue

    return {
        # ── Event fields (khớp Prisma schema) ──
        "id":             str(uuid.uuid4()),
        "createdBy":      DEFAULT_ADMIN_ID,
        "title":          raw.get("name", ""),
        "description":    description,
        "venue":          venue,
        "date":           raw.get("day"),
        "endDate":        None,
        "imageUrl":       raw.get("imageUrl"),
        "cardImageUrl":   raw.get("imageUrl"),
        "status":         None,
        "createdAt":      now_iso,
        "seatmapJson":    seatmap_json,
        "seatmapVersion": seatmap_version,
        "geo":            geo,

        # ── Zones (dùng khi seed DB) ──
        "zones": [
            {
                "name":           z["name"],
                "price":          z["price"],
                "rows":           z["rows"],
                "cols":           z["cols"],
                "totalSeats":     z["totalSeats"],
            }
            for z in zones_config
        ],

        # ── Metadata gốc từ Ticketbox ──
        "_source": {
            "ticketboxId": raw.get("id"),
            "url":         raw.get("url"),
            "deeplink":    raw.get("deeplink"),
            "price":       raw.get("price"),
            "orgLogoUrl":  raw.get("orgLogoUrl"),
            "category":    category,
        },
    }


# ─────────────────────────────────────────
# Crawl
# ─────────────────────────────────────────
log = logging.getLogger(__name__)

def crawl_category(
    category: str,
    max_pages: int = 10,
    limit: int = DEFAULT_LIMIT,
    target_per_category: int = DEFAULT_TARGET_PER_CATEGORY,
    fetch_detail: bool = True,
) -> list[dict]:
    events: list[dict] = []
    page = 1
    log.info(
        f"▶ Bắt đầu crawl category: {category} "
        f"(limit={limit}, target={target_per_category})"
    )

    while page <= max_pages and len(events) < target_per_category:
        log.info(f"  Trang {page}/{max_pages}: limit={limit}, page={page}, categories={category}")
        try:
            resp = fetch_events_page(category, page, limit)
        except requests.HTTPError as e:
            log.error(f"  HTTP Error trang {page}: {e}")
            break
        except Exception as e:
            log.error(f"  Lỗi trang {page}: {e}")
            break

        if resp.get("code") != 200:
            log.warning(f"  API trả về code {resp.get('code')}: {resp.get('message')}")
            break

        results   = resp.get("data", {}).get("results", [])
        pagination = resp.get("data", {}).get("pagination", {})

        if not results:
            log.info("  Không còn kết quả.")
            break

        log.info(f"  Lấy được {len(results)} events")

        for raw in results:
            detail = None
            schema_event = None
            if fetch_detail:
                if raw.get("id"):
                    detail = fetch_event_detail(raw["id"])
                schema_event = fetch_event_schema(raw.get("deeplink"))
                time.sleep(DELAY_DETAIL)

            events.append(map_event(raw, detail, category, schema_event))
            if len(events) >= target_per_category:
                log.info(f"  Đã đủ target {target_per_category} events cho category '{category}'.")
                break

        if not pagination.get("hasMore", False):
            log.info("  Đã hết trang.")
            break

        page += 1
        time.sleep(DELAY_PAGES)

    if len(events) < target_per_category:
        log.warning(
            f"Category '{category}' chỉ lấy được {len(events)}/{target_per_category} events"
        )
    else:
        events = events[:target_per_category]

    log.info(f"✓ Category '{category}': {len(events)} events")
    return events


def apply_event_mix(
    events_by_category: dict[str, list[dict]],
    draft_per_category: int = DEFAULT_DRAFT_PER_CATEGORY,
    ended_per_category: int = DEFAULT_ENDED_PER_CATEGORY,
) -> None:
    """
    Gán status và thời gian theo từng category:
    - DRAFT và PUBLISHED nằm trong tương lai.
    - ENDED nằm trong quá khứ, endDate sau date nhưng trước hiện tại.
    """
    now = datetime.now(timezone.utc).replace(microsecond=0)

    for category_index, (category, events) in enumerate(events_by_category.items()):
        future_base_days = 14 + category_index * 70
        past_base_days = 60 + category_index * 20

        draft_count = min(draft_per_category, len(events))
        ended_count = min(ended_per_category, max(0, len(events) - draft_count))

        for index, event in enumerate(events):
            if index < draft_count:
                start_at = now + timedelta(days=future_base_days + index, hours=19)
                status = "DRAFT"
            elif index < draft_count + ended_count:
                ended_index = index - draft_count
                start_at = now - timedelta(days=past_base_days - ended_index, hours=20)
                status = "ENDED"
            else:
                published_index = index - draft_count - ended_count
                start_at = now + timedelta(days=future_base_days + draft_count + published_index, hours=19)
                status = "PUBLISHED"

            end_at = start_at + timedelta(hours=3)
            event["status"] = status
            event["date"] = start_at.isoformat()
            event["endDate"] = end_at.isoformat()


def crawl_all(
    categories: list[str],
    max_pages: int = 10,
    limit: int = DEFAULT_LIMIT,
    target_per_category: int = DEFAULT_TARGET_PER_CATEGORY,
    draft_per_category: int = DEFAULT_DRAFT_PER_CATEGORY,
    ended_per_category: int = DEFAULT_ENDED_PER_CATEGORY,
    fetch_detail: bool = True,
) -> list[dict]:
    all_events: list[dict] = []
    seen_ids: set[int] = set()
    events_by_category: dict[str, list[dict]] = {}

    for cat in categories:
        category_events: list[dict] = []
        for event in crawl_category(cat, max_pages, limit, target_per_category, fetch_detail):
            tid = event["_source"].get("ticketboxId")
            if tid not in seen_ids:
                seen_ids.add(tid)
                all_events.append(event)
                category_events.append(event)
            else:
                log.info(f"  Bỏ qua event trùng Ticketbox ID {tid} trong category '{cat}'")

        events_by_category[cat] = category_events
        if len(category_events) < target_per_category:
            log.warning(
                f"Category '{cat}' có {len(category_events)}/{target_per_category} unique events "
                "sau khi loại trùng"
            )
        time.sleep(1)

    apply_event_mix(events_by_category, draft_per_category, ended_per_category)

    log.info(f"\n═══ Tổng cộng: {len(all_events)} events duy nhất ═══")
    return all_events


# ─────────────────────────────────────────
# Main
# ─────────────────────────────────────────
def main():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%H:%M:%S",
    )

    parser = argparse.ArgumentParser(
        description="Crawl events từ ticketbox.vn và lưu ra JSON (có seatmap & zones)"
    )
    parser.add_argument(
        "--categories", nargs="+", default=["all"],
        choices=CATEGORIES + ["all"],
        help="Category cần crawl. Dùng 'all' cho tất cả. (mặc định: all)",
    )
    parser.add_argument(
        "--max-pages", type=int, default=10,
        help="Số trang tối đa mỗi category (mặc định: 10)",
    )
    parser.add_argument(
        "--limit", type=int, default=DEFAULT_LIMIT,
        help=f"Số event mỗi trang khi gọi API search (mặc định: {DEFAULT_LIMIT})",
    )
    parser.add_argument(
        "--target-per-category", type=int, default=DEFAULT_TARGET_PER_CATEGORY,
        help=f"Số event tối đa cần lấy mỗi category (mặc định: {DEFAULT_TARGET_PER_CATEGORY})",
    )
    parser.add_argument(
        "--draft-per-category", type=int, default=DEFAULT_DRAFT_PER_CATEGORY,
        help=f"Số event DRAFT mỗi category (mặc định: {DEFAULT_DRAFT_PER_CATEGORY})",
    )
    parser.add_argument(
        "--ended-per-category", type=int, default=DEFAULT_ENDED_PER_CATEGORY,
        help=f"Số event ENDED mỗi category (mặc định: {DEFAULT_ENDED_PER_CATEGORY})",
    )
    parser.add_argument(
        "--no-detail", action="store_true",
        help=(
            "Bỏ qua fetch chi tiết và HTML JSON-LD "
            "(nhanh hơn, thiếu venue/description/location/geo)"
        ),
    )
    parser.add_argument(
        "--output", default="events.json",
        help="File output (mặc định: events.json)",
    )
    parser.add_argument(
        "--seed", type=int, default=None,
        help="Random seed để kết quả seatmap tái tạo được (tùy chọn)",
    )
    args = parser.parse_args()

    if args.seed is not None:
        random.seed(args.seed)
        log.info(f"Random seed: {args.seed}")

    cats         = CATEGORIES if "all" in args.categories else args.categories
    fetch_detail = not args.no_detail

    events = crawl_all(
        cats,
        max_pages=args.max_pages,
        limit=args.limit,
        target_per_category=args.target_per_category,
        draft_per_category=args.draft_per_category,
        ended_per_category=args.ended_per_category,
        fetch_detail=fetch_detail,
    )

    # Thống kê
    total_seats = sum(
        sum(z["totalSeats"] for z in e["zones"])
        for e in events
    )

    output = {
        "crawledAt":   datetime.now(timezone.utc).isoformat(),
        "totalEvents": len(events),
        "totalSeats":  total_seats,
        "categories":  cats,
        "events":      events,
    }

    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    log.info(f"✅ Đã lưu {len(events)} events ({total_seats} ghế) vào '{args.output}'")
    log.info("ℹ️  Thay DEFAULT_ADMIN_ID bằng UUID admin thật trước khi seed vào DB")


if __name__ == "__main__":
    main()
