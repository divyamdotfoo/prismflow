"use client";

import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  useEdgesState,
  useNodesState,
} from "reactflow";

export function MyFlow({ nodes, edges }) {
  return (
    <div className=" w-screen h-screen bg-black text-white">
      <ReactFlow nodes={nodes} edges={edges} fitView></ReactFlow>
    </div>
  );
}
