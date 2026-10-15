#!/usr/bin/env bash
set -euo pipefail

VERSION="1.0"
SCRIPT_NAME="$(basename "$0")"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

BACKUPS_ROOT="$SCRIPT_DIR/backups"
BACKUP_DIR=""
YES_MODE="false"


show_help() {
    cat <<EOF
Docker Restore für Linux
========================

Beschreibung:
  Dieses Skript stellt Docker-Volumes aus einer vorhandenen Sicherung wieder her.

Optionen:

  -d, --backup-dir <Pfad>
      Verwendet das angegebene Backup-Verzeichnis.

      Ohne Angabe erscheint eine Auswahlliste aller Backups.

  -y, --yes
      Überspringt die Sicherheitsabfrage.

  -h, --help
      Zeigt diese Hilfe an.

Beispiele:

  ./$SCRIPT_NAME

  ./$SCRIPT_NAME --backup-dir ./backups/backup_2026-06-12_18-00-00

  ./$SCRIPT_NAME --yes
EOF
}


show_intro() {
    cat <<EOF

Docker Volume Restore
=====================

Dieses Skript stellt Docker-Volumes aus einer vorhandenen Sicherung wieder her.

Ablauf:
  1. Auswahl eines Backup-Verzeichnisses
  2. Prüfung der enthaltenen Volume-Archive (*.tar.gz)
  3. Anlegen fehlender Docker-Volumes
  4. Wiederherstellung der Daten in die Volumes

Aufrufparameter:

  -d, --backup-dir <Pfad>
      Verwendet das angegebene Backup.

      Wird kein Wert angegeben,
      erscheint eine Auswahlliste aller Backups.

      Standard:
      Neueste Sicherung aus ./backups

  -y, --yes
      Überspringt die Sicherheitsabfrage.

  -h, --help
      Zeigt die integrierte Hilfe an.

Hinweise:

  - Bestehende Daten in den Volumes können überschrieben werden.
  - Docker muss installiert und gestartet sein.
  - Die Wiederherstellung betrifft nur Docker-Volumes.
  - Container werden nicht automatisch gestartet.

EOF
}


error_exit() {
    echo "[ERROR] $1" >&2
    exit 1
}


require_command() {
    command -v "$1" >/dev/null 2>&1 ||
        error_exit "Benötigtes Kommando nicht gefunden: $1"
}


parse_args() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            -d|--backup-dir)
                [[ $# -ge 2 ]] ||
                    error_exit "Für $1 muss ein Verzeichnis angegeben werden."

                BACKUP_DIR="$2"
                shift 2
                ;;

            -y|--yes)
                YES_MODE="true"
                shift
                ;;

            -h|--help|-\?)
                show_help
                exit 0
                ;;

            *)
                error_exit "Unbekannter Parameter: $1"
                ;;
        esac
    done
}


select_backup() {
    [[ -d "$BACKUPS_ROOT" ]] ||
        error_exit "Backup-Verzeichnis nicht gefunden: $BACKUPS_ROOT"

    mapfile -t backups < <(
        find "$BACKUPS_ROOT" \
            -mindepth 1 \
            -maxdepth 1 \
            -type d |
            sort -r
    )

    [[ ${#backups[@]} -gt 0 ]] ||
        error_exit "Keine Backups gefunden."

    echo "Verfügbare Backups:"
    echo

    for i in "${!backups[@]}"; do
        name="$(basename "${backups[$i]}")"

        if [[ "$i" -eq 0 ]]; then
            echo "[$((i + 1))] $name   <-- Standard"
        else
            echo "[$((i + 1))] $name"
        fi
    done

    echo

    read -r -p "Nummer auswählen oder ENTER für [1]: " choice

    if [[ -z "${choice:-}" ]]; then
        BACKUP_DIR="${backups[0]}"
        return
    fi

    if [[ "$choice" =~ ^[0-9]+$ ]] &&
        ((choice >= 1 && choice <= ${#backups[@]})); then

        BACKUP_DIR="${backups[$((choice - 1))]}"
    else
        error_exit "Ungültige Auswahl."
    fi
}


normalize_backup_dir() {
    [[ -d "$BACKUP_DIR" ]] ||
        error_exit "Backup-Verzeichnis nicht gefunden: $BACKUP_DIR"

    BACKUP_DIR="$(cd "$BACKUP_DIR" && pwd -P)"
}


confirm_restore() {
    [[ "$YES_MODE" == "true" ]] && return

    echo
    echo "ACHTUNG:"
    echo "Die Daten in vorhandenen Docker-Volumes können überschrieben werden."
    echo

    read -r -p "Fortfahren? [J/N] " answer

    case "$answer" in
        J|j|Y|y|Ja|ja|YES|yes)
            ;;
        *)
            echo "Abgebrochen."
            exit 0
            ;;
    esac
}


check_requirements() {
    require_command docker
    require_command tar
    require_command find

    docker info >/dev/null 2>&1 ||
        error_exit "Docker ist nicht erreichbar."
}


restore_volumes() {
    mapfile -t archives < <(
        find "$BACKUP_DIR" \
            -type f \
            -name "*.tar.gz" |
            sort
    )

    [[ ${#archives[@]} -gt 0 ]] ||
        error_exit "Keine Volume-Archive (*.tar.gz) gefunden."

    echo
    echo "Verwende Backup:"
    echo "  $BACKUP_DIR"
    echo

    for archive in "${archives[@]}"; do
        filename="$(basename "$archive")"

        # Pfad des Archivs relativ zum eingebundenen Backup-Verzeichnis.
        relative_archive="${archive#"$BACKUP_DIR"/}"

        # Der Archivname ohne .tar.gz entspricht dem Docker-Volume.
        volume="${filename%.tar.gz}"

        echo "[INFO] Restore Volume: $volume"
        echo "[INFO] Archiv: $relative_archive"

        if ! docker volume inspect "$volume" >/dev/null 2>&1; then
            echo "[INFO] Erstelle Volume: $volume"
            docker volume create "$volume" >/dev/null
        fi

        docker run --rm \
            --mount "type=volume,source=$volume,target=/volume" \
            --mount "type=bind,source=$BACKUP_DIR,target=/backup,readonly" \
            alpine \
            sh -c '
                set -eu
                cd /volume
                tar -xzf "/backup/$1"
            ' sh "$relative_archive"

        echo "[OK]   Volume wiederhergestellt: $volume"
    done
}


main() {
    parse_args "$@"
    show_intro
    check_requirements

    if [[ -z "$BACKUP_DIR" ]]; then
        select_backup
    fi

    normalize_backup_dir
    confirm_restore
    restore_volumes

    echo
    echo "[OK] Restore abgeschlossen."
}


main "$@"
