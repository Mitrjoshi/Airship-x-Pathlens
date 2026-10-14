FROM public.ecr.aws/lambda/nodejs:22 AS build

WORKDIR /workspace

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/pathlens-api ./apps/pathlens-api
COPY packages/contracts ./packages/contracts
COPY packages/backend-types ./packages/backend-types

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @pathlens/api build
RUN pnpm --filter @pathlens/api deploy --prod --legacy /out

FROM public.ecr.aws/lambda/nodejs:22

COPY --from=build /out/node_modules ${LAMBDA_TASK_ROOT}/node_modules
COPY --from=build /workspace/apps/pathlens-api/dist ${LAMBDA_TASK_ROOT}/dist
COPY --from=build /workspace/apps/pathlens-api/package.json ${LAMBDA_TASK_ROOT}/package.json

CMD ["dist/index.handler"]
