#!/bin/bash
#
# Connect (and stay connected to) the Zebra test devices over adb.
#
# Android 11+ "Wireless debugging" (the toggle under Developer options) uses a
# random port and switches itself off on reboot, so it has to be re-enabled by
# hand every time. This script bootstraps from whatever transport is available
# right now - USB, a saved address, or mDNS discovery of a wireless-debugging
# device - and then promotes each device to plain "adb tcpip 5555", which uses a
# fixed port and survives Wi-Fi drops and the toggle being switched off again.
#
# Devices are remembered by model name (e.g. tc52, tc20) in
#   $XDG_CONFIG_HOME/openboxes-mobile/devices
# so later runs can reconnect without any interaction on the device.
#
# Usage:
#   scripts/adb-connect.sh               # reconnect everything we know about
#   scripts/adb-connect.sh status        # show connected devices with model names
#   scripts/adb-connect.sh forget <name> # drop a saved device
#
set -euo pipefail

CONFIG_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/openboxes-mobile"
DEVICES_FILE="$CONFIG_DIR/devices"
ADB_TCP_PORT=5555

log() { echo "  $*"; }
warn() { echo "Warning: $*" >&2; }
die() { echo "Error: $*" >&2; exit 1; }
usage() {
    # Print the comment block at the top of this file.
    awk 'NR > 1 { if ($0 !~ /^#/) exit; sub(/^# ?/, ""); print }' "$0"
}

case "${1:-}" in -h|--help) usage; exit 0 ;; esac

command -v adb >/dev/null 2>&1 || die "adb not found. Install the Android platform-tools (sudo apt install adb)."

# Never kill the adb server: on Ubuntu, Vysor keeps a long-lived connection
# through it and restarting the server drops every mirrored screen.
adb start-server >/dev/null 2>&1 || true

mkdir -p "$CONFIG_DIR"
touch "$DEVICES_FILE"

# --- Saved devices -----------------------------------------------------------

saved_addresses() {
    # Prints "name address" for each saved device, skipping comments/blanks.
    grep -v '^[[:space:]]*\(#\|$\)' "$DEVICES_FILE" 2>/dev/null || true
}

remember_device() {
    local name="$1" address="$2" tmp
    tmp="$(mktemp)"
    grep -v "^${name}[[:space:]]" "$DEVICES_FILE" > "$tmp" 2>/dev/null || true
    echo "${name} ${address}" >> "$tmp"
    sort -o "$tmp" "$tmp"
    mv "$tmp" "$DEVICES_FILE"
}

forget_device() {
    local name="$1" tmp
    tmp="$(mktemp)"
    grep -v "^${name}[[:space:]]" "$DEVICES_FILE" > "$tmp" 2>/dev/null || true
    mv "$tmp" "$DEVICES_FILE"
    log "Forgot ${name}."
}

# --- Device inspection -------------------------------------------------------

# Serials of everything adb currently considers usable (state "device").
online_serials() {
    adb devices | awk '$2 == "device" { print $1 }'
}

device_model() {
    # Lowercased model, e.g. "tc52". Falls back to the serial if unavailable.
    local serial="$1" model
    model="$(adb -s "$serial" shell getprop ro.product.model 2>/dev/null | tr -d '\r' | tr '[:upper:]' '[:lower:]' | tr -cd 'a-z0-9._-')"
    echo "${model:-$serial}"
}

device_ip() {
    # The device's Wi-Fi address, needed to reconnect on the fixed port.
    local serial="$1" ip
    ip="$(adb -s "$serial" shell ip -f inet addr show wlan0 2>/dev/null \
        | sed -n 's/.*inet \([0-9.]*\)\/.*/\1/p' | head -1 | tr -d '\r')"
    if [ -z "$ip" ]; then
        ip="$(adb -s "$serial" shell getprop dhcp.wlan0.ipaddress 2>/dev/null | tr -d '\r')"
    fi
    echo "$ip"
}

# A serial like "192.168.50.22:5555" is already the stable transport we want.
is_tcp_serial() { [[ "$1" == *:* ]]; }
is_stable_serial() { [[ "$1" == *:${ADB_TCP_PORT} ]]; }

# --- Connection strategies ---------------------------------------------------

try_connect() {
    local address="$1" output
    output="$(adb connect "$address" 2>&1 || true)"
    case "$output" in
        *"connected to"*) return 0 ;;
        *"version doesn't match"*|*"version does not match"*)
            warn "adb client/server version mismatch: $output"
            warn "Vysor ships its own adb; run its version, or close Vysor and retry."
            return 1
            ;;
        *) return 1 ;;
    esac
}

