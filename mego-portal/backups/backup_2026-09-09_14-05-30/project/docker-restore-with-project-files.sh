#!/usr/bin/env bash
set -euo pipefail

VERSION="1.1"
SCRIPT_NAME="$(basename "$0")"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

BACKUPS_ROOT="$SCRIPT_DIR/backups"
BACKUP_DIR=""
PROJECT_DIR="$SCRIPT_DIR"
RESTORE_PROJECT_FILES="ask"
YES_MODE="false"

show_help() {
cat <<EOF_HELP
Docker Restore fuer Linux
=========================

Beschreibung:
  Dieses Skript stellt Docker-Volumes aus einer vorhandenen Sicherung wieder her.
  Optional koennen auch die gesicherten Projektdateien und Verzeichnisse
  zurueckgesichert werden.

Optionen:

  -d, --backup-dir <Pfad>
      Verwendet das angegebene Backup-Verzeichnis.

      Ohne Angabe erscheint eine Auswahlliste aller Backups.

  -p, --project-dir <Pfad>
      Zielverzeichnis fuer die Ruecksicherung der Projektdateien.

      Standard:
      Verzeichnis, in dem dieses Skript liegt

  --restore-project-files
      Stellt Projektdateien ohne Rueckfrage wieder her.

  --no-restore-project-files
      Stellt keine Projektdateien wieder her.

  -y, --yes
      Ueberspringt Sicherheitsabfragen.
      Hinweis: Bei Projektdateien wird ohne weitere Rueckfrage nach PROJECT_DIR
      zurueckgesichert, wenn --restore-project-files gesetzt ist.

  -h, --help
      Zeigt diese Hilfe an.

Beispiele:

  ./$SCRIPT_NAME

  ./$SCRIPT_NAME --backup-dir ./backups/backup_2026-06-12_18-00-00

  ./$SCRIPT_NAME --project-dir /opt/docker/mrs

  ./$SCRIPT_NAME --backup-dir ./backups/backup_2026-06-12_18-00-00 --restore-project-files

  ./$SCRIPT_NAME --yes --restore-project-files
EOF_HELP
}

show_intro() {
cat <<EOF_INTRO

Docker Restore
==============

Dieses Skript stellt Docker-Volumes aus einer vorhandenen Sicherung wieder her.
Optional koennen auch die gesicherten Projektdateien und Verzeichnisse
zurueckgesichert werden.

Ablauf:
  1. Auswahl eines Backup-Verzeichnisses
  2. Pruefung der enthaltenen Volume-Archive (*.tar.gz)
  3. Optionale Ruecksicherung der Projektdateien
  4. Anlegen fehlender Docker-Volumes
  5. Wiederherstellung der Daten in die Volumes

Verwendete Werte:

  Backup-Basisordner : $BACKUPS_ROOT
  Backup-Verzeichnis : ${BACKUP_DIR:-wird ausgewaehlt}
  Projekt-Zielordner : $PROJECT_DIR

Hinweise:

  - Bestehende Daten in den Volumes koennen ueberschrieben werden.
  - Bestehende Projektdateien im Zielverzeichnis koennen ueberschrieben werden.
  - Docker muss installiert und gestartet sein.
  - Container werden nicht automatisch gestartet.

EOF_INTRO
}

error_exit() {
    echo "[ERROR] $1" >&2
    exit 1
}

require_command() {
    command -v "$1" >/dev/null 2>&1 || error_exit "Benoetigtes Kommando nicht gefunden: $1"
}

