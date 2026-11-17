FROM public.ecr.aws/lambda/nodejs@sha256:a5a2e1a8334f3adc93c93ec8ce064995309b37a0e0cca3d00c7798790465a912 AS build

WORKDIR /workspace

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/pathlens-heatmap-proxy ./apps/pathlens-heatmap-proxy
COPY packages/contracts ./packages/contracts

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @workspace/contracts build
RUN pnpm --filter @pathlens/heatmap-proxy build
RUN pnpm --filter @pathlens/heatmap-proxy deploy --prod --legacy /out

RUN test -f /out/node_modules/@workspace/contracts/dist/index.js
RUN test ! -f /out/node_modules/@workspace/contracts/src/index.ts
RUN node --input-type=module -e "import('./apps/pathlens-heatmap-proxy/dist/handler.js').then((module) => { if (typeof module.handler !== 'function') process.exit(1) })"

FROM public.ecr.aws/lambda/nodejs@sha256:a5a2e1a8334f3adc93c93ec8ce064995309b37a0e0cca3d00c7798790465a912

COPY --from=build /out/node_modules ${LAMBDA_TASK_ROOT}/node_modules
COPY --from=build /workspace/apps/pathlens-heatmap-proxy/dist ${LAMBDA_TASK_ROOT}/dist
COPY --from=build /workspace/apps/pathlens-heatmap-proxy/package.json ${LAMBDA_TASK_ROOT}/package.json

RUN node --input-type=module -e "import('/var/task/dist/handler.js').then((module) => { if (typeof module.handler !== 'function') process.exit(1) })"

CMD ["dist/handler.handler"]
