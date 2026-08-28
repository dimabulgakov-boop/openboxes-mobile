#!/bin/bash
#
# Download an APK built by Bitrise and install it on the connected test devices.
#
# Every pull request against develop gets an APK built by the "android-only"
# workflow. Rather than hunting for that build in the Bitrise UI, downloading
# the artifact and running adb by hand, this script resolves the build from a PR
# number (or build number, or branch), downloads the APK once, and installs it
# on every connected device.
#
# PR builds use the applicationId com.openboxes.android.experimental, so they
# install alongside - not on top of - the regular app.
#
# Usage:
#   scripts/install-apk.sh --pr 443            # latest successful build for PR 443
#   scripts/install-apk.sh --build 1234        # a specific Bitrise build number
#   scripts/install-apk.sh --branch develop    # latest successful build of a branch
#   scripts/install-apk.sh ~/Downloads/app.apk # a local file or an https:// URL
#   scripts/install-apk.sh --list              # show recent builds and their PRs
#
# Options:
#   -d, --device <name>   Install only on this device (model name like tc52, or
#                         an adb serial). Repeatable. Default: every device.
#   -l, --launch          Launch the app after installing.
#   -r, --reinstall       Uninstall first if the install is rejected (signature
#                         or version conflicts).
#       --download-only   Download the APK and print its path; do not install.
#       --open-on-device  Open the Bitrise public install page on the device
#                         browser instead of installing over adb.
#       --no-connect      Skip the automatic adb reconnect step.
#
# Configuration (in $XDG_CONFIG_HOME/openboxes-mobile/apk.env or the environment):
#   BITRISE_API_TOKEN   Personal access token from
#                       https://app.bitrise.io/me/profile#/security
#   BITRISE_APP_SLUG    Optional; discovered from the API and cached on first use.
#
set -euo pipefail

REPO_NAME="openboxes-mobile"
CONFIG_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/openboxes-mobile"
CONFIG_FILE="$CONFIG_DIR/apk.env"
CACHE_DIR="${XDG_CACHE_HOME:-$HOME/.cache}/openboxes-mobile/apk"
BITRISE_API="https://api.bitrise.io/v0.1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log() { echo "  $*"; }
warn() { echo "Warning: $*" >&2; }
die() { echo "Error: $*" >&2; exit 1; }
usage() {
    # Print the comment block at the top of this file.
    awk 'NR > 1 { if ($0 !~ /^#/) exit; sub(/^# ?/, ""); print }' "$0"
}

# --- Arguments ---------------------------------------------------------------

PR_NUMBER=""
BUILD_NUMBER=""
BRANCH=""
SOURCE=""
DEVICES=()
LAUNCH=false
REINSTALL=false
DOWNLOAD_ONLY=false
OPEN_ON_DEVICE=false
AUTO_CONNECT=true
LIST_BUILDS=false

while [ $# -gt 0 ]; do
    case "$1" in
        --pr) PR_NUMBER="${2:-}"; shift 2 ;;
        --build) BUILD_NUMBER="${2:-}"; shift 2 ;;
        --branch) BRANCH="${2:-}"; shift 2 ;;
        --list) LIST_BUILDS=true; shift ;;
        -d|--device) DEVICES+=("${2:-}"); shift 2 ;;
        -l|--launch) LAUNCH=true; shift ;;
        -r|--reinstall) REINSTALL=true; shift ;;
        --download-only) DOWNLOAD_ONLY=true; shift ;;
        --open-on-device) OPEN_ON_DEVICE=true; shift ;;
        --no-connect) AUTO_CONNECT=false; shift ;;
        -h|--help) usage; exit 0 ;;
        -*) die "Unknown option: $1 (run with --help)" ;;
        *) SOURCE="$1"; shift ;;
    esac
done

[ -f "$CONFIG_FILE" ] && . "$CONFIG_FILE"

# --- Bitrise API -------------------------------------------------------------

