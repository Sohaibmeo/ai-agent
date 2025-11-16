import { Router } from "express";
import { prisma } from "../lib/prisma.js";

export const healthRouter = Router();

healthRouter.get("/", async (_req, res) => {
  const userCount = await prisma.userProfile.count();
  res.json({
    status: "ok",
    users: userCount,
  });
});
