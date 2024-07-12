import { Flow } from "@/components/flow";
import { getParsedModels } from "@/lib/getParsedModels";
import { calculateRelations } from "@/lib/getRelations";
import fs from "fs/promises";
export default async function Page() {
  const blob = await fs.readFile("typehero.prisma", "utf-8");
  const models = getParsedModels(blob);
  calculateRelations(models);

  return (
    <div className=" w-screen h-screen">
      <Flow models={models} />
    </div>
  );
}
