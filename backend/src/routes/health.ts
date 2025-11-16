import { Router } from "express";
import { pool } from "../lib/db.js";

export const healthRouter = Router();

healthRouter.get("/", async (_req, res) => {
  const result = await pool.query("SELECT COUNT(*) AS count FROM users");
  res.json({
    status: "ok",
    users: Number(result.rows[0]?.count ?? 0),
  });
});
