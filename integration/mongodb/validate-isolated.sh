#!/usr/bin/env bash
# Opt-in: cria somente um Mongo descartável, sem porta publicada ou volume persistente.
set -euo pipefail
task_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
task_image="${MONGO_VALIDATION_IMAGE:-mongo:8.0}"
task_container="issueflow-validation-$(date +%s)-$$"
if ! command -v docker >/dev/null 2>&1 || ! docker info >/dev/null 2>&1; then
  echo 'BLOCKED: Docker indisponível. Nenhum banco foi iniciado ou validado.' >&2
  exit 2
fi
if ! docker image inspect "$task_image" >/dev/null 2>&1; then
  echo "BLOCKED: imagem $task_image não está disponível. Prepare a imagem explicitamente e execute novamente." >&2
  exit 2
fi
task_container_id=""
cleanup() {
  if [[ -n "$task_container_id" ]]; then docker rm -f "$task_container_id" >/dev/null 2>&1 || true; fi
}
trap cleanup EXIT INT TERM
task_container_id="$(docker run --detach --rm --name "$task_container" --network none \
  --tmpfs /data/db:rw,size=768m \
  --mount "type=bind,source=$task_root,target=/reference,readonly" \
  "$task_image" --replSet issueflow_validation --bind_ip 127.0.0.1)"
task_ready=false
for task_attempt in $(seq 1 40); do
  if docker exec "$task_container" mongosh --quiet --eval 'db.adminCommand({ping:1})' >/dev/null 2>&1; then task_ready=true; break; fi
  sleep 1
done
if [[ "$task_ready" != true ]]; then echo 'FAIL: Mongo descartável não iniciou.' >&2; exit 1; fi
docker exec "$task_container" mongosh --quiet --eval \
  'rs.initiate({_id:"issueflow_validation",members:[{_id:0,host:"127.0.0.1:27017"}]})' >/dev/null
task_ready=false
for task_attempt in $(seq 1 40); do
  if docker exec "$task_container" mongosh --quiet --eval 'if(!db.hello().isWritablePrimary)quit(1)' >/dev/null 2>&1; then task_ready=true; break; fi
  sleep 1
done
if [[ "$task_ready" != true ]]; then echo 'FAIL: replica set descartável não ficou pronto.' >&2; exit 1; fi
docker exec -e ISSUEFLOW_ISOLATED_VALIDATION=1 "$task_container" \
  mongosh --quiet --file /reference/mongodb/validate-isolated.mongosh.js
