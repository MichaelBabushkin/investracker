#!/opt/homebrew/bin/python3.11
"""
Move existing report PDFs from Postgres (file_data bytea) to Cloudflare R2.

For each row that still has inline bytes and no storage_key:
  1. upload the bytes to R2
  2. read them back and verify size matches
  3. set storage_key and NULL out file_data (only after a verified upload)

Idempotent and safe: a row is only cleared from Postgres once its bytes are
confirmed in R2. Re-runnable; already-migrated rows are skipped.

Usage:
    cd backend
    python scripts/migrate_pdfs_to_r2.py            # migrate
    python scripts/migrate_pdfs_to_r2.py --dry-run  # report only
"""
import argparse
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
logging.disable(logging.CRITICAL)

from sqlalchemy import text                        # noqa: E402
from app.core.database import SessionLocal         # noqa: E402
from app.services import storage_service           # noqa: E402


def main(dry_run: bool = False):
    if not storage_service.is_configured():
        print("R2 is not configured (set R2_* env vars). Aborting.")
        sys.exit(1)

    db = SessionLocal()
    rows = db.execute(text("""
        SELECT id, user_id, filename, file_size, octet_length(file_data) AS bytes
        FROM israeli_report_uploads
        WHERE file_data IS NOT NULL AND storage_key IS NULL
        ORDER BY id
    """)).fetchall()

    total_bytes = sum(r[4] or 0 for r in rows)
    print(f"{len(rows)} PDF(s) to migrate, {total_bytes/1024/1024:.2f} MB total")
    if dry_run:
        for r in rows:
            print(f"  id={r[0]:4d}  {r[2][:40]:40s} {(r[4] or 0)/1024:6.0f} KB")
        print("[DRY RUN — nothing changed]")
        db.close()
        return

    migrated = 0
    for rid, user_id, filename, file_size, nbytes in rows:
        # Fetch bytes in a short-lived query (don't hold all PDFs in memory)
        data = db.execute(text(
            "SELECT file_data FROM israeli_report_uploads WHERE id = :i"
        ), {"i": rid}).scalar()
        if data is None:
            continue
        data = bytes(data)

        try:
            key = storage_service.upload_pdf(user_id, filename, data)
            # Verify round-trip before dropping the DB copy
            back = storage_service.download_pdf(key)
            if len(back) != len(data):
                print(f"  id={rid} VERIFY FAILED (size mismatch) — leaving in DB")
                storage_service.delete_pdf(key)
                continue
            db.execute(text("""
                UPDATE israeli_report_uploads
                SET storage_key = :k, file_data = NULL
                WHERE id = :i
            """), {"k": key, "i": rid})
            db.commit()
            migrated += 1
            print(f"  id={rid}  {filename[:40]:40s} -> {key}")
        except Exception as e:
            db.rollback()
            print(f"  id={rid} FAILED: {e}")

    print(f"\nmigrated {migrated}/{len(rows)}")
    # Report reclaimed space (run VACUUM FULL separately to shrink on disk)
    remaining = db.execute(text(
        "SELECT COALESCE(SUM(octet_length(file_data)),0) FROM israeli_report_uploads WHERE file_data IS NOT NULL"
    )).scalar()
    print(f"inline bytes remaining in Postgres: {(remaining or 0)/1024/1024:.2f} MB")
    print("Tip: run `VACUUM FULL israeli_report_uploads;` to reclaim disk after migration.")
    db.close()


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    main(dry_run=ap.parse_args().dry_run)
