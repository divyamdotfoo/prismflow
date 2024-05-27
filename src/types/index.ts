import { Edge, EdgeProps, Node, NodeProps } from "reactflow";

export type ModelData = {
  name: string;
  primaryKey: string;
  foriegnKeys: string[];
  fields: {
    [key: string]: FieldDefinition;
  };
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
};

type RelationType =
  | "one-one"
  | "one-many"
  | "many-many-implicit"
  | "many-many-explicit"
  | "self-one-one"
  | "self-one-many"
  | "self-many-many-explicit"
  | "self-many-many-implicit";

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
