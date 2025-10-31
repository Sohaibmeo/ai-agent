import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import anomalies from "./steps/anomalies";
import coach from "./steps/coach";
import insightsJoin from "./steps/insightJoins";
import nerCategorizer from "./steps/nerCategorizer";
import parser from "./steps/parser";
import reconcile from "./steps/reconcile";
import ruleMatcher from "./steps/ruleMatcher";
import subs from "./steps/subs";
import { CatRow, Insights, Row } from "./types";
import whatIf from "./steps/whatIf";

const Store = Annotation.Root({
  // Inputs
  csv: Annotation<string>(),
  goal: Annotation<number>(),
  timeWindowDays: Annotation<number>(),
  periodLabel: Annotation<string>(),

  // Working state
  rows: Annotation<Row[]>(),
  ruleCats: Annotation<CatRow[]>(),
  nerCats: Annotation<CatRow[]>(),
  categorized: Annotation<CatRow[]>(),
  subOut: Annotation<Insights["subscriptions"]>(),
  anomOut: Annotation<Insights["anomalies"]>(),
  whatIfOut: Annotation<Insights["whatIf"]>(),
  insights: Annotation<Insights>(),
  advice: Annotation<string>()
});

export const graph = new StateGraph(Store)
  .addNode("parser", parser)
  .addNode("ruleMatcher", ruleMatcher)
  .addNode("nerCategorizer", nerCategorizer)
  .addNode("reconcile", reconcile)
  .addNode("subs", subs)
  .addNode("anomalies", anomalies)
  .addNode("whatIf", whatIf)
  .addNode("insightsJoin", insightsJoin)
  .addNode("coach", coach)
  .addEdge(START, "parser")
  // Parallel: rules + NER
  .addEdge("parser", "ruleMatcher")
  .addEdge("parser", "nerCategorizer")
  .addEdge("ruleMatcher", "reconcile")
  .addEdge("nerCategorizer", "reconcile")
  // Parallel: insights fan-out
  .addEdge("reconcile", "subs")
  .addEdge("reconcile", "anomalies")
  .addEdge("reconcile", "whatIf")
  .addEdge("subs", "insightsJoin")
  .addEdge("anomalies", "insightsJoin")
  .addEdge("whatIf", "insightsJoin")
  .addEdge("insightsJoin", "coach")
  .addEdge("coach", END)
  .compile();
