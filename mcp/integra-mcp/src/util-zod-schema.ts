import { z, type ZodTypeAny } from "zod";

type JsonSchema = Record<string, unknown>;

// Minimal Zod → JSON Schema translator covering the shapes used by our tools:
// z.object, z.string, z.number (int/min/max), z.enum, z.optional, z.default,
// z.describe. Avoids pulling in a full zod-to-json-schema dep.
export function zodToJsonSchema(schema: ZodTypeAny): JsonSchema {
  return convert(schema);
}

function convert(schema: ZodTypeAny): JsonSchema {
  const def = schema._def as unknown as { typeName: string; [k: string]: unknown };
  const description = schema.description;

  switch (def.typeName) {
    case "ZodObject": {
      const shape = (schema as z.ZodObject<z.ZodRawShape>).shape;
      const properties: Record<string, JsonSchema> = {};
      const required: string[] = [];
      for (const [key, value] of Object.entries(shape)) {
        const child = value as ZodTypeAny;
        properties[key] = convert(child);
        if (!isOptional(child)) required.push(key);
      }
      const out: JsonSchema = { type: "object", properties };
      if (required.length > 0) out.required = required;
      if (description) out.description = description;
      return out;
    }
    case "ZodString":
      return withDescription({ type: "string" }, description);
    case "ZodNumber": {
      const checks = ((def as { checks?: Array<{ kind: string; value?: number }> }).checks ?? []);
      const out: JsonSchema = { type: "number" };
      for (const c of checks) {
        if (c.kind === "int") out.type = "integer";
        if (c.kind === "min" && typeof c.value === "number") out.minimum = c.value;
        if (c.kind === "max" && typeof c.value === "number") out.maximum = c.value;
      }
      return withDescription(out, description);
    }
    case "ZodEnum": {
      const values = (def as unknown as { values: string[] }).values;
      return withDescription({ type: "string", enum: values }, description);
    }
    case "ZodOptional":
      return convert((def as unknown as { innerType: ZodTypeAny }).innerType);
    case "ZodDefault": {
      const inner = convert((def as unknown as { innerType: ZodTypeAny }).innerType);
      const defaultValueFn = (def as unknown as { defaultValue: () => unknown }).defaultValue;
      inner.default = defaultValueFn();
      return inner;
    }
    case "ZodBoolean":
      return withDescription({ type: "boolean" }, description);
    default:
      return withDescription({}, description);
  }
}

function isOptional(schema: ZodTypeAny): boolean {
  const name = (schema._def as unknown as { typeName: string }).typeName;
  return name === "ZodOptional" || name === "ZodDefault";
}

function withDescription(obj: JsonSchema, description?: string): JsonSchema {
  if (description) obj.description = description;
  return obj;
}
