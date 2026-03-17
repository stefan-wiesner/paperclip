import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import type { Db } from "@paperclipai/db";
import { actorMiddleware } from "../middleware/auth.js";
import { errorHandler } from "../middleware/error-handler.js";

function makeFailing5xxDb(): Db {
  const thenable = {
    then(onFulfilled: unknown, onRejected: (err: Error) => unknown) {
      const err = new Error("db lookup exploded");
      if (typeof onRejected === "function") return onRejected(err);
      return Promise.reject(err);
    },
    catch(onRejected: (err: Error) => unknown) {
      return onRejected(new Error("db lookup exploded"));
    },
  };
  return {
    select() {
      return {
        from() {
          return {
            where() {
              return thenable;
            },
          };
        },
      };
    },
  } as unknown as Db;
}

describe("actorMiddleware", () => {
  it("attaches auth diagnostics when bearer key lookup throws", async () => {
    const app = express();
    let capturedErrorContext: Record<string, unknown> | null = null;

    app.use(actorMiddleware(makeFailing5xxDb(), { deploymentMode: "authenticated" }));
    app.get("/api/test", (_req, res) => {
      res.status(204).end();
    });
    app.use(
      (
        err: unknown,
        _req: express.Request,
        res: express.Response,
        next: express.NextFunction,
      ) => {
        capturedErrorContext = (res as unknown as Record<string, unknown>).__errorContext as Record<string, unknown>;
        next(err);
      },
    );
    app.use(errorHandler);

    const res = await request(app)
      .get("/api/test")
      .set("Authorization", "Bearer pcp_test_secret");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Internal server error" });
    expect(capturedErrorContext).toBeTruthy();

    const errorCtx = capturedErrorContext as { error?: { details?: Record<string, unknown> } } | null;
    const errorDetails = errorCtx?.error?.details;
    expect(errorDetails).toEqual(
      expect.objectContaining({
        authStage: "agent_key_lookup",
        authSource: "bearer",
        tokenHashPrefix: expect.stringMatching(/^[a-f0-9]{12}$/),
        runIdHeader: null,
      }),
    );
  });

  it("sets actor to local_trusted board for local_trusted deployment mode", async () => {
    const app = express();
    let capturedActor: unknown = null;

    app.use(actorMiddleware(makeFailing5xxDb(), { deploymentMode: "local_trusted" }));
    app.get("/api/test", (req, res) => {
      capturedActor = (req as any).actor;
      res.status(200).json({ ok: true });
    });

    const res = await request(app).get("/api/test");

    expect(res.status).toBe(200);
    expect(capturedActor).toEqual(
      expect.objectContaining({
        type: "board",
        userId: "local-board",
        isInstanceAdmin: true,
        source: "local_implicit",
      }),
    );
  });

  it("sets actor to none when no auth header and no session resolver", async () => {
    const app = express();
    let capturedActor: unknown = null;

    app.use(actorMiddleware(makeFailing5xxDb(), { deploymentMode: "authenticated" }));
    app.get("/api/test", (req, res) => {
      capturedActor = (req as any).actor;
      res.status(200).json({ ok: true });
    });

    const res = await request(app).get("/api/test");

    expect(res.status).toBe(200);
    expect(capturedActor).toEqual(
      expect.objectContaining({ type: "none", source: "none" }),
    );
  });
});