parse_args() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            -d|--backup-dir)
                [[ $# -ge 2 ]] || error_exit "Fehlender Wert fuer $1"
                BACKUP_DIR="$2"
                shift 2
                ;;
            -p|--project-dir)
                [[ $# -ge 2 ]] || error_exit "Fehlender Wert fuer $1"
                PROJECT_DIR="$2"
                shift 2
                ;;
            --restore-project-files)
                RESTORE_PROJECT_FILES="true"
                shift
                ;;
            --no-restore-project-files)
                RESTORE_PROJECT_FILES="false"
                shift
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

make_absolute_paths() {
    PROJECT_DIR="$(mkdir -p "$PROJECT_DIR" && cd "$PROJECT_DIR" && pwd)"
    BACKUPS_ROOT="$(cd "$BACKUPS_ROOT" 2>/dev/null && pwd || echo "$BACKUPS_ROOT")"

    if [[ -n "$BACKUP_DIR" ]]; then
        [[ -d "$BACKUP_DIR" ]] || error_exit "Backup-Verzeichnis nicht gefunden: $BACKUP_DIR"
        BACKUP_DIR="$(cd "$BACKUP_DIR" && pwd)"
    fi
}

select_backup() {
    [[ -d "$BACKUPS_ROOT" ]] || error_exit "Backup-Verzeichnis nicht gefunden: $BACKUPS_ROOT"

    mapfile -t backups < <(find "$BACKUPS_ROOT" -mindepth 1 -maxdepth 1 -type d | sort -r)

    [[ ${#backups[@]} -gt 0 ]] || error_exit "Keine Backups gefunden."

    echo "Verfuegbare Backups:"
    echo

    for i in "${!backups[@]}"; do
        name="$(basename "${backups[$i]}")"

        if [[ "$i" -eq 0 ]]; then
            echo "[$((i+1))] $name   <-- Standard"
        else
            echo "[$((i+1))] $name"
        fi
    done

    echo

    read -r -p "Nummer auswaehlen oder ENTER fuer [1]: " choice

    if [[ -z "${choice:-}" ]]; then
        BACKUP_DIR="${backups[0]}"
        return
    fi

    if [[ "$choice" =~ ^[0-9]+$ ]] && (( choice >= 1 && choice <= ${#backups[@]} )); then
        BACKUP_DIR="${backups[$((choice-1))]}"
    else
        error_exit "Ungueltige Auswahl."
    fi
}

confirm_restore() {
    [[ "$YES_MODE" == "true" ]] && return

    echo
    echo "ACHTUNG:"
    echo "Die Daten in vorhandenen Docker-Volumes koennen ueberschrieben werden."
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

    docker info >/dev/null 2>&1 || \
        error_exit "Docker ist nicht erreichbar."
}

validate_backup_dir() {
    [[ -n "$BACKUP_DIR" ]] || error_exit "Kein Backup-Verzeichnis ausgewaehlt."
    [[ -d "$BACKUP_DIR" ]] || error_exit "Backup-Verzeichnis nicht gefunden: $BACKUP_DIR"
}

ask_restore_project_files() {
    if [[ "$RESTORE_PROJECT_FILES" != "ask" ]]; then
        return
    fi

    echo

    if [[ ! -d "$BACKUP_DIR/project" ]]; then
        echo "[WARN] Im Backup wurden keine Projektdateien gefunden: $BACKUP_DIR/project"
        RESTORE_PROJECT_FILES="false"
        return
    fi

    read -r -p "Projektdateien und Verzeichnisse ebenfalls wiederherstellen? [J/N] " answer

    case "$answer" in
        J|j|Y|y|Ja|ja|YES|yes)
            RESTORE_PROJECT_FILES="true"
            read -r -p "Zielverzeichnis fuer Projektdateien [$PROJECT_DIR]: " input_project_dir
            if [[ -n "${input_project_dir:-}" ]]; then
                PROJECT_DIR="$input_project_dir"
            fi
            PROJECT_DIR="$(mkdir -p "$PROJECT_DIR" && cd "$PROJECT_DIR" && pwd)"
            ;;
        *)
            RESTORE_PROJECT_FILES="false"
            ;;
    esac
}

confirm_project_overwrite() {
    [[ "$RESTORE_PROJECT_FILES" == "true" ]] || return
    [[ -d "$BACKUP_DIR/project" ]] || error_exit "Keine Projektdateien im Backup gefunden: $BACKUP_DIR/project"

    if [[ "$YES_MODE" == "true" ]]; then
        return
    fi

    if [[ -n "$(find "$PROJECT_DIR" -mindepth 1 -maxdepth 1 -print -quit 2>/dev/null)" ]]; then
        echo
        echo "ACHTUNG:"
        echo "Das Zielverzeichnis fuer Projektdateien ist nicht leer:"
        echo "  $PROJECT_DIR"
        echo
        echo "Vorhandene Dateien koennen ueberschrieben werden."
        echo

        read -r -p "Projektdateien wirklich zuruecksichern? [J/N] " answer

        case "$answer" in
            J|j|Y|y|Ja|ja|YES|yes)
                ;;
            *)
                echo "Projektdateien werden nicht zurueckgesichert."
                RESTORE_PROJECT_FILES="false"
                ;;
        esac
    fi
}

restore_project_files() {
    [[ "$RESTORE_PROJECT_FILES" == "true" ]] || return

    require_command rsync

    echo
    echo "[INFO] Stelle Projektdateien wieder her ..."
    echo "[INFO] Quelle: $BACKUP_DIR/project/"
    echo "[INFO] Ziel:   $PROJECT_DIR/"

    rsync -a \
        "$BACKUP_DIR/project/" \
        "$PROJECT_DIR/"

    echo "[OK] Projektdateien wiederhergestellt."
}

restore_volumes() {
    mapfile -t archives < <(find "$BACKUP_DIR" -path "*/volumes/*.tar.gz" -type f | sort)

    if [[ ${#archives[@]} -eq 0 ]]; then
        mapfile -t archives < <(find "$BACKUP_DIR" -name "*.tar.gz" -type f | sort)
    fi

    [[ ${#archives[@]} -gt 0 ]] || \
        error_exit "Keine Volume-Archive (*.tar.gz) gefunden."

    echo
    echo "Verwende Backup:"
    echo "  $BACKUP_DIR"
    echo

    for archive in "${archives[@]}"; do
        filename="$(basename "$archive")"
        volume="${filename%.tar.gz}"
        archive_dir="$(dirname "$archive")"

        echo "[INFO] Restore Volume: $volume"

        if ! docker volume inspect "$volume" >/dev/null 2>&1; then
            echo "[INFO] Erstelle Volume: $volume"
            docker volume create "$volume" >/dev/null
        fi

        docker run --rm \
            --mount "type=volume,source=$volume,target=/volume" \
            --mount "type=bind,source=$archive_dir,target=/backup,readonly" \
            alpine sh -c "cd /volume && tar -xzf /backup/$filename"

        echo "[OK]   Volume wiederhergestellt: $volume"
    done
}

main() {
    parse_args "$@"
    make_absolute_paths
    show_intro
    check_requirements

    if [[ -z "$BACKUP_DIR" ]]; then
        select_backup
    fi

    validate_backup_dir
    confirm_restore
    ask_restore_project_files
    confirm_project_overwrite
    restore_project_files
    restore_volumes

    echo
    echo "[OK] Restore abgeschlossen."
}

main "$@"
