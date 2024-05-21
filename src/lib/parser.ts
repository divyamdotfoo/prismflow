import { FieldDefinition, Relations, SchemaAST } from "@/types";



export function parser(content: string): SchemaAST {
  const extractModels = (s: string) => {
    const reg = /model\s+(\w+)\s+\{([\s\S]*?)^\}/gm;
    return Array.from(cleanSchema(s).matchAll(reg)).map((_) => ({
      name: _[1].trim(),
      content: _[2].trim(),
    }));
  };

  const extractDbType = (s: string) => {
    const reg = /datasource\s+\w+\s*\{[^}]*provider\s*=\s*"([^"]+)"/g;
    const match = Array.from(s.matchAll(reg));
    return match.length > 0 ? match[0][1] : "";
  };

  const extractRelationMode = (s: string) => {
    const reg = /datasource\s+\w+\s*\{[^}]*relationMode\s*=\s*"([^"]+)"/g;
    const match = Array.from(s.matchAll(reg));
    return match.length > 0 ? match[0][1] : undefined;
  };

  const parseModel = (
    extracted: ReturnType<typeof extractModels>[0]
  ): [string, SchemaAST["models"][string]] => {
    const modelData: SchemaAST["models"][string] = {
      fields: {},
      blockAttributes: [],
      name: extracted.name,
    };
    const fields: [string, FieldDefinition][] = extracted.content
      .split("\n")
      .map((field) => {
        if (field.trim().startsWith("@@")) {
          modelData.blockAttributes.push(field.trim().replace("\r", ""));
          return [];
        }
        const vals = field
          .split(" ")
          .filter((_) => _.trim())
          .map((_) => _.replace("\r", ""));
        const getMatchResult = (regex: RegExp[], defaultValue = []) => {
          for (const reg of regex) {
            const match = Array.from(field.matchAll(reg));
            if (match.length > 0)
              return match[0][1].split(",").map((_) => _.trim());
          }
          return defaultValue;
        };

        const fieldDefinition: FieldDefinition = {
          name: vals[0],
          dType: vals[1].replace("?", "").replace("[]", ""),
          optional: vals[1].endsWith("?") || vals[1].endsWith("[]"),
          iterable: vals[1].endsWith("[]"),
          attributes: field
            .split("@")
            .slice(1)
            .map((_) => _.trim())
            .filter((_) => !_.startsWith("relation")),
          isRelation: field.includes("@relation"),
          relation: {
            fields: getMatchResult([
              /@relation\([^)]*fields:\s*\[([^\]]+)\][^)]*\)/g,
            ]),
            references: getMatchResult([
              /@relation\([^)]*references:\s*\[([^\]]+)\][^)]*\)/g,
            ]),
            map: getMatchResult([
              /@relation\([^)]*map:\s*\[([^\]]+)\][^)]*\)/g,
            ]),
            onDelete: getMatchResult([/onDelete\s*:\s*(\w+)/g]),
            onUpdate: getMatchResult([/onUpdate\s*:\s*(\w+)/g]),
            name: getMatchResult([/name\s*:\s*"([^"]+)"/g, /"([^"]+)"/g])[0],
          },
        };
        return [vals[0], fieldDefinition];
      })
      .filter((_) => _.length > 0) as [string, FieldDefinition][];

    return [
      extracted.name,
      { ...modelData, fields: Object.fromEntries(fields) },
    ];
  };
  
  const models = Object.fromEntries(
    extractModels(content).map((m) => parseModel(m))
  );
  const relations: Relations[] = [];
  const relIds = new Set();

  for (const model of Object.values(models)) {
    Object.values(model.fields).forEach((field) => {
      if (!field.isRelation) {
        // if no @relation attribute is used
        return;
      }

      const relName = field.relation.name;
      const relModel = models[field.dType];
      if (!relModel) {
        // no relModel : there may be some error present in the schema file.
        return;
      }
      if (relModel.name === model.name) {
        // handle self relations
        const relFields = Object.values(model.fields).filter(
          (_) => _.name !== field.name && _.relation.name === relName
        );
        for (const relField of relFields) {
          const id = generateSelfRelId(model.name, [relField.name, field.name]);
          if (!field.iterable && !relField.iterable) {
            if (!relIds.has(id)) {
              relations.push({
                between: [model.name, model.name],
                from: {
                  modelField: relField.name,
                  modelName: model.name,
                },
                to: {
                  modelField: field.name,
                  modelName: model.name,
                },
                id,
                name: relName,
                type: "self-o-o",
              });
              relIds.add(id);
            }
          } else if (
            (!field.iterable && relField.iterable) ||
            (field.iterable && !relField.iterable)
          ) {
            if (!relIds.has(id)) {
              relations.push({
                between: [model.name, model.name],
                from: { modelField: field.name, modelName: model.name },
                to: { modelField: relField.name, modelName: model.name },
                id,
                name: relName,
                type: "self-o-m",
              });
              relIds.add(id);
            }
          } else {
            if (!relIds.has(id)) {
              relations.push({
                between: [model.name, model.name],
                from: { modelField: field.name, modelName: model.name },
                to: { modelField: relField.name, modelName: model.name },
                id,
                name: relName,
                type: "self-m-m-i",
              });
              relIds.add(id);
            }
          }
        }

        return;
      }

      if (field.relation.fields.length && field.relation.references.length) {
        // if mapping is present
        const relModalFields = Object.values(relModel.fields).filter(
          (f) => f.dType === model.name
        );
        for (const relField of relModalFields) {
          const id = generateRelId(
            [relModel.name, model.name],
            [field.name, relField.name]
          );
          const checkRelByName = relName
            ? relField.relation.name === relName
            : !relField.relation.name;
          if (!checkRelByName) continue;
          if (relField.iterable) {
            if (!relIds.has(id)) {
              relations.push({
                name: relName === relField.relation.name ? relName : null,
                between: [model.name, relModel.name],
                type: "o-m",
                to: {
                  modelField: field.name,
                  modelName: model.name,
                },
                from: {
                  modelField: relField.name,
                  modelName: relModel.name,
                },
                id,
              });
              relIds.add(id);
            }
          } else {
            if (!relIds.has(id)) {
              relations.push({
                name: relName === relField.relation.name ? relName : null,
                between: [model.name, relModel.name],
                type: "o-o",
                to: {
                  modelField: field.name,
                  modelName: model.name,
                },
                from: {
                  modelField: relField.name,
                  modelName: relModel.name,
                },
                id,
              });
              relIds.add(id);
            }
          }
        }
      } else {
        // if mapping is not present field should be automatically iterable.
        const relModalFields = Object.values(relModel.fields).filter(
          (f) => f.dType === model.name
        );
        for (const relField of relModalFields) {
          const id = generateRelId(
            [relModel.name, model.name],
            [field.name, relField.name]
          );
          const checkRelByName = relName
            ? relField.relation.name === relName
            : !relField.relation.name;
          if (!checkRelByName) continue;
          if (!relField.iterable && !field.iterable) {
            if (!relIds.has(id)) {
              relations.push({
                name: relName === relField.relation.name ? relName : null,
                between: [model.name, relModel.name],
                type: "o-o",
                to: {
                  modelField: field.name,
                  modelName: model.name,
                },
                from: {
                  modelField: relField.name,
                  modelName: relModel.name,
                },
                id,
              });
              relIds.add(id);
            }
          } else if (!relField.iterable && field.iterable) {
            if (!relIds.has(id)) {
              relations.push({
                name: relName === relField.relation.name ? relName : null,
                between: [model.name, relModel.name],
                type: "o-m",
                to: {
                  modelField: field.name,
                  modelName: model.name,
                },
                from: {
                  modelField: relField.name,
                  modelName: relModel.name,
                },
                id,
              });
              relIds.add(id);
            }
          } else if (relField.iterable && field.iterable) {
            if (!relIds.has(id)) {
              relations.push({
                name: relName === relField.relation.name ? relName : null,
                between: [model.name, relModel.name],
                type: "m-m-i",
                to: {
                  modelField: field.name,
                  modelName: model.name,
                },
                from: {
                  modelField: relField.name,
                  modelName: relModel.name,
                },
                id,
              });
              relIds.add(id);
            }
          }
        }
      }
    });
  }
  return {
    dbType: extractDbType(content),
    models,
    relations,
    relationMode: extractRelationMode(content),
  };
}

function cleanSchema(content: string) {
  const multiLine = /\/\*[\s\S]*?\*\//g;
  const singleLine = /\/\/[^\n]*\n/g;
  const emptyLine = /^\s*\n/gm;
  return content
    .replace(multiLine, "\n")
    .replace(singleLine, "\n")
    .replace(emptyLine, "\n");
}

function generateRelId(models: [string, string], fields: [string, string]) {
  return `${models.sort().join("-")}-${fields.sort().join("-")}`;
}
function generateSelfRelId(model: string, fields: [string, string]) {
  return `${model}-${fields.sort().join("-")}`;
}
