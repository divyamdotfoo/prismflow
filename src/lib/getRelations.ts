import { FieldDefinition, Relation, ModelData } from "@/types";
import { Models } from "./getParsedModels";

type HandleRelationParams = {
  modelData: Models;
  parentModel: string;
  childModel: string;
  childField: FieldDefinition;
};

export const getRelations = (modelData: Models): Relation[] => {
  const relations: Relation[] = [];
  const modelIterable = Object.values(modelData);
  const ids = new Set<string>();

  // checking one model at a time

  modelIterable.forEach((model) => {
    const fields = Object.values(model.fields);

    fields.forEach((field) => {
      const parentModel = field.dType;
      if (parentModel === model.name) {
        // handle self relation
        const relName = field?.relation?.name;
        if (!relName) throw new Error("invalid schema");

        const relation = handleSelfRelations(model, field);
        if (ids.has(relation.id)) return;
        relations.push(relation);
        ids.add(relation.id);
        return;
      }
      if (!new Set(Object.keys(modelData)).has(parentModel)) return;
      const params: HandleRelationParams = {
        modelData,
        parentModel,
        childModel: model.name,
        childField: field,
      };

      handleRelations(params, relations, ids);
    });
  });
  return relations;
};

const handleSelfRelations = (
  model: ModelData,
  firstRelatedField: FieldDefinition
): Relation => {
  const relName = firstRelatedField.relation!.name;

  const secondField = Object.values(model.fields).find(
    (f) => f.relation?.name == relName && f.name !== firstRelatedField.name
  );

  if (!secondField) throw new Error("invalid schema");

  const parentKey =
    firstRelatedField.relation?.references ?? secondField.relation?.references;
  const foriegnKey =
    firstRelatedField.relation?.foriegnKey ?? secondField.relation?.foriegnKey;

  const isFirstFieldIterable = firstRelatedField.iterable;
  const isFirstFieldOptional = firstRelatedField.optional;

  // Handling self one-one relationship

  if (isFirstFieldOptional && secondField.optional) {
    if (!parentKey || !foriegnKey) {
      throw new Error("invalid schema");
    }
    return {
      between: [model.name, model.name],
      from: {
        modelName: model.name,
        modelField: parentKey,
      },
      name: relName,
      type: "self-one-one",
      to: {
        modelName: model.name,
        modelField: foriegnKey,
      },
      id: generateRelId([model.name, model.name], [parentKey, foriegnKey]),
    };
  }

  // Handling self one-many relationship

  if (
    (isFirstFieldOptional && secondField.iterable) ||
    (isFirstFieldIterable && secondField.optional)
  ) {
    if (!parentKey || !foriegnKey) {
      throw new Error("invalid schema");
    }
    return {
      between: [model.name, model.name],
      from: {
        modelName: model.name,
        modelField: parentKey,
      },
      name: relName,
      type: "self-one-many",
      to: {
        modelName: model.name,
        modelField: foriegnKey,
      },
      id: generateRelId([model.name, model.name], [parentKey, foriegnKey]),
    };
  }

  // no self relationship found
  throw new Error("invalid schema");
};

const handleRelations = (
  params: HandleRelationParams,
  relations: Relation[],
  ids: Set<string>
) => {
  const one_one = handleOneOne(params);
  if (one_one) {
    if (ids.has(one_one.id)) return;
    relations.push(one_one);
    ids.add(one_one.id);
    return;
  }

  const one_many = handleOneMany(params);
  if (one_many) {
    if (ids.has(one_many.id)) return;
    relations.push(one_many);
    ids.add(one_many.id);
    return;
  }

  const many_many_implicit = handleManyManyImplicit(params);
  if (many_many_implicit) {
    if (ids.has(many_many_implicit.id)) return;
    relations.push(many_many_implicit);
    ids.add(many_many_implicit.id);
    return;
  }
};

const handleOneOne = ({
  childModel,
  modelData,
  parentModel,
  childField,
}: HandleRelationParams): Relation | false => {
  if (
    !childField.relation ||
    !childField.relation.foriegnKey ||
    !childField.relation.references
  )
    return false;

  const parentFields = Object.values(modelData[parentModel].fields);
  for (const parentField of parentFields) {
    if (parentField.dType === childModel && !parentField.iterable)
      return {
        name: childField.relation.name,
        between: [parentModel, childModel],
        from: {
          modelName: parentModel,
          modelField: childField.relation.references,
        },
        to: {
          modelName: childModel,
          modelField: childField.relation.foriegnKey,
        },
        type: "one-one",
        id: generateRelId(
          [parentModel, childModel],
          [childField.relation.foriegnKey, childField.relation.references]
        ),
      };
  }
  return false;
};

const handleOneMany = ({
  childModel,
  modelData,
  parentModel,
  childField,
}: HandleRelationParams): Relation | false => {
  if (
    !childField.relation ||
    !childField.relation.foriegnKey ||
    !childField.relation.references
  )
    return false;
  const fields = Object.values(modelData[parentModel].fields);

  for (const field of fields) {
    if (field.dType === childModel && field.iterable)
      return {
        name: childField.relation.name,
        between: [parentModel, childModel],
        from: {
          modelName: parentModel,
          modelField: childField.relation.references,
        },
        to: {
          modelName: childModel,
          modelField: childField.relation.foriegnKey,
        },
        type: "one-many",
        id: generateRelId(
          [parentModel, childModel],
          [childField.relation.foriegnKey, childField.relation.references]
        ),
      };
  }

  return false;
};

const handleManyManyImplicit = ({
  childModel,
  modelData,
  parentModel,
  childField,
}: HandleRelationParams): Relation | false => {
  const parentFields = Object.values(modelData[parentModel].fields);
  for (const parentField of parentFields) {
    if (
      parentField.dType === childModel &&
      parentField.iterable &&
      childField.iterable
    ) {
      return {
        name: childField?.relation?.name ?? "",
        between: [parentModel, childModel],
        from: {
          modelName: parentModel,
          modelField: parentField.name,
        },
        to: {
          modelName: childModel,
          modelField: childField.name,
        },
        type: "many-many-implicit",
        id: generateRelId(
          [parentModel, childModel],
          [childField.name, parentField.name]
        ),
      };
    }
  }
  return false;
};

// unique ids for relations
const generateRelId = (models: [string, string], fields: [string, string]) => {
  return `${models.sort().join("-")}-${fields.sort().join("-")}`;
};