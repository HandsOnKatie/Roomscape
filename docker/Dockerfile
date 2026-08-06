# Roomscape Conductor container — v1.0 (public)
#
# The container is just a Node runtime + the two optional npm packages that
# need Linux builds. At startup it copies conductor.js from the mounted repo
# into /app and runs it there, so:
#   - require('sharp') resolves THIS image's Linux node_modules (any
#     node_modules in the mounted repo is ignored)
#   - edits to conductor.js on the host take effect on a simple
#     `docker restart roomscape` — no rebuild needed
#   - all content (frame pages, app, profiles, media, themes, data) lives in
#     the mounted repo via APP_DIR=/app/web
#   - conductor.js also require()s conductor-lib/*.js from the mount; those
#     modules use node builtins only, so the host's node_modules can never
#     shadow this image's Linux ones.
FROM node:22-bookworm-slim

WORKDIR /app

# sharp = fast picker thumbnails; mqtt = optional Home Assistant MQTT bridge
RUN npm install sharp mqtt && npm cache clean --force

ENV PORT=8090 \
    APP_DIR=/app/web

EXPOSE 8090

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://localhost:8090/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["sh", "-c", "cp /app/web/conductor.js /app/conductor.js && exec node /app/conductor.js"]
