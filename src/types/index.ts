import { Node, Edge, Position } from "reactflow";

export type ModelData = {
  name: string;
  primaryKey: string;
  foriegnKeys: string[];
  fields: {
    [key: string]: FieldDefinition;
  };
  relatedTo: Set<string>;
  relations: Map<string, Relation[]>;
};

export type Models = {
  [key: string]: ModelData;
};

export type RawModelData = {
  name: string;
  content: string;
};

export type FieldDefinition = {
  isPrimaryKey: boolean;
  isForiegnKey: boolean;
  name: string;
  dType: string;
  optional: boolean;
  iterable: boolean;
  isRelation: boolean;
  relation: {
    foriegnKey: string | null;
    references: string | null;
    name: string | null;
  } | null;
  handle: {
    sourceLeft?: HandleData;
    sourceRight?: HandleData;
    target?: HandleData;
  };
};

type HandleData = { position: Position; id: string };
type RelationType =
  | "one-one"
  | "one-many"
  | "many-many-implicit"
  | "many-many-explicit" //not implemented
  | "self-one-one"
  | "self-one-many"
  | "self-many-many-explicit" //not implementd
  | "self-many-many-implicit"; //not implemented

export interface Relation {
  type: RelationType;
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

export type CustomNodeData = Pick<ModelData, "name" | "fields">;

export type CustomNode = Node<CustomNodeData, "customNode">;
export type CustomEdge = Edge<RelationType>;
