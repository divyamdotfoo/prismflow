import { ModelData, RawModelData } from "@/types";

export const getParsedModels = (blob: string) => {
  const rawModelData = extractModels(blob);
  return Object.fromEntries(
    rawModelData.map((data) => [data.name, parseModel(data)])
  );
};

export type Models = ReturnType<typeof getParsedModels>;

const PrismaRegExp = {
  getCompositeId: [/@@id\(\[([^\]]+)\]\)/, /@@id\(fields:\[([^\]]+)\]\)/],
  isFieldIterable: /\[\]$/,
  isFieldOptional: /\?$/,
  getRelationFields: /fields:\s*\[([^\]]+)\]/,
  getRelationRefs: /references:\s*\[([^\]]+)\]/,
  getRelationName: /"([^"]*)"/,
};

const cleanSchema = (content: string) => {
  const multiLineComments = /\/\*[\s\S]*?\*\//g;
  const singleLineComments = /\/\/[^\n]*\n/g;
  const emptyLine = /^\s*\n/gm;
  return content
    .replace(multiLineComments, "\n")
    .replace(singleLineComments, "\n")
    .replace(emptyLine, "\n");
};

const extractModels = (s: string) => {
  const reg = /model\s+(\w+)\s+\{([\s\S]*?)^\}/gm;
  return Array.from(cleanSchema(s).matchAll(reg)).map((_) => ({
    name: _[1].trim(),
    content: _[2].trim(),
  }));
};

const singleMatcher = (regExp: RegExp | RegExp[], blob: string) => {
  if (!blob.length) return null;
  if (!Array.isArray(regExp)) {
    const match = blob.match(regExp);
    if (match) {
      return match[1];
    }
    return null;
  }
  for (const reg of regExp) {
    const match = blob.match(reg);
    if (match) {
      return match[1];
    }
  }
  return null;
};

const extractRelationData = (data: string) => {
  if (!data.includes("relation")) {
    return false;
  }
  const field = singleMatcher(PrismaRegExp.getRelationFields, data);
  const refs = singleMatcher(PrismaRegExp.getRelationRefs, data);
  const relName = singleMatcher(PrismaRegExp.getRelationName, data);
  return { field, refs, relName };
};

const parseModel = (rawModelData: RawModelData) => {
  const modelData: ModelData = {
    fields: {},
    name: rawModelData.name,
    primaryKey: "",
    foriegnKeys: [],
  };
  const rawModelFields = rawModelData.content
    .split("\n")
    .map((_) => _.trim())
    .filter((l) => l.length);

  // parsing each field in a loop and adding them to modelData

  rawModelFields.forEach((rawField) => {
    if (rawField.startsWith("@@")) {
      // returning if the field is a attribute type
      const compositeId = singleMatcher(PrismaRegExp.getCompositeId, rawField);
      if (compositeId) {
        modelData.primaryKey = compositeId
          .split(",")
          .map((_) => _.trim())
          .join("_");
        return;
      }
      return;
    }

    // moving further to extract field data

    // splitting to get the name,type and attributes as an array ["name type","attributes"]
    const fieldTokens = rawField
      .split("@")
      .map((_) => _.trim())
      .filter((_) => _.length)
      .map((_, i) => (i !== 0 ? "@" + _ : _));

    const [fieldName, fieldType] = fieldTokens[0]
      .split(" ")
      .map((_) => _.trim())
      .filter((_) => _.length);

    if (fieldTokens.includes("@id")) modelData.primaryKey = fieldName;

    if (fieldTokens.includes("@unique") && !modelData.primaryKey)
      modelData.primaryKey = fieldName;

    const isOptional = singleMatcher(PrismaRegExp.isFieldOptional, fieldType);
    const isIterable = singleMatcher(PrismaRegExp.isFieldIterable, fieldType);

    // checking the relation by passing 1th index field token which is attributes

    const isRelation =
      fieldTokens.length > 1 ? extractRelationData(fieldTokens[1]) : false;

    if (!isRelation) {
      modelData.fields[fieldName] = {
        name: fieldName,
        dType: fieldType.replace("?", "").replace("[]", "").trim(),
        isForiegnKey: false,
        isRelation: false,
        relation: null,
        isPrimaryKey: !!modelData.primaryKey.length,
        iterable: isIterable === null ? false : true,
        optional: isOptional === null ? false : true,
      };
    } else {
      modelData.fields[fieldName] = {
        name: fieldName,
        dType: fieldType.replace("?", "").replace("[]", "").trim(),
        isForiegnKey: false,
        isRelation: true,
        isPrimaryKey: !!modelData.primaryKey.length,
        iterable: isIterable === null ? false : true,
        optional: isOptional === null ? false : true,
        relation: {
          foriegnKey: isRelation.field,
          name: isRelation.relName,
          references: isRelation.refs,
        },
      };
      if (isRelation.field) modelData.foriegnKeys.push(isRelation.field);
    }
  });

  // Adjusting for the foriegn keys property

  modelData.foriegnKeys.forEach((fk) => {
    modelData.fields[fk].isForiegnKey = true;
  });
  return modelData;
};