require_api_access() {
    command -v curl >/dev/null 2>&1 || die "curl not found."
    command -v jq >/dev/null 2>&1 || die "jq not found. Install it (sudo apt install jq)."
    if [ -z "${BITRISE_API_TOKEN:-}" ]; then
        cat >&2 <<EOF
Error: BITRISE_API_TOKEN is not set.

Create a personal access token at https://app.bitrise.io/me/profile#/security
and save it with:

  mkdir -p "$CONFIG_DIR"
  echo 'BITRISE_API_TOKEN=<your token>' >> "$CONFIG_FILE"
  chmod 600 "$CONFIG_FILE"
EOF
        exit 1
    fi
}

bitrise_api() {
    curl -fsS -H "Authorization: ${BITRISE_API_TOKEN}" "${BITRISE_API}$1"
}

resolve_app_slug() {
    if [ -n "${BITRISE_APP_SLUG:-}" ]; then
        echo "$BITRISE_APP_SLUG"
        return
    fi
    local slug
    slug="$(bitrise_api "/me/apps?limit=50" \
        | jq -r --arg repo "$REPO_NAME" \
            'first(.data[] | select(.repo_slug == $repo or .title == $repo) | .slug) // empty')"
    [ -n "$slug" ] || die "Could not find the ${REPO_NAME} app on Bitrise. Set BITRISE_APP_SLUG in ${CONFIG_FILE}."
    mkdir -p "$CONFIG_DIR"
    echo "BITRISE_APP_SLUG=${slug}" >> "$CONFIG_FILE"
    log "Cached Bitrise app slug in ${CONFIG_FILE}."
    echo "$slug"
}

# Recent builds, newest first, as compact JSON.
fetch_builds() {
    bitrise_api "/apps/${APP_SLUG}/builds?limit=50&sort_by=created_at"
}

list_builds() {
    fetch_builds | jq -r '
        .data[]
        | select(.status == 1)
        | [ "build " + (.build_number | tostring),
            (if .pull_request_id != null and .pull_request_id > 0
             then "PR #" + (.pull_request_id | tostring) else .branch end),
            (.finished_at // .triggered_at | .[0:16] | sub("T"; " ")),
            (.commit_message // "" | split("\n")[0] | .[0:60])
          ] | @tsv'
}

# Prints the build slug and build number of the build we should install.
select_build() {
    local filter
    if [ -n "$PR_NUMBER" ]; then
        filter=".pull_request_id == ${PR_NUMBER}"
    elif [ -n "$BUILD_NUMBER" ]; then
        filter=".build_number == ${BUILD_NUMBER}"
    elif [ -n "$BRANCH" ]; then
        filter=".branch == \"${BRANCH}\""
    else
        filter="true"
    fi
    # status 1 is "successful"; builds come back newest first.
    fetch_builds | jq -r "first(.data[] | select(${filter}) | select(.status == 1) | [.slug, .build_number] | @tsv) // empty"
}

# Prints the download URL of the APK artifact of a build.
apk_download_url() {
    local build_slug="$1" artifact_slug
    artifact_slug="$(bitrise_api "/apps/${APP_SLUG}/builds/${build_slug}/artifacts" \
        | jq -r 'first(.data[] | select(.title | endswith(".apk")) | .slug) // empty')"
    [ -n "$artifact_slug" ] || die "That build has no APK artifact (did it fail before the deploy step?)."
    bitrise_api "/apps/${APP_SLUG}/builds/${build_slug}/artifacts/${artifact_slug}" \
        | jq -r '.data.expiring_download_url'
}

# Prints the public install page URL of a build's APK, if the build published one.
public_install_page_url() {
    local build_slug="$1" artifact_slug
    artifact_slug="$(bitrise_api "/apps/${APP_SLUG}/builds/${build_slug}/artifacts" \
        | jq -r 'first(.data[] | select(.title | endswith(".apk")) | .slug) // empty')"
    [ -n "$artifact_slug" ] || return 1
    bitrise_api "/apps/${APP_SLUG}/builds/${build_slug}/artifacts/${artifact_slug}" \
        | jq -r '.data.public_install_page_url // empty'
}

download() {
    local url="$1" destination="$2"
    if [ -s "$destination" ]; then
        log "Using cached $(basename "$destination")."
        return
    fi
    mkdir -p "$(dirname "$destination")"
    log "Downloading $(basename "$destination")..."
    curl -fsSL --progress-bar -o "${destination}.part" "$url"
    mv "${destination}.part" "$destination"
}

# --- Devices -----------------------------------------------------------------

online_serials() {
    # One entry per physical device. The same device can be attached over more
    # than one transport at once (USB, and wireless on a fixed or a random
    # port), which would otherwise install on it several times. Devices are
    # identified by their hardware serial, and the fixed-port wireless transport
    # wins: it is the one that stays up when the cradle or the wireless
    # debugging toggle misbehaves.
    local serial hardware_serial rank
    for serial in $(adb devices | awk '$2 == "device" { print $1 }'); do
        hardware_serial="$(adb -s "$serial" shell getprop ro.serialno 2>/dev/null | tr -d '\r')"
        case "$serial" in
            *:5555) rank=0 ;;  # the fixed wireless port we set up
            *:*) rank=2 ;;     # wireless debugging on a random port
            *) rank=1 ;;       # USB
        esac
        echo "${hardware_serial:-$serial}|${rank}|${serial}"
    done | sort -t'|' -k1,1 -k2,2n | awk -F'|' '!seen[$1]++ { print $3 }'
}

