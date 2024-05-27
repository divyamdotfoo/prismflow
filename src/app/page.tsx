import { MyFlow } from "@/components/flow";
import { getNodesPosition } from "@/lib/getNodesPosition";
import { getParsedModels } from "@/lib/getParsedModels";
import { getRelations } from "@/lib/getRelations";
import fs from "fs/promises";
export default async function Page() {
  const schema = await fs.readFile("typehero.prisma", "utf-8");
  const models = getParsedModels(schema);
  const relations = getRelations(models);
  const nodes = getNodesPosition(relations);
  const edges = relations.map((r) => ({
    id: r.id,
    source: r.from.modelName,
    target: r.to.modelName,
  }));
  return <MyFlow nodes={nodes} edges={edges} />;
}
