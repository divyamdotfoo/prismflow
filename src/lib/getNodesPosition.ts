import { ModelData, Relation } from "@/types";
import * as d3 from "d3";
interface ModelNode {
  id: string;
  position: {
    x: number;
    y: number;
  };
  modelData: ModelData;
  data: {
    label: string;
  };
}

export const getNodesPosition = (relations: Relation[]) => {
  const modelNames = Array.from(
    new Set(relations.map((r) => r.between).flat(2))
  );
  const modelIndex = new Map(modelNames.map((modelName, i) => [modelName, i]));

  const nodes: d3.SimulationNodeDatum[] = modelNames.map((m) => ({ id: m }));

  const links: d3.SimulationLinkDatum<d3.SimulationNodeDatum>[] = relations.map(
    (relation) => ({
      source: nodes[modelIndex.get(relation.from.modelName)!],
      target: nodes[modelIndex.get(relation.to.modelName)!],
    })
  );

  // creating simulation
  const width = 1200;
  const height = 400;
  const simulation = d3
    .forceSimulation(nodes)
    .force("link", d3.forceLink(links).distance(100))
    .force("charge", d3.forceManyBody().strength(-500))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .stop();

  // running simulation
  for (let i = 0; i < 300; ++i) simulation.tick();

  return nodes.map((node) => ({
    id: node.id as string,
    position: {
      x: node.x!,
      y: node.y!,
    },
    data: {
      label: node.id as string,
    },
  }));
};
