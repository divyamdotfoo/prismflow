import { getParsedModels } from "@/lib/getParsedModels";
import { getRelations } from "@/lib/getRelations";
import { ModelData, Relation } from "@/types";
import fs from "fs/promises";
import * as d3 from "d3";

async function main() {
  const schema = await fs.readFile("typehero.prisma", "utf-8");
  const models = getParsedModels(schema);
  const relations = getRelations(models);
  const nodes = getNodesPosition(relations);
}

main();

type MyNode = {
  id: string;
  x: number;
  y: number;
};
// sorting relation in decreasing order of most related model
// this helps in starting the graph from the model which has most number of relations
const getOrderedRelationsWithPriority = (relations: Relation[]) => {
  const modelNames = [
    ...Array.from(new Set(relations.map((r) => r.between).flat(2))),
  ] as const;
  const hashMap = new Map<(typeof modelNames)[number], number>();
  relations.forEach((r) => {
    if (!hashMap.has(r.between[0])) {
      hashMap.set(r.between[0], 1);
    } else {
      hashMap.set(r.between[0], (hashMap.get(r.between[0]) ?? 0) + 1);
    }

    if (!hashMap.has(r.between[1])) {
      hashMap.set(r.between[1], 1);
    } else {
      hashMap.set(r.between[1], (hashMap.get(r.between[1]) ?? 0) + 1);
    }
  });
  const sortedMap = new Map<(typeof modelNames)[number], number>(
    Array.from(hashMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map((entry, i) => [entry[0], i])
  );

  return relations
    .map((relation) => ({
      ...relation,
      priority: sortedMap.get(relation.from.modelName),
    }))
    .sort((a, b) => a.priority! - b.priority!);
};
