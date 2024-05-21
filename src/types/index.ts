import {
  DefaultEdgeOptions,
  Edge,
  EdgeProps,
  Node,
  NodeProps,
} from "reactflow";

export interface SchemaAST {
  dbType: string;
  relationMode: string | undefined;
  models: {
    [key: string]: {
      name: string;
      blockAttributes: string[];
      fields: {
        [key: string]: FieldDefinition;
      };
    };
  };
  relations: Relations[];
}

export interface FieldDefinition {
  name: string;
  dType: string;
  optional: boolean;
  iterable: boolean;
  attributes: string[];
  isRelation: boolean;
  relation: {
    fields: string[];
    references: string[];
    map: string[];
    name: string;
    onUpdate: string[];
    onDelete: string[];
  };
}

export interface Relations {
  type:
    | "o-o"
    | "o-m"
    | "m-m-i"
    | "m-m-e"
    | "self-o-o"
    | "self-o-m"
    | "self-m-m-i"
    | "self-m-m-e";
  between: [string, string];
  name: string | null;
  from: {
    modelName: string;
    modelField: string;
  };
  to: {
    modelName: string;
    modelField: string;
  };
  id: string;
}

interface NodesData {
  model: {
    name: string;
    fields: {
      name: string;
      dType: string;
      isHandle: string;
      type: "source" | "target";
    }[];
  };
}

interface EdgesData {
  type: Relations["type"];
}

export type CustomNodeProps = NodeProps<NodesData>;
export type CustomEdgeProps = EdgeProps<EdgesData>;
export type CustomNode = Node<NodesData>;
export type CustomEdge = Edge<EdgesData>;
