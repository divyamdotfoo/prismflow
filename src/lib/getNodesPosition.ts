import { CustomEdge, CustomNode, Models } from "@/types";
import { nanoid } from "nanoid";
import { cosDeg, sinDeg } from "./utils";
import { Position, MarkerType } from "reactflow";

export const getNodesAndEdges = (
  models: Models,
  modelName: string
): { nodes: CustomNode[]; edges: CustomEdge[] } => {
  console.log(
    Object.values(models)
      .filter((v) => v.relations.size > 0)
      .map((v) => v.name)
  );
  const targetModel = models[modelName];
  if (!targetModel) throw new Error("invalid model name");

  console.log(targetModel.relations);
  const nodeHeight = 400;

  const nodes: CustomNode[] = [];
  const edges: CustomEdge[] = [];

  const relations = Array.from(targetModel.relations.entries());

  const totalRelations = targetModel.relatedTo.size;
  const baseRadius = 300 + 60 * totalRelations;
  const angleIncrement = Math.min(60, Math.floor(360 / totalRelations));

  for (let i = 0; i < relations.length; i++) {
    const relation = relations[i];
    const nodeId = relation[0];

    if (nodeId === modelName) continue;

    (() => {
      const angle = -60 + i * angleIncrement;

      const pos = angle > 120 ? "left" : "right";

      // random experiment
      const xOffset =
        (angle > -30 && angle < 60) || angle > 180
          ? 1.8
          : angle > 30 && angle < 90
          ? 4
          : angle > 90 && angle < 120
          ? -4
          : 1;
      const yOffset =
        angle > -30 && angle < 0
          ? 3
          : angle > 0 && angle < 30
          ? 0
          : angle > 30 && angle < 60
          ? 0.8
          : angle > 180
          ? 1.2
          : 1;

      const x =
        totalRelations > 6
          ? baseRadius * cosDeg(angle) * xOffset
          : baseRadius * cosDeg(angle);
      const y =
        totalRelations > 6
          ? baseRadius * sinDeg(angle) * yOffset
          : baseRadius * sinDeg(angle);

      relation[1].forEach((rel) => {
        const sourceField =
          models[rel.from.modelName].fields[rel.from.modelField];

        const sourceHandleId =
          pos === "right"
            ? sourceField.handle?.sourceRight
              ? sourceField.handle.sourceRight.id
              : nanoid(5)
            : sourceField.handle?.sourceLeft
            ? sourceField.handle.sourceLeft.id
            : nanoid(5);

        if (pos === "right" && !sourceField.handle.sourceRight) {
          sourceField.handle.sourceRight = {
            id: sourceHandleId,
            position: Position.Right,
          };
        }
        if (pos === "left" && !sourceField.handle.sourceLeft) {
          sourceField.handle.sourceLeft = {
            id: sourceHandleId,
            position: Position.Left,
          };
        }

        const targetField = models[rel.to.modelName].fields[rel.to.modelField];
        const targetHandleId = targetField.handle?.target?.id ?? nanoid(5);

        if (!targetField.handle.target) {
          targetField.handle.target = {
            id: targetHandleId,
            position: pos === "right" ? Position.Left : Position.Right,
          };
        }

        edges.push({
          id: nanoid(5),
          source: rel.from.modelName,
          target: rel.to.modelName,
          data: rel.type,
          sourceHandle: sourceHandleId,
          targetHandle: targetHandleId,
          markerEnd: MarkerType.Arrow,
        });
      });

      nodes.push({
        data: {
          name: nodeId,
          fields: models[nodeId].fields,
        },
        type: "customNode",
        id: nodeId,
        position: {
          x,
          y,
        },
      });
    })();
  }

  nodes.push({
    data: { name: targetModel.name, fields: targetModel.fields },
    id: targetModel.name,
    position: { x: 0, y: 0 },
    type: "customNode",
  });

  return { nodes, edges };
};
