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
  - status        : EventStatus (PUBLISHED)
  - createdAt     : DateTime (now)
  - seatmapJson   : Json?  ← sinh ngẫu nhiên theo arc-layout (giống seed.js)
  - seatmapVersion: Int    ← sinh ngẫu nhiên 1–3
  - endDate       : DateTime? (null)

Zone model (nhúng vào output, dùng khi seed vào DB):
  - name, rows, cols, price, arcSeatsPerRow
  - seats (label, row, col)
"""

import json
import math
import random
import time
import uuid
import logging
import argparse
from datetime import datetime, timezone
from typing import Optional

import requests

# ─────────────────────────────────────────
# Cấu hình
# ─────────────────────────────────────────
SEARCH_API = "https://api-v2.ticketbox.vn/search/v2/events"
DETAIL_API  = "https://api-v2.ticketbox.vn/events/{event_id}"

CATEGORIES = ["music", "festival", "sport", "theatre", "cinema", "other"]

DEFAULT_ADMIN_ID = "00000000-0000-0000-0000-000000000000"  # placeholder — thay bằng UUID admin thật khi seed
DEFAULT_LIMIT    = 50
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


# ─────────────────────────────────────────
# Mapping
# ─────────────────────────────────────────
def map_event(raw: dict, detail: Optional[dict] = None) -> dict:
    """
    Map dữ liệu từ API + sinh ngẫu nhiên seatmapJson, seatmapVersion, zones.
    """
    now_iso = datetime.now(timezone.utc).isoformat()

    # Venue & description từ detail
    venue       = "TBD"
    description = None
    if detail:
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

    # Lấy giá từ API để làm anchor cho preset
    base_price = raw.get("price")

    # Sinh zones + seatmap ngẫu nhiên
    zones_config, seatmap_json, seatmap_version = random_zones_and_seatmap(base_price)

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
        "status":         "PUBLISHED",
        "createdAt":      now_iso,
        "seatmapJson":    seatmap_json,
        "seatmapVersion": seatmap_version,

        # ── Zones (dùng khi seed DB) ──
        "zones": [
            {
                "name":           z["name"],
                "price":          z["price"],
                "rows":           z["rows"],
                "cols":           z["cols"],
                "arcSeatsPerRow": z["arcSeatsPerRow"],
                # Tổng ghế = sum(arcSeatsPerRow)
                "totalSeats":     sum(z["arcSeatsPerRow"]),
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
        },
    }


# ─────────────────────────────────────────
# Crawl
# ─────────────────────────────────────────
log = logging.getLogger(__name__)

def crawl_category(
    category: str,
    max_pages: int = 10,
    fetch_detail: bool = True,
) -> list[dict]:
    events: list[dict] = []
    page = 1
    log.info(f"▶ Bắt đầu crawl category: {category}")

    while page <= max_pages:
        log.info(f"  Trang {page}/{max_pages}...")
        try:
            resp = fetch_events_page(category, page)
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
            if fetch_detail and raw.get("id"):
                detail = fetch_event_detail(raw["id"])
                time.sleep(DELAY_DETAIL)

            events.append(map_event(raw, detail))

        if not pagination.get("hasMore", False):
            log.info("  Đã hết trang.")
            break

        page += 1
        time.sleep(DELAY_PAGES)

    log.info(f"✓ Category '{category}': {len(events)} events")
    return events


def crawl_all(
    categories: list[str],
    max_pages: int = 10,
    fetch_detail: bool = True,
) -> list[dict]:
    all_events: list[dict] = []
    seen_ids: set[int] = set()

    for cat in categories:
        for event in crawl_category(cat, max_pages, fetch_detail):
            tid = event["_source"].get("ticketboxId")
            if tid not in seen_ids:
                seen_ids.add(tid)
                all_events.append(event)
        time.sleep(1)

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
        "--categories", nargs="+", default=["music"],
        choices=CATEGORIES + ["all"],
        help="Category cần crawl. Dùng 'all' cho tất cả. (mặc định: music)",
    )
    parser.add_argument(
        "--max-pages", type=int, default=10,
        help="Số trang tối đa mỗi category (mặc định: 10, ~500 events/category)",
    )
    parser.add_argument(
        "--no-detail", action="store_true",
        help="Bỏ qua fetch chi tiết (nhanh hơn, thiếu venue/description)",
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

    events = crawl_all(cats, max_pages=args.max_pages, fetch_detail=fetch_detail)

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
