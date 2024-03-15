import { v4 as uuidv4 } from "uuid";
import { Request, Response, NextFunction } from "express";

export function handleAsyncError(
  fn: (req: Request, res: Response, next: NextFunction) => void
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await fn(req, res, next);
    } catch (err) {
      console.log(err);
      if (err.statusCode) {
        res.status(err.statusCode).send(err.message);
      } else {
        res.status(500).send(err.message);
      }
    }
  };
}

export function logRequestsAndResponses(
  req: Request & { requestId: string },
  res: Response,
  next: NextFunction
) {
  if (req.originalUrl !== "/status") {
    req.requestId = uuidv4().slice(0, 8);
    const reqStartTime = Date.now();
    const datetime = new Date();

    console.log({
      reqId: req.requestId,
      datetime,
      method: req.method,
      url: req.originalUrl,
    });
    res.on("finish", () => {
      const reqEndTime = Date.now();
      const responseTime = reqEndTime - reqStartTime;
      console.log({
        reqId: req.requestId,
        responseTimeMs: responseTime,
        status: res.statusCode,
        message: res.statusMessage,
        "Content-Length": res.get("Content-Length"),
      });
    });
  }

  next();
}
