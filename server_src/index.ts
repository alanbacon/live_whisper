import path from "path";
import { fileURLToPath } from "url";
import busboy from "connect-busboy";
import fs from "fs";

import http from "http";
import express, { Request, Response } from "express";
import {
  handleAsyncError,
  logRequestsAndResponses,
} from "./expressHelpers/index.js";

import { getTranscript } from "./upload_to_whisper.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function createRouter() {
  const router = express.Router();

  router.post(
    "/recording",
    handleAsyncError(
      async (req: Request & { requestId: string }, res: Response) => {
        req.pipe(req.busboy);
        req.busboy.on(
          "file",
          async (_fieldname, fileStream, { filename, mimeType }) => {
            console.log(filename);
            console.log(mimeType);

            const textPreProcessed = await getTranscript(fileStream, {
              translate: true,
              responseFormat: "text",
            });
            const text = textPreProcessed.replaceAll("\n", " ").trim();
            res.status(201).send(text);
          }
        );
      }
    )
  );

  return router;
}

let listeningApp; // eslint-disable-line no-unused-vars
async function initServer(port: number): Promise<void> {
  const app = express();
  const server = http.createServer(app);

  app.use(logRequestsAndResponses);
  app.use(busboy());

  app.use("/", express.static(path.join(__dirname, "../www_src/")));

  const router = createRouter();
  app.use("/api/", router);

  await new Promise((resolve) => {
    listeningApp = server.listen(port, () => {
      resolve(null);
    });
  });
  console.log(`Service listening on port ${port}`);
}

initServer(5001).catch((err) => console.log(err));
