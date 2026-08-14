#!/usr/bin/env bash
# ============================================================
# PoC — Proof of Consent  |  One-command startup
# ============================================================
# Usage:
#   ./start.sh          Start all 3 services (backend, agent, frontend)
#   ./start.sh stop     Kill all services
#   ./start.sh status   Show which services are running
#   ./start.sh logs     Tail logs for all services
# ============================================================

ROOT="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$ROOT/logs"
PID_DIR="$ROOT/.pids"

mkdir -p "$LOG_DIR" "$PID_DIR"

# ── Colours ──────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; NC='\033[0m'

# ── Helpers ──────────────────────────────────────────────────
log()  { echo -e "${CYAN}[PoC]${NC} $*"; }
ok()   { echo -e "${GREEN}  ✔${NC} $*"; }
warn() { echo -e "${YELLOW}  ⚠${NC} $*"; }
fail() { echo -e "${RED}  ✖${NC} $*"; }

start_service() {
  local name="$1" dir="$2" cmd="$3" logfile="$LOG_DIR/${name}.log"
  local pidfile="$PID_DIR/${name}.pid"

  # Check if already running
  if [ -f "$pidfile" ] && kill -0 "$(cat "$pidfile")" 2>/dev/null; then
    warn "$name already running (PID $(cat "$pidfile"))"
    return 0
  fi

  # Clear old log
  > "$logfile"

  log "Starting $name ..."
  # Use setsid to fully detach from parent shell
  setsid sh -c "cd \"$dir\" && $cmd >> \"$logfile\" 2>&1" &
  local child_pid=$!
  # Wait briefly for the process to start
  sleep 2

  # Find the actual service process (setsid creates a new session)
  local actual_pid
  actual_pid=$(pgrep -f "$cmd" 2>/dev/null | head -1 || echo "")

  if [ -n "$actual_pid" ] && kill -0 "$actual_pid" 2>/dev/null; then
    echo "$actual_pid" > "$pidfile"
    ok "$name started (PID $actual_pid)  →  $logfile"
  else
    fail "$name failed to start. Check $logfile"
    tail -5 "$logfile" 2>/dev/null
  fi
}

stop_service() {
  local name="$1"
  local pidfile="$PID_DIR/${name}.pid"
  if [ -f "$pidfile" ]; then
    local pid
    pid=$(cat "$pidfile")
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null
      sleep 1
      # Force kill if still running
      kill -9 "$pid" 2>/dev/null || true
      ok "$name stopped (PID $pid)"
    fi
    rm -f "$pidfile"
  fi
}

# ── Dependency check ─────────────────────────────────────────
check_deps() {
  log "Checking dependencies..."
  local missing=0
  command -v node    >/dev/null 2>&1 || { fail "Node.js not found"; missing=1; }
  command -v npm     >/dev/null 2>&1 || { fail "npm not found"; missing=1; }
  command -v python3 >/dev/null 2>&1 || { fail "python3 not found"; missing=1; }
  command -v curl    >/dev/null 2>&1 || { fail "curl not found"; missing=1; }
  [ "$missing" -eq 1 ] && exit 1
  ok "Node $(node -v) | npm $(npm -v) | Python $(python3 --version 2>&1 | awk '{print $2}')"
}

# ── Install dependencies (if needed) ────────────────────────
install_deps() {
  # Backend
  if [ ! -d "$ROOT/backend/node_modules" ]; then
    log "Installing backend dependencies..."
    (cd "$ROOT/backend" && npm install --no-fund --no-audit >> "$LOG_DIR/npm-install.log" 2>&1)
    ok "Backend deps installed"
  fi

  # Blockchain (for contract compilation/tests)
  if [ ! -d "$ROOT/blockchain/node_modules" ]; then
    log "Installing blockchain dependencies..."
    # Fix npm script-shell if broken
    [ -f "$ROOT/blockchain/.npmrc" ] && grep -q "cmd.exe" "$ROOT/blockchain/.npmrc" && rm -f "$ROOT/blockchain/.npmrc"
    (cd "$ROOT/blockchain" && npm install --legacy-peer-deps --no-fund --no-audit >> "$LOG_DIR/npm-install.log" 2>&1)
    ok "Blockchain deps installed"
  fi

  # Agent service
  if [ ! -d "$ROOT/agentservice/venv" ]; then
    log "Creating Python virtual environment..."
    (cd "$ROOT/agentservice" && python3 -m venv venv >> "$LOG_DIR/pip-install.log" 2>&1)
    (cd "$ROOT/agentservice" && ./venv/bin/pip install -r requirements.txt >> "$LOG_DIR/pip-install.log" 2>&1)
    ok "Agent service deps installed"
  fi
}

