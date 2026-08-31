FROM public.ecr.aws/lambda/nodejs:22 AS build

WORKDIR /workspace
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/pathlens-snapshot-worker/package.json apps/pathlens-snapshot-worker/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/backend-types/package.json packages/backend-types/package.json
RUN pnpm install --frozen-lockfile

COPY apps/pathlens-snapshot-worker apps/pathlens-snapshot-worker
COPY packages/contracts packages/contracts
COPY packages/backend-types packages/backend-types
RUN pnpm --filter @pathlens/snapshot-worker build
RUN pnpm --filter @pathlens/snapshot-worker deploy --prod --legacy /out

FROM public.ecr.aws/lambda/nodejs:22

COPY --from=build /out/node_modules ${LAMBDA_TASK_ROOT}/node_modules
COPY --from=build /workspace/apps/pathlens-snapshot-worker/dist ${LAMBDA_TASK_ROOT}/dist

CMD ["dist/handler.handler"]
