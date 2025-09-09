# Build arguments
ARG SOURCE_CODE=.
ARG BASE_IMAGE="registry.access.redhat.com/ubi9/nodejs-20:latest"

FROM ${BASE_IMAGE} as builder

WORKDIR /usr/src/app
COPY --chown=default:root ${SOURCE_CODE} /usr/src/app
USER default

# Environment setup
ENV NODE_OPTIONS="--max-old-space-size=4096"
ENV TURBO_TELEMETRY_DISABLED=1
ENV NPM_CONFIG_FUND=false
ENV NPM_CONFIG_AUDIT=false

# Install dependencies (needed for backend build and runtime)
RUN npm cache clean --force
RUN npm ci --omit=optional --ignore-scripts --no-fund --no-audit

# Build backend only
RUN cd backend && npm run build

# Verify both frontend and backend assets
RUN echo "=== Verifying Pre-built Frontend Assets ===" && \
    ls -la frontend/public/ && \
    ls -la frontend/public/index.html && \
    find frontend/public/ -name "*.js" | head -3 && \
    echo "Frontend assets verified"

RUN echo "=== Verifying Backend Build ===" && \
    ls -la backend/dist/server.js && \
    echo "Backend build verified"

# Don't prune dev dependencies yet - we need them for runtime

FROM ${BASE_IMAGE} as runtime

WORKDIR /usr/src/app
RUN mkdir /usr/src/app/logs && chmod 775 /usr/src/app/logs
USER 1001:0

# Copy all necessary files (including all node_modules to avoid missing deps)
COPY --chown=default:root --from=builder /usr/src/app/frontend/public /usr/src/app/frontend/public
COPY --chown=default:root --from=builder /usr/src/app/backend/dist /usr/src/app/backend/dist
COPY --chown=default:root --from=builder /usr/src/app/backend/package.json /usr/src/app/backend/package.json
COPY --chown=default:root --from=builder /usr/src/app/backend/node_modules /usr/src/app/backend/node_modules
COPY --chown=default:root --from=builder /usr/src/app/package.json /usr/src/app/package.json
COPY --chown=default:root --from=builder /usr/src/app/node_modules /usr/src/app/node_modules
COPY --chown=default:root --from=builder /usr/src/app/.npmrc /usr/src/app/.npmrc
COPY --chown=default:root --from=builder /usr/src/app/.env /usr/src/app/.env
COPY --chown=default:root --from=builder /usr/src/app/data /usr/src/app/data

WORKDIR /usr/src/app/backend
CMD ["npm", "run", "start"]

LABEL io.opendatahub.component="odh-dashboard" \
      io.k8s.display-name="odh-dashboard" \
      name="open-data-hub/odh-dashboard-ubi9" \
      summary="odh-dashboard" \
      description="Open Data Hub Dashboard"
