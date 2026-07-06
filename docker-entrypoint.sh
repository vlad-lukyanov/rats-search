#!/bin/sh
# Fix /data ownership when mounted from host (runs as root)
chown rats:rats /data 2>/dev/null || true

# Switch to rats user and run CMD
exec runuser -u rats -- "$@"
