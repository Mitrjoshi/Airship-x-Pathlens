FROM public.ecr.aws/lambda/nodejs:22 AS build

WORKDIR /workspace

RUN corepack enable

# Workspace configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy worker + required workspace packages BEFORE install
COPY apps/pathlens-snapshot-worker ./apps/pathlens-snapshot-worker
COPY packages/contracts ./packages/contracts
COPY packages/backend-types ./packages/backend-types

# Install after everything has been copied
RUN pnpm install --frozen-lockfile

# Verify Chromium is resolvable
RUN pnpm --filter @pathlens/snapshot-worker exec node -p "require.resolve('@sparticuz/chromium')"

# Build worker
RUN pnpm --filter @pathlens/snapshot-worker build

# Create production deployment
RUN pnpm --filter @pathlens/snapshot-worker deploy --prod --legacy /out


FROM public.ecr.aws/lambda/nodejs:22

COPY --from=build /out/node_modules \
    ${LAMBDA_TASK_ROOT}/node_modules

COPY --from=build /workspace/apps/pathlens-snapshot-worker/dist \
    ${LAMBDA_TASK_ROOT}/dist

CMD ["dist/handler.handler"]