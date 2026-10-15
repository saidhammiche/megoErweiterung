#!/usr/bin/env bash
set -euo pipefail

VERSION="1.0"
SCRIPT_NAME="$(basename "$0")"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

PROJECT_DIR="$SCRIPT_DIR"
BACKUP_ROOT="$SCRIPT_DIR/backups"
YES_MODE="false"

show_help() {
cat <<EOF
Docker Backup für Linux
=======================

Version:
  $VERSION

Beschreibung:
  Dieses Skript erstellt eine Sicherung eines Docker-Projekts.

  Gesichert werden:
    - Projektdateien aus dem Projektverzeichnis
    - alle vorhandenen Docker-Volumes als komprimierte *.tar.gz-Archive

Aufruf:
  ./$SCRIPT_NAME [Optionen]

Optionen:
  -b, --backup-root <Pfad>
      Zielverzeichnis für die Backups.

      Standard:
      ./backups relativ zum Skriptverzeichnis

      Beispiel:
      ./$SCRIPT_NAME --backup-root /srv/docker-backups

  -p, --project-dir <Pfad>
      Verzeichnis des Docker-Projekts.

      Standard:
      Verzeichnis, in dem dieses Skript liegt

      Beispiel:
      ./$SCRIPT_NAME --project-dir /opt/docker/mrs

  -y, --yes
      Startet das Backup ohne Sicherheitsabfrage.
      Sinnvoll für Cronjobs oder automatische Abläufe.

  -h, --help
      Zeigt diese Hilfe an.

Beispiele:
  ./$SCRIPT_NAME

  ./$SCRIPT_NAME --backup-root /srv/docker-backups

  ./$SCRIPT_NAME --project-dir /opt/docker/mrs

  ./$SCRIPT_NAME --backup-root /srv/docker-backups --project-dir /opt/docker/mrs

Hinweise:
  - Docker muss installiert und gestartet sein.
  - Der Benutzer muss Docker verwenden dürfen.
  - Container werden nicht automatisch gestoppt.
  - Für konsistente Datenbank-Backups sollten schreibende Container vorher gestoppt werden.
  - Der Backup-Ordner selbst wird beim Kopieren der Projektdateien ausgeschlossen.
EOF
}

show_intro() {
cat <<EOF

Docker Backup
=============

Dieses Skript erstellt eine Sicherung eines Docker-Projekts.

Ablauf:
  1. Anlegen eines neuen Backup-Verzeichnisses mit Zeitstempel
  2. Kopieren der Projektdateien
  3. Sichern aller Docker-Volumes
  4. Erstellen komprimierter Archivdateien (*.tar.gz)

Aufrufparameter:

  -b, --backup-root <Pfad>
      Zielverzeichnis für die Backups.

      Standard:
      ./backups relativ zum Skriptverzeichnis

      Beispiel:
      ./$SCRIPT_NAME --backup-root /srv/docker-backups

  -p, --project-dir <Pfad>
      Verzeichnis des Docker-Projekts.

      Standard:
      Verzeichnis des Skripts

      Beispiel:
      ./$SCRIPT_NAME --project-dir /opt/docker/mrs

  -y, --yes
      Startet ohne Sicherheitsabfrage.

  -h, --help
      Zeigt die integrierte Hilfe an.

Verwendete Werte:

  Projektverzeichnis : $PROJECT_DIR
  Backup-Basisordner : $BACKUP_ROOT

Hinweise:

  - Docker muss installiert und gestartet sein.
  - Der Benutzer muss Docker verwenden dürfen.
  - Das Backup betrifft Projektdateien und Docker-Volumes.
  - Container werden nicht automatisch gestoppt.
  - Für konsistente Datenbank-Backups sollten schreibende Container vorher gestoppt werden.
  - Der Backup-Ordner selbst wird beim Kopieren der Projektdateien ausgeschlossen.

EOF
}

error_exit() {
    echo "[ERROR] $1" >&2
    exit 1
}