connect_saved() {
    local name address
    while read -r name address; do
        [ -n "${address:-}" ] || continue
        if try_connect "$address"; then
            log "Reconnected ${name} on ${address}."
        fi
    done < <(saved_addresses)
}

connect_mdns() {
    # Devices with Android 11 "Wireless debugging" switched on advertise
    # themselves over mDNS once paired, so we can find them without reading the
    # pairing dialog off the device screen.
    local name service address
    while read -r name service address; do
        case "$service" in
            *_adb-tls-connect*|*_adb._tcp*) ;;
            *) continue ;;
        esac
        [ -n "${address:-}" ] || continue
        if try_connect "$address"; then
            log "Connected wireless-debugging device on ${address} (${name})."
        fi
    done < <(adb mdns services 2>/dev/null | grep '_adb' || true)
}

# Promote a device to "adb tcpip 5555": a fixed port that keeps working after
# the Wireless debugging toggle turns itself off, and across Wi-Fi reconnects.
promote_to_fixed_port() {
    local serial="$1" name ip
    name="$(device_model "$serial")"
    ip="$(device_ip "$serial")"

    if [ -z "$ip" ]; then
        warn "Could not read the Wi-Fi address of ${name} (${serial}); is it on Wi-Fi?"
        return 1
    fi

    if adb devices | awk '$2 == "device" { print $1 }' | grep -qx "${ip}:${ADB_TCP_PORT}"; then
        remember_device "$name" "${ip}:${ADB_TCP_PORT}"
        return 0
    fi

    log "Switching ${name} to adb tcpip ${ADB_TCP_PORT} (survives reboots of the wireless debugging toggle)..."
    adb -s "$serial" tcpip "$ADB_TCP_PORT" >/dev/null 2>&1 || {
        warn "Could not enable tcpip mode on ${name}."
        return 1
    }
    # adbd restarts on the device, so give it a moment before reconnecting.
    local attempt
    for attempt in 1 2 3 4 5; do
        if try_connect "${ip}:${ADB_TCP_PORT}"; then
            remember_device "$name" "${ip}:${ADB_TCP_PORT}"
            log "${name} is now reachable at ${ip}:${ADB_TCP_PORT}."
            # Drop the transport we bootstrapped from if it was the old
            # wireless-debugging one, so the device is not listed twice.
            if is_tcp_serial "$serial"; then
                adb disconnect "$serial" >/dev/null 2>&1 || true
            fi
            return 0
        fi
        sleep 1
    done
    warn "Enabled tcpip mode on ${name} but could not connect to ${ip}:${ADB_TCP_PORT}."
    return 1
}

show_status() {
    local serial name
    local found=0
    for serial in $(online_serials); do
        name="$(device_model "$serial")"
        if is_stable_serial "$serial"; then
            echo "  ${name}  ${serial}  (fixed port - stays connected)"
        elif is_tcp_serial "$serial"; then
            echo "  ${name}  ${serial}  (wireless debugging - random port, drops when the toggle resets)"
        else
            echo "  ${name}  ${serial}  (USB)"
        fi
        found=1
    done
    [ "$found" = 1 ] || echo "  (no devices connected)"
}

# --- Main --------------------------------------------------------------------

case "${1:-connect}" in
    status)
        show_status
        exit 0
        ;;
    forget)
        [ $# -ge 2 ] || die "Usage: scripts/adb-connect.sh forget <name>"
        forget_device "$2"
        exit 0
        ;;
    connect) ;;
    *)
        die "Unknown command: $1 (expected connect, status or forget)"
        ;;
esac

echo "Connecting to devices..."
connect_saved
connect_mdns

serials="$(online_serials)"
if [ -z "$serials" ]; then
    cat >&2 <<'EOF'

No devices found. To bootstrap a device once:

  * Plug it in over USB and accept the "Allow USB debugging" prompt, or
  * Turn on Developer options > Wireless debugging on the device, pair it once
    with "adb pair <host>:<port> <code>", then re-run this script.

After that this script switches the device to adb tcpip 5555, and you should
not need the Wireless debugging toggle again until the device is rebooted.
EOF
    exit 1
fi

# Give every device a stable address, so the next run needs no interaction.
for serial in $serials; do
    is_stable_serial "$serial" && continue
    promote_to_fixed_port "$serial" || true
done

echo
echo "Connected devices:"
show_status
