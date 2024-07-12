"use client";
import type { CustomNodeData, Models } from "@/types";
import ReactFlow, {
  Background,
  Edge,
  Handle,
  Node,
  useEdgesState,
  useNodesState,
} from "reactflow";
import "reactflow/dist/style.css";
import { ScrollArea } from "./ui/scroll-area";
import { getNodesAndEdges } from "@/lib/getNodesPosition";
import { useEffect, useMemo } from "react";

export function Flow({ models }: { models: Models }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges] = useEdgesState([]);

  useEffect(() => {
    // replace this with some kind of action in future
    const { edges, nodes } = getNodesAndEdges(models, "User");

    setNodes(nodes);
    setEdges(edges);
  }, [models]);

  const nodeTypes = useMemo(() => ({ customNode: CustomNode }), []);

  return (
    <ReactFlow
      fitView
      nodeTypes={nodeTypes}
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      className=" w-full h-full"
      minZoom={0.05}
    >
      <Background className=" bg-black text-white" />
    </ReactFlow>
  );
}

export function CustomNode({ data }: { data: CustomNodeData }) {
  return (
    <>
      <ScrollArea className=" max-h-80 min-w-80 border-black border-2 bg-gray-300  p-2 text-black overflow-auto">
        <div className="nowheel">
          <p className=" text-xl font-bold text-center">{data.name}</p>

          <div className=" flex flex-col gap-2">
            {Object.values(data.fields)
              .sort(
                (a, b) =>
                  Object.keys(b.handle).length - Object.keys(a.handle).length
              )
              .map((field) => (
                <div className=" relative" key={field.name}>
                  <p className=" p-2">{field.name}</p>
                  {field.handle.sourceLeft && (
                    <Handle
                      type="source"
                      position={field.handle.sourceLeft.position}
                      id={field.handle.sourceLeft.id}
                    />
                  )}
                  {field.handle.sourceRight && (
                    <Handle
                      type="source"
                      position={field.handle.sourceRight.position}
                      id={field.handle.sourceRight.id}
                    />
                  )}
                  {field.handle.target && (
                    <Handle
                      type="target"
                      position={field.handle.target.position}
                      id={field.handle.target.id}
                    />
                  )}
                </div>
              ))}
          </div>
        </div>
      </ScrollArea>
    </>
  );
}


