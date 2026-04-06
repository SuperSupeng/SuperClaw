// ============================================================================
// Schema Validator — MCP 工具定义校验
// ============================================================================
// 防止不合规的工具定义毒害全局。校验规则：
// 1. parameters 必须是有效 JSON Schema（type 必须是 "object"）
// 2. 参数名不能包含空格或特殊字符
// 3. description 不能为空
// 4. 嵌套深度不能超过 5 层
// 5. 单个工具参数数量不能超过 20 个
// ============================================================================

import type { ToolDefinition } from "@superclaw/types";

/** Schema 校验结果 */
export interface SchemaValidationResult {
  valid: boolean;
  errors: string[];
}

/** 合法参数名正则：只允许字母、数字、下划线、连字符 */
const VALID_PARAM_NAME = /^[a-zA-Z_][a-zA-Z0-9_-]*$/;

/** 最大嵌套深度 */
const MAX_DEPTH = 5;

/** 最大参数数量 */
const MAX_PARAMS = 20;

/**
 * 校验工具定义的 schema 是否合规
 */
export function validateToolSchema(
  tool: ToolDefinition,
): SchemaValidationResult {
  const errors: string[] = [];

  // 1. description 不能为空
  if (!tool.description || tool.description.trim().length === 0) {
    errors.push(`Tool "${tool.name}": description must not be empty`);
  }

  // 2. parameters 必须存在且 type 为 "object"
  const params = tool.parameters;
  if (!params || typeof params !== "object") {
    errors.push(`Tool "${tool.name}": parameters must be a valid JSON Schema object`);
    return { valid: false, errors };
  }

  if (params["type"] !== "object") {
    errors.push(
      `Tool "${tool.name}": parameters.type must be "object", got "${String(params["type"])}"`,
    );
    return { valid: false, errors };
  }

  // 3. 校验 properties
  const properties = params["properties"];
  if (properties && typeof properties === "object") {
    const props = properties as Record<string, unknown>;
    const propKeys = Object.keys(props);

    // 参数数量限制
    if (propKeys.length > MAX_PARAMS) {
      errors.push(
        `Tool "${tool.name}": too many parameters (${propKeys.length}), max is ${MAX_PARAMS}`,
      );
    }

    // 参数名校验
    for (const key of propKeys) {
      if (!VALID_PARAM_NAME.test(key)) {
        errors.push(
          `Tool "${tool.name}": parameter name "${key}" contains invalid characters`,
        );
      }
    }

    // 嵌套深度校验
    for (const key of propKeys) {
      const depth = measureDepth(props[key], 1);
      if (depth > MAX_DEPTH) {
        errors.push(
          `Tool "${tool.name}": parameter "${key}" exceeds max nesting depth of ${MAX_DEPTH}`,
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 递归测量 JSON Schema 的嵌套深度
 */
function measureDepth(schema: unknown, currentDepth: number): number {
  if (!schema || typeof schema !== "object") {
    return currentDepth;
  }

  const s = schema as Record<string, unknown>;
  let maxDepth = currentDepth;

  // object with properties
  if (s["type"] === "object" && s["properties"] && typeof s["properties"] === "object") {
    const props = s["properties"] as Record<string, unknown>;
    for (const val of Object.values(props)) {
      const d = measureDepth(val, currentDepth + 1);
      if (d > maxDepth) maxDepth = d;
    }
  }

  // array with items
  if (s["type"] === "array" && s["items"]) {
    const d = measureDepth(s["items"], currentDepth + 1);
    if (d > maxDepth) maxDepth = d;
  }

  // additionalProperties as schema
  if (s["additionalProperties"] && typeof s["additionalProperties"] === "object") {
    const d = measureDepth(s["additionalProperties"], currentDepth + 1);
    if (d > maxDepth) maxDepth = d;
  }

  return maxDepth;
}
