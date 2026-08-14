#!/usr/bin/env bash
# ============================================================
# PoC — Proof of Consent  |  One-command startup
# ============================================================
# Usage:
#   ./start.sh          Start all 4 services
#   ./start.sh stop     Kill all services
#   ./start.sh status   Show which services are running
# ============================================================

set -euo pipefail

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

  if [ -f "$pidfile" ] && kill -0 "$(cat "$pidfile")" 2>/dev/null; then
    warn "$name already running (PID $(cat "$pidfile"))"
    return 0
  fi

  log "Starting $name ..."
  (cd "$dir" && eval "$cmd" >> "$logfile" 2>&1 &
   echo $! > "$pidfile")
  sleep 1

  if [ -f "$pidfile" ] && kill -0 "$(cat "$pidfile")" 2>/dev/null; then
    ok "$name started (PID $(cat "$pidfile"))  →  $logfile"
  else
    fail "$name failed to start. Check $logfile"
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
      ok "$name stopped (PID $pid)"
    fi
    rm -f "$pidfile"
  fi
}

# ── Dependency check ─────────────────────────────────────────
check_deps() {
  log "Checking dependencies..."
  local missing=0
  command -v node  >/dev/null 2>&1 || { fail "Node.js not found"; missing=1; }
  command -v npm   >/dev/null 2>&1 || { fail "npm not found"; missing=1; }
  command -v python3 >/dev/null 2>&1 || { fail "python3 not found"; missing=1; }
  [ $missing -eq 1 ] && exit 1
  ok "Node $(node -v) | npm $(npm -v) | Python $(python3 --version 2>&1 | awk '{print $2}')"
}

# ── Install dependencies (if needed) ────────────────────────
install_deps() {
  if [ ! -d "$ROOT/backend/node_modules" ]; then
    log "Installing backend dependencies..."
    (cd "$ROOT/backend" && npm install --no-fund --no-audit >> "$LOG_DIR/npm-install.log" 2>&1)
    ok "Backend deps installed"
  fi

  if [ ! -d "$ROOT/blockchain/node_modules" ]; then
    log "Installing blockchain dependencies..."
    (cd "$ROOT/blockchain" && npm install --no-fund --no-audit >> "$LOG_DIR/npm-install.log" 2>&1)
    ok "Blockchain deps installed"
  fi

  if [ ! -d "$ROOT/agentservice/venv" ]; then
    log "Creating Python virtual environment..."
    (cd "$ROOT/agentservice" && python3 -m venv venv >> "$LOG_DIR/pip-install.log" 2>&1)
    (cd "$ROOT/agentservice" && ./venv/bin/pip install -r requirements.txt >> "$LOG_DIR/pip-install.log" 2>&1)
    ok "Agent service deps installed"
  fi
}

# ── Status ───────────────────────────────────────────────────
show_status() {
  echo ""
  log "Service Status"
  echo "──────────────────────────────────────────"
  for name in hardhat backend agent frontend; do
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
}

# ══════════════════════════════════════════════════════════════
#  MAIN
# ══════════════════════════════════════════════════════════════

case "${1:-start}" in

  start)
    echo ""
    echo "  ╔══════════════════════════════════════════╗"
    echo "  ║     🏥 PoC — Proof of Consent            ║"
    echo "  ║     Understand Before You Consent        ║"
    echo "  ╚══════════════════════════════════════════╝"
    echo ""

    check_deps
    install_deps

    # 1) Hardhat node (local blockchain)
    start_service "hardhat" "$ROOT/blockchain" \
      "npx --yes hardhat node" \
      &

    # Wait for Hardhat to be ready
    log "Waiting for Hardhat node..."
    for i in $(seq 1 20); do
      if curl -sf http://127.0.0.1:8545 > /dev/null 2>&1; then
        ok "Hardhat node ready"
        break
      fi
      sleep 1
    done

    # Deploy smart contract
    if [ -f "$ROOT/blockchain/artifacts/contracts/ConsentRegistry.sol/ConsentRegistry.json" ]; then
      log "Deploying smart contract..."
      (cd "$ROOT/blockchain" && npx hardhat run scripts/deploy.js --network localhost >> "$LOG_DIR/deploy.log" 2>&1)
      ok "Contract deployed — check $LOG_DIR/deploy.log"
    else
      log "Compiling smart contract..."
      (cd "$ROOT/blockchain" && npx hardhat compile >> "$LOG_DIR/compile.log" 2>&1)
      log "Deploying smart contract..."
      (cd "$ROOT/blockchain" && npx hardhat run scripts/deploy.js --network localhost >> "$LOG_DIR/deploy.log" 2>&1)
      ok "Contract compiled & deployed"
    fi

    # 2) Backend API (Node.js :4000)
    start_service "backend" "$ROOT/backend" \
      "node src/server.js"

    # 3) Agent Service (Python :8000)
    start_service "agent" "$ROOT/agentservice" \
      "./venv/bin/python3 main.py"

    # 4) Frontend static server (:5502)
    start_service "frontend" "$ROOT/frontend" \
      "python3 -m http.server 5502"

    show_status

    echo "  🎉 All services started!"
    echo "  Open http://127.0.0.1:5502 in your browser"
    echo ""
    ;;

  stop)
    log "Stopping all services..."
    stop_service frontend
    stop_service agent
    stop_service backend
    stop_service hardhat
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
    local svc="${2:-backend}"
    local logfile="$LOG_DIR/${svc}.log"
    if [ -f "$logfile" ]; then
      tail -50 "$logfile"
    else
      fail "No logs for $svc (expected: $logfile)"
    fi
    ;;

  *)
    echo "Usage: $0 {start|stop|restart|status|logs [service]}"
    echo ""
    echo "  Services: hardhat, backend, agent, frontend"
    exit 1
    ;;
esac
