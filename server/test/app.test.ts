import request from "supertest";
import { describe, expect, it } from "vitest";

import app from "../src/app.js";

describe("app", () => {
  it("responds with not found for unknown routes", () =>
    request(app)
      .get("/what-is-this-even")
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .expect(404));

  it("GET / returns the capability descriptor", async () => {
    const res = await request(app).get("/").expect(200);
    expect(res.body.capability).toBe("output-citation-verification");
    expect(res.body.schemaVersion).toBe("1.0");
  });

  it("GET /health is ok", async () => {
    const res = await request(app).get("/health").expect(200);
    expect(res.body.status).toBe("ok");
  });

  it("GET /api/schema exposes input/output JSON schema", async () => {
    const res = await request(app).get("/api/schema").expect(200);
    expect(res.body.input).toBeTypeOf("object");
    expect(res.body.output).toBeTypeOf("object");
  });

  it("POST /api/verify rejects an invalid body", () =>
    request(app).post("/api/verify").send({ content: "" }).expect(400));
});
