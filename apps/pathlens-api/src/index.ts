import serverless from "aws-serverless-express";
import app from "./app";

const server = serverless.createServer(app);

export const handler: any = (event, context) => {
  return new Promise((resolve, reject) => {
    serverless.proxy(server, event, {
      ...context,
      succeed: resolve,
      fail: reject,
    });
  });
};