require_command() {
    command -v "$1" >/dev/null 2>&1 || error_exit "Benötigtes Kommando nicht gefunden: $1"
}

parse_args() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            -b|--backup-root)
                [[ $# -ge 2 ]] || error_exit "Fehlender Wert für $1"
                BACKUP_ROOT="$2"
                shift 2
                ;;
            -p|--project-dir)
                [[ $# -ge 2 ]] || error_exit "Fehlender Wert für $1"
                PROJECT_DIR="$2"
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

make_absolute_paths() {
    mkdir -p "$BACKUP_ROOT"

    PROJECT_DIR="$(cd "$PROJECT_DIR" && pwd)"
    BACKUP_ROOT="$(cd "$BACKUP_ROOT" && pwd)"
}

check_requirements() {
    require_command docker
    require_command tar
    require_command rsync
    require_command date

    docker info >/dev/null 2>&1 || error_exit "Docker ist nicht erreichbar. Bitte Docker starten oder Berechtigungen prüfen."

    [[ -d "$PROJECT_DIR" ]] || error_exit "Projektverzeichnis nicht gefunden: $PROJECT_DIR"
    [[ -w "$BACKUP_ROOT" ]] || error_exit "Backup-Basisordner ist nicht beschreibbar: $BACKUP_ROOT"
}

confirm_start() {
    if [[ "$YES_MODE" == "true" ]]; then
        return
    fi

    read -r -p "Backup jetzt starten? [J/N] " answer

    case "$answer" in
        J|j|Y|y|Ja|ja|YES|yes)
            ;;
        *)
            echo "Abgebrochen."
            exit 0
            ;;
    esac
}

copy_project_files() {
    local target_dir="$1"

    echo "[INFO] Sichere Projektdateien ..."

    rsync -a \
        --exclude "$(basename "$BACKUP_ROOT")/" \
        "$PROJECT_DIR/" \
        "$target_dir/project/"
}

backup_volumes() {
    local target_dir="$1"
    local volume_count=0

    echo "[INFO] Sichere Docker-Volumes ..."

    mkdir -p "$target_dir/volumes"

    while IFS= read -r volume; do
        [[ -n "$volume" ]] || continue
        volume_count=$((volume_count + 1))

        echo "[INFO] Volume: $volume"

        docker run --rm \
            --mount "type=volume,source=$volume,target=/volume,readonly" \
            --mount "type=bind,source=$target_dir/volumes,target=/backup" \
            alpine tar -czf "/backup/$volume.tar.gz" -C /volume .

        echo "[OK]   Volume gesichert: $volume"
    done < <(docker volume ls -q)

    if [[ "$volume_count" -eq 0 ]]; then
        echo "[WARN] Keine Docker-Volumes gefunden."
    fi
}

write_manifest() {
    local target_dir="$1"

    cat > "$target_dir/backup-info.txt" <<EOF
Docker Backup
=============

Erstellt am:
  $(date '+%Y-%m-%d %H:%M:%S %Z')

Host:
  $(hostname)

Projektverzeichnis:
  $PROJECT_DIR

Backup-Verzeichnis:
  $target_dir

Docker-Version:
$(docker --version)

Docker-Volumes:
$(docker volume ls -q || true)
EOF
}

main() {
    parse_args "$@"
    make_absolute_paths
    show_intro
    confirm_start
    check_requirements

    local timestamp
    timestamp="$(date '+%Y-%m-%d_%H-%M-%S')"

    local backup_dir
    backup_dir="$BACKUP_ROOT/backup_$timestamp"

    mkdir -p "$backup_dir/project" "$backup_dir/volumes"

    echo
    echo "[INFO] Backup-Verzeichnis: $backup_dir"
    echo

    copy_project_files "$backup_dir"
    backup_volumes "$backup_dir"
    write_manifest "$backup_dir"

    echo
    echo "[OK] Backup abgeschlossen."
    echo "[OK] Speicherort: $backup_dir"
}

main "$@"
