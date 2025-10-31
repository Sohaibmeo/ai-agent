import Fastify from "fastify";
import { graph } from "./graph";

const app = Fastify();
app.post("/analyze", async (req: any, rep) => {
  const { csv, goal } = req.body || {};
  const out = await graph.invoke({ csv, goal });
  return rep.send({ categorized: out.categorized, insights: out.insights, advice: out.advice });
});

app.listen({ port: 3000 });
console.log("API on http://localhost:3000/analyze");