device_model() {
    local serial="$1" model
    model="$(adb -s "$serial" shell getprop ro.product.model 2>/dev/null | tr -d '\r' | tr '[:upper:]' '[:lower:]' | tr -cd 'a-z0-9._-')"
    echo "${model:-$serial}"
}

target_serials() {
    local serial name wanted matched
    if [ ${#DEVICES[@]} -eq 0 ]; then
        online_serials
        return
    fi
    for wanted in "${DEVICES[@]}"; do
        matched=false
        for serial in $(online_serials); do
            name="$(device_model "$serial")"
            if [ "$serial" = "$wanted" ] || [ "$name" = "$(echo "$wanted" | tr '[:upper:]' '[:lower:]')" ]; then
                echo "$serial"
                matched=true
            fi
        done
        [ "$matched" = true ] || warn "No connected device matches '${wanted}'."
    done
}

# Best effort read of the applicationId out of the APK, so that --reinstall
# uninstalls the right package (PR builds carry the .experimental suffix).
apk_package_name() {
    local apk="$1" aapt package
    aapt="$(command -v aapt2 || command -v aapt || true)"
    if [ -z "$aapt" ] && [ -n "${ANDROID_HOME:-}" ]; then
        aapt="$(find "$ANDROID_HOME/build-tools" -maxdepth 2 -name aapt2 -o -maxdepth 2 -name aapt 2>/dev/null | sort | tail -1)"
    fi
    if [ -n "$aapt" ]; then
        package="$("$aapt" dump badging "$apk" 2>/dev/null | sed -n "s/^package: name='\([^']*\)'.*/\1/p")"
        [ -n "$package" ] && { echo "$package"; return; }
    fi
    # Fall back to reading strings out of the binary manifest.
    package="$(unzip -p "$apk" AndroidManifest.xml 2>/dev/null | tr -d '\000' \
        | grep -ao 'com\.openboxes\.android[a-z.]*' | sort -u | tail -1)"
    echo "$package"
}