# ── Wait for service to be healthy ───────────────────────────
wait_for_health() {
  local name="$1" url="$2" max_wait="${3:-15}"
  for i in $(seq 1 "$max_wait"); do
    if curl -sf "$url" > /dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  return 1
}

# ── Status ───────────────────────────────────────────────────
show_status() {
  echo ""
  log "Service Status"
  echo "──────────────────────────────────────────"
  for name in backend agent frontend; do
    local pidfile="$PID_DIR/${name}.pid"
    if [ -f "$pidfile" ] && kill -0 "$(cat "$pidfile")" 2>/dev/null; then
      echo -e "  ${GREEN}✔${NC} $name  (PID $(cat "$pidfile"))"
    else
      echo -e "  ${RED}✖${NC} $name  (stopped)"
    fi
  done
  echo "──────────────────────────────────────────"
  echo ""
  echo "  URLs:"
  echo "    Frontend:     http://127.0.0.1:5502"
  echo "    Backend API:  http://localhost:4000/api/health"
  echo "    Agent Svc:    http://localhost:8000/health"
  echo ""
  echo "  Blockchain:    Base Sepolia (0x764bF8b277a2c08B7A5B309Bb6853c5576C6f168)"
  echo ""
}

# ══════════════════════════════════════════════════════════════
#  MAIN
# ══════════════════════════════════════════════════════════════

case "${1:-start}" in

  start)
    echo ""
    echo "  ╔══════════════════════════════════════════╗"
    echo "  ║       PoC — Proof of Consent             ║"
    echo "  ║       Understand Before You Consent      ║"
    echo "  ╚══════════════════════════════════════════╝"
    echo ""

    check_deps
    install_deps

    # Ensure blockchain .env exists (needed for hardhat.config.js)
    if [ ! -f "$ROOT/blockchain/.env" ] && [ -f "$ROOT/backend/.env" ]; then
      cp "$ROOT/backend/.env" "$ROOT/blockchain/.env"
      log "Copied .env to blockchain/"
    fi

    # 1) Backend API (Node.js :4000)
    start_service "backend" "$ROOT/backend" "node src/server.js"

    # Wait for backend to be healthy
    log "Waiting for backend..."
    if wait_for_health "backend" "http://localhost:4000/api/health" 15; then
      ok "Backend healthy"
    else
      fail "Backend health check failed"
    fi

    # 2) Agent Service (Python :8000)
    start_service "agent" "$ROOT/agentservice" "./venv/bin/python3 main.py"

    # Wait for agent to be healthy
    log "Waiting for agent service..."
    if wait_for_health "agent" "http://localhost:8000/health" 15; then
      ok "Agent service healthy"
    else
      fail "Agent service health check failed"
    fi

    # 3) Frontend static server (:5502)
    start_service "frontend" "$ROOT/frontend" "python3 -m http.server 5502"

    # Wait for frontend
    sleep 1
    if curl -sf http://localhost:5502/ > /dev/null 2>&1; then
      ok "Frontend healthy"
    else
      fail "Frontend health check failed"
    fi

    show_status

    echo "  All services started!"
    echo "  Open http://127.0.0.1:5502 in your browser"
    echo ""
    ;;

  stop)
    log "Stopping all services..."
    stop_service frontend
    stop_service agent
    stop_service backend
    ok "All services stopped"
    ;;

  restart)
    "$0" stop
    sleep 2
    "$0" start
    ;;

  status)
    show_status
    ;;

  logs)
    log "Tailing logs (Ctrl+C to stop)..."
    tail -f "$LOG_DIR"/*.log 2>/dev/null || fail "No log files found"
    ;;

  *)
    echo "Usage: $0 {start|stop|restart|status|logs}"
    echo ""
    echo "  Commands:"
    echo "    start    Start all 3 services"
    echo "    stop     Stop all services"
    echo "    restart  Restart all services"
    echo "    status   Show service status"
    echo "    logs     Tail all service logs"
    echo ""
    exit 1
    ;;
esac
