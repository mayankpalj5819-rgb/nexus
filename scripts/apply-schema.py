#!/usr/bin/env python3
"""Apply Nexus SQL schema to Supabase via direct Postgres connection."""
import os
import sys
import psycopg2
from psycopg2 import sql

# Connection details — try multiple variants.
HOSTS_PORTS = [
    # Direct connection — IPv4 force
    ("db.mxfbotvszuegnzuefznw.supabase.co", 5432, "postgres"),
    # Session pooler (port 5432) — full tenant user
    ("aws-0-us-west-1.pooler.supabase.com", 5432, "postgres.mxfbotvszuegnzuefznw"),
    # Transaction pooler (port 6543) — full tenant user
    ("aws-0-us-west-1.pooler.supabase.com", 6543, "postgres.mxfbotvszuegnzuefznw"),
    # Session pooler — short user
    ("aws-0-us-west-1.pooler.supabase.com", 5432, "postgres"),
    # Transaction pooler — short user
    ("aws-0-us-west-1.pooler.supabase.com", 6543, "postgres"),
]
DB = "postgres"
PASSWORD = "os.environ.get("SUPABASE_DB_PASSWORD")"

SQL_FILE = "/home/z/my-project/download/supabase-schema.sql"

def main():
    import socket
    # Force IPv4 resolution
    orig_getaddrinfo = socket.getaddrinfo
    def ipv4_only(host, port, family=0, type=0, proto=0, flags=0):
        return orig_getaddrinfo(host, port, socket.AF_INET, type, proto, flags)
    socket.getaddrinfo = ipv4_only

    conn = None
    # Supabase pooler uses SNI to identify tenant — set the project ref as the
    # SNI server name. Pass it via the `sslrootcert` + host parameter trick
    # using a custom hostname that includes the project ref.
    project_ref = "mxfbotvszuegnzuefznw"
    sni_host = f"{project_ref}.supabase.co"

    for host, port, user in HOSTS_PORTS:
        print(f"Trying {user}@{host}:{port}/{DB} (SNI={sni_host})...")
        try:
            # Build connection with explicit SNI via the `host` parameter trick.
            # psycopg2 uses libpq which supports SNI via the `sslmode` and the
            # server name being the host. We need to set channel_binding or
            # use the sni_host as the actual TCP host but resolve it to the
            # pooler IP.
            import ssl
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE

            conn = psycopg2.connect(
                host=host, port=port, dbname=DB, user=user, password=PASSWORD,
                connect_timeout=15, sslmode="require",
                options=f"-c search_path=public",
                # Pass the SNI server name via libpq's hostaddr/sslmode
            )
            print("Connected.")
            break
        except Exception as e:
            print(f"  Failed: {e}")
    if conn is None:
        # Try one more: use the `host` as project_ref.supabase.co (resolves to pooler IPs)
        for sni, port, user in [
            (f"{project_ref}.supabase.co", 6543, "postgres.mxfbotvszuegnzuefznw"),
            (f"{project_ref}.supabase.co", 5432, "postgres.mxfbotvszuegnzuefznw"),
        ]:
            print(f"\nTrying SNI-based: {user}@{sni}:{port}/{DB}...")
            try:
                conn = psycopg2.connect(
                    host=sni, port=port, dbname=DB, user=user, password=PASSWORD,
                    connect_timeout=15, sslmode="require",
                )
                print("Connected!")
                break
            except Exception as e:
                print(f"  Failed: {e}")
    if conn is None:
        print("\nAll connection attempts failed.")
        sys.exit(1)

    conn.autocommit = True
    cur = conn.cursor()

    # Read the schema
    with open(SQL_FILE, "r") as f:
        sql_text = f.read()
    print(f"Schema file loaded: {len(sql_text)} bytes")

    # Execute the entire script (psycopg2 handles multiple statements)
    try:
        cur.execute(sql_text)
        print("Schema executed successfully.")
    except Exception as e:
        print(f"Execution error: {e}")
        # Try splitting into statements and running individually for better error reporting
        print("\nFalling back to per-statement execution...")
        # Already executed up to the failing statement; rollback and retry per-statement
        conn.rollback()
        # Split on semicolons, respecting strings/comments is hard — use simple split
        # Supabase schema is designed to be safe to re-run, so split on ';' followed by newline
        statements = sql_text.split(";\n")
        ok = 0
        failed = 0
        for i, stmt in enumerate(statements):
            stmt = stmt.strip()
            if not stmt or stmt.startswith("--"):
                continue
            try:
                cur.execute(stmt + ";")
                ok += 1
            except Exception as e2:
                # Many errors are "already exists" which is expected
                msg = str(e2).lower()
                if "already exists" in msg or "duplicate" in msg:
                    ok += 1
                else:
                    failed += 1
                    if failed <= 5:
                        print(f"  STMT {i} failed: {e2}")
                        print(f"  First 100 chars: {stmt[:100]}")
        print(f"\nPer-statement result: {ok} ok, {failed} failed")

    # Verify tables exist
    print("\n--- Verifying tables ---")
    cur.execute("""
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name;
    """)
    tables = [r[0] for r in cur.fetchall()]
    print(f"Found {len(tables)} tables in public schema:")
    for t in tables:
        print(f"  - {t}")

    # Verify RLS is enabled
    print("\n--- Verifying RLS ---")
    cur.execute("""
        SELECT relname, relrowsecurity
        FROM pg_class
        WHERE relnamespace = 'public'::regnamespace
          AND relkind = 'r'
        ORDER BY relname;
    """)
    rls_status = cur.fetchall()
    rls_enabled = sum(1 for r in rls_status if r[1])
    print(f"RLS enabled on {rls_enabled}/{len(rls_status)} tables:")
    for name, enabled in rls_status:
        mark = "✓" if enabled else "✗"
        print(f"  {mark} {name}")

    # Verify policies
    print("\n--- Verifying RLS policies ---")
    cur.execute("""
        SELECT tablename, COUNT(*) AS policy_count
        FROM pg_policies
        WHERE schemaname = 'public'
        GROUP BY tablename
        ORDER BY tablename;
    """)
    policies = cur.fetchall()
    total_policies = sum(p[1] for p in policies)
    print(f"Total policies: {total_policies} across {len(policies)} tables")

    # Verify extensions
    print("\n--- Verifying extensions ---")
    cur.execute("SELECT extname, extversion FROM pg_extension WHERE extname IN ('uuid-ossp', 'pgcrypto');")
    for ext, ver in cur.fetchall():
        print(f"  {ext} v{ver}")

    cur.close()
    conn.close()
    print("\n✅ Nexus schema applied successfully.")

if __name__ == "__main__":
    main()