install_on_device() {
    local serial="$1" apk="$2" name output package
    name="$(device_model "$serial")"
    log "Installing on ${name} (${serial})..."
    output="$(adb -s "$serial" install -r -d "$apk" 2>&1 || true)"

    if echo "$output" | grep -q 'Success'; then
        log "Installed on ${name}."
    elif echo "$output" | grep -qE 'INSTALL_FAILED_UPDATE_INCOMPATIBLE|INSTALL_FAILED_VERSION_DOWNGRADE|signatures do not match'; then
        package="$(apk_package_name "$apk")"
        if [ "$REINSTALL" = true ] && [ -n "$package" ]; then
            log "Existing ${package} conflicts; uninstalling it from ${name} first..."
            adb -s "$serial" uninstall "$package" >/dev/null 2>&1 || true
            output="$(adb -s "$serial" install "$apk" 2>&1 || true)"
            if echo "$output" | grep -q 'Success'; then
                log "Installed on ${name}."
            else
                warn "Install failed on ${name}: ${output}"
                return 1
            fi
        else
            warn "Install failed on ${name}: ${output}"
            warn "Re-run with --reinstall to uninstall ${package:-the existing app} first."
            return 1
        fi
    else
        warn "Install failed on ${name}: ${output}"
        return 1
    fi

    if [ "$LAUNCH" = true ]; then
        package="${package:-$(apk_package_name "$apk")}"
        if [ -n "$package" ]; then
            adb -s "$serial" shell monkey -p "$package" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1 || true
            log "Launched ${package} on ${name}."
        fi
    fi
}

# --- Main --------------------------------------------------------------------

if [ "$LIST_BUILDS" = true ]; then
    require_api_access
    APP_SLUG="$(resolve_app_slug)"
    list_builds
    exit 0
fi

APK_PATH=""
INSTALL_PAGE_URL=""

if [ -n "$SOURCE" ] && [ -z "$PR_NUMBER$BUILD_NUMBER$BRANCH" ]; then
    case "$SOURCE" in
        http://*|https://*)
            APK_PATH="${CACHE_DIR}/$(basename "${SOURCE%%\?*}")"
            download "$SOURCE" "$APK_PATH"
            ;;
        *)
            [ -f "$SOURCE" ] || die "No such file: ${SOURCE}"
            APK_PATH="$SOURCE"
            ;;
    esac
else
    require_api_access
    APP_SLUG="$(resolve_app_slug)"

    build="$(select_build)"
    if [ -z "$build" ]; then
        if [ -n "$PR_NUMBER" ]; then
            die "No successful build found for PR #${PR_NUMBER}. Run with --list to see recent builds."
        fi
        die "No successful build found. Run with --list to see recent builds."
    fi
    build_slug="$(echo "$build" | cut -f1)"
    build_number="$(echo "$build" | cut -f2)"
    log "Using Bitrise build ${build_number}."

    if [ "$OPEN_ON_DEVICE" = true ]; then
        INSTALL_PAGE_URL="$(public_install_page_url "$build_slug" || true)"
        [ -n "$INSTALL_PAGE_URL" ] || die "That build has no public install page. Enable it in the Bitrise deploy step, or drop --open-on-device."
    else
        APK_PATH="${CACHE_DIR}/openboxes_test_b${build_number}.apk"
        download "$(apk_download_url "$build_slug")" "$APK_PATH"
    fi
fi

if [ "$DOWNLOAD_ONLY" = true ]; then
    echo "$APK_PATH"
    exit 0
fi

command -v adb >/dev/null 2>&1 || die "adb not found. Install the Android platform-tools (sudo apt install adb)."
adb start-server >/dev/null 2>&1 || true

if [ "$AUTO_CONNECT" = true ] && [ -z "$(online_serials)" ]; then
    "${SCRIPT_DIR}/adb-connect.sh" || true
fi

serials="$(target_serials)"
if [ -z "$serials" ]; then
    die "No devices connected. Run scripts/adb-connect.sh, or plug a device in over USB."
fi

if [ -n "$INSTALL_PAGE_URL" ]; then
    for serial in $serials; do
        adb -s "$serial" shell am start -a android.intent.action.VIEW -d "$INSTALL_PAGE_URL" >/dev/null 2>&1 || true
        log "Opened the install page on $(device_model "$serial"). Tap the download, then open it from the notification."
    done
    exit 0
fi

failures=0
for serial in $serials; do
    install_on_device "$serial" "$APK_PATH" || failures=$((failures + 1))
done
exit $((failures > 0 ? 1 : 0))
