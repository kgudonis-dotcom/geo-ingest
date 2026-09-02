#!/usr/bin/env bash
# Publicē vienu vai vairākas apakšmapes (piem. pagasti, infra, iadt) uz data zaru.
# Kopīgs publicētājs visām darbplūsmām (#43): katra skarta TIKAI savu apakšmapi ar parastu
# commit uz data zaru (ne orphan force-push pa visu koku), lai vienlaicīgas darbplūsmas
# nepārraksta cita citu. Ja push tiek noraidīts (kāds paspēja publicēt pa vidu), fetch +
# rebase + push mēģina vēlreiz līdz 3 reizēm. Tukšas apakšmapes drošinātājs: ja norādītajā
# apakšmapē nav neviena faila, publicēšana beidzas ar kļūdu, neko nepublicējot.
#
# Lietošana:
#   scripts/publish_data.sh <apakšmape> [<apakšmape> ...]
#   scripts/publish_data.sh --squash "ziņa" <apakšmape> [<apakšmape> ...]
#
# --squash: periodiska vēstures saīsināšana (piem. reizi ceturksnī pagasti darbā) — sāk
# data zaru no jauna (orphan) ar VISU pašreizējo data zara saturu plus norādīto apakšmapju
# jauno saturu, nevis pieaugošu commit vēsturi. Lieto reti, ne katrā publicēšanas reizē.
#
# Vide: jāstrādā git repo saknē, ar konfigurētu "origin" un tiesībām rakstīt (contents: write).
set -euo pipefail

SQUASH_MSG=""
DIRS=()
while [ $# -gt 0 ]; do
  case "$1" in
    --squash) SQUASH_MSG="$2"; shift 2 ;;
    *) DIRS+=("$1"); shift ;;
  esac
done
if [ ${#DIRS[@]} -eq 0 ]; then
  echo "::error::publish_data.sh: nav norādīta neviena apakšmape"
  exit 1
fi
for d in "${DIRS[@]}"; do
  if [ ! -d "$d" ] || [ -z "$(find "$d" -type f -print -quit)" ]; then
    echo "::error::publish_data.sh: apakšmape '$d' neeksistē vai ir tukša — publicēšana atcelta (tukšas apakšmapes drošinātājs)"
    exit 1
  fi
done

git config user.name bot
git config user.email b@l

WT="$(mktemp -d)"
trap 'git worktree remove --force "$WT" >/dev/null 2>&1 || true' EXIT

if git fetch origin data 2>/dev/null; then
  git worktree add --detach "$WT" origin/data >/dev/null
else
  echo "publish_data.sh: data zars vēl neeksistē, veido pirmo (orphan)"
  git worktree add --detach "$WT" >/dev/null
  (cd "$WT" && git checkout --orphan data && git rm -rf --cached . >/dev/null 2>&1 || true)
fi

sync_dirs() {
  for d in "${DIRS[@]}"; do
    rm -rf "${WT:?}/${d:?}"
    mkdir -p "$WT/$d"
    cp -a "$d/." "$WT/$d/"
  done
}
sync_dirs

if [ -n "$SQUASH_MSG" ]; then
  (cd "$WT" && git checkout --orphan data-squash && git add -A && git commit -q -m "$SQUASH_MSG (squash)")
  for i in 1 2 3; do
    if (cd "$WT" && git push -f origin data-squash:data); then
      echo "publish_data.sh: publicēts (squash, mēģinājums $i): ${DIRS[*]}"
      exit 0
    fi
    echo "publish_data.sh: squash push noraidīts, mēģinājums $i/3"
    sleep $((i * 5))
  done
  echo "::error::publish_data.sh: squash push neizdevās 3 mēģinājumos"
  exit 1
fi

(cd "$WT" && git add -A -- "${DIRS[@]}")
if (cd "$WT" && git diff --cached --quiet); then
  echo "publish_data.sh: nav izmaiņu apakšmapē(s) ${DIRS[*]}, publicēšana izlaista"
  exit 0
fi
(cd "$WT" && git commit -q -m "publish: ${DIRS[*]} $(date -u +%F)")

for i in 1 2 3; do
  if (cd "$WT" && git push origin HEAD:data); then
    echo "publish_data.sh: publicēts (mēģinājums $i): ${DIRS[*]}"
    exit 0
  fi
  echo "publish_data.sh: push noraidīts (kāds publicēja pa vidu), mēģinājums $i/3, fetch+rebase..."
  if ! (cd "$WT" && git fetch origin data && git rebase origin/data); then
    echo "::error::publish_data.sh: rebase neizdevās (iespējams, konflikts pašā apakšmapē)"
    (cd "$WT" && git rebase --abort >/dev/null 2>&1 || true)
    exit 1
  fi
  # rebase jau atkārtoti uzliek mūsu commit izmaiņas uz jauno pamatu; apakšmapes atkārtoti sinhronizēt nevajag.
  sleep $((i * 5))
done
echo "::error::publish_data.sh: push neizdevās pēc 3 mēģinājumiem"
exit 1
