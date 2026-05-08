#!/usr/bin/env ts-node
/**
 * generate-schema-map.ts
 *
 * Parses prisma/schema.prisma and emits docs/SCHEMA_MAP.md — a grouped
 * reference of all Prisma models with relation counts and per-group mermaid
 * ER diagrams. Run via `npm run schema:map` after schema changes.
 *
 * The MODEL_GROUPS map is the curated source of truth for how models cluster
 * by feature area; new models default to the "Other" bucket so the map stays
 * complete even when this file is out of date.
 *
 * BOOTSTRAP NOTE (delete this block after customizing):
 * The MODEL_GROUPS constant below is from a different repo (used as an
 * example). Replace its contents with this repo's actual model clusters
 * before running. Read prisma/schema.prisma first; group by feature area,
 * not alphabetically. Models not listed here fall into an "Other" group
 * automatically — that's a useful signal that you forgot to categorize a new
 * model, so leave it that way.
 */

import { promises as fs } from "fs";
import * as path from "path";

const REPO_ROOT = path.resolve(__dirname, "..");
const SCHEMA_PATH = path.join(REPO_ROOT, "prisma", "schema.prisma");
const OUTPUT_PATH = path.join(REPO_ROOT, "docs", "SCHEMA_MAP.md");

interface ParsedField {
  name: string;
  type: string;
  isRelation: boolean;
  isList: boolean;
  isOptional: boolean;
  attributes: string;
}

interface ParsedModel {
  name: string;
  block: string;
  fields: ParsedField[];
  tableMap?: string;
  comment?: string;
}

interface ParsedEnum {
  name: string;
  values: string[];
}

const MODEL_GROUPS: Record<string, string[]> = {
  "Auth & Users": ["User", "Account", "Session", "AdminAuditLog"],
  "Posts & Announcements": [
    "Post",
    "PostAttachment",
    "PostCollaborator",
    "PostVersion",
    "PostReaction",
    "PostView",
    "PostViewDedup",
    "PostAcknowledgment",
    "PostEditorialComment",
    "AnnouncementCategory",
    "AnnouncementAuthor",
    "Comment",
  ],
  Teams: [
    "Team",
    "TeamView",
    "TeamAccessRequest",
    "TeamResource",
    "TeamWorkspaceFolder",
    "Tag",
    "UXTool",
    "SkillshareTopic",
    "SkillshareVote",
  ],
  "Career Framework": [
    "CareerLadderProgress",
    "CareerProfile",
    "CareerProfileSpecialty",
    "CompetencyCategory",
    "Competency",
    "CompetencyLevel",
    "CompetencyVersion",
    "CareerRole",
    "CompetencyAssessment",
    "CompetencyEvidence",
    "CareerGoal",
    "GoalAction",
    "DevelopmentReview",
    "SurveyCompetency",
  ],
  "Personas & Research": [
    "Persona",
    "Archetype",
    "ArchetypeDataFlow",
    "ArchetypeHardware",
    "ArchetypeSoftware",
    "JourneyMap",
    "JourneySoftware",
    "PersonaSoftware",
    "ResearchPersona",
    "Customer",
    "Research",
  ],
  "Surveys & Feedback": [
    "Survey",
    "SurveyResponse",
    "SurveyCampaign",
    "ThreeSixtyFeedback",
    "CampaignSurveys",
    "Feedback",
  ],
  "Project Management": [
    "Project",
    "ProjectShare",
    "ProjectMember",
    "ProjectMilestone",
    "ProjectUpdate",
    "ProjectTask",
    "Sprint",
    "TaskLabel",
    "TaskDependency",
    "TaskChecklist",
    "TaskComment",
    "TaskAttachment",
    "TaskActivity",
    "TimeEntry",
    "ProjectView",
    "ProjectFolder",
    "ProjectTemplate",
    "ProjectAutomation",
    "CustomFieldDefinition",
    "EcosystemMap",
    "EcosystemNodePosition",
  ],
  "Apps, Hardware & Software": [
    "AppMeta",
    "Hardware",
    "Software",
    "ResourceVersion",
  ],
  "AI & Reports": ["AiInteraction", "ReportPreset"],
  Connections: ["ConnectionType", "Connection"],
  "Activity & Notifications": [
    "Activity",
    "Notification",
    "Bookmark",
    "Favorite",
  ],
  System: ["SystemConfig"],
};

const GROUP_ORDER = Object.keys(MODEL_GROUPS);

function parseSchema(source: string): {
  models: ParsedModel[];
  enums: ParsedEnum[];
} {
  const models: ParsedModel[] = [];
  const enums: ParsedEnum[] = [];

  const modelRegex = /(?:^|\n)((?:\/\/\/[^\n]*\n)*)model\s+(\w+)\s*\{([\s\S]*?)\n\}/g;
  let m: RegExpExecArray | null;
  while ((m = modelRegex.exec(source)) !== null) {
    const [, leadingComments, name, body] = m;
    const fields: ParsedField[] = [];
    let tableMap: string | undefined;
    const lines = body.split("\n");
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith("//")) continue;
      if (line.startsWith("@@map(")) {
        const mm = line.match(/@@map\("([^"]+)"\)/);
        if (mm) tableMap = mm[1];
        continue;
      }
      if (line.startsWith("@@")) continue;
      const fieldMatch = line.match(/^(\w+)\s+([\w\[\]?]+)(\s+.*)?$/);
      if (!fieldMatch) continue;
      const [, fieldName, rawType, attrs] = fieldMatch;
      const isList = rawType.endsWith("[]");
      const isOptional = rawType.endsWith("?");
      const baseType = rawType.replace(/[\[\]?]/g, "");
      const isRelation = /^[A-Z]/.test(baseType);
      fields.push({
        name: fieldName,
        type: baseType,
        isRelation,
        isList,
        isOptional,
        attributes: (attrs ?? "").trim(),
      });
    }
    const comment = leadingComments
      ? leadingComments
          .split("\n")
          .map((l) => l.replace(/^\/\/\/\s?/, "").trim())
          .filter(Boolean)
          .join(" ")
      : undefined;
    models.push({ name, block: body, fields, tableMap, comment });
  }

  const enumRegex = /(?:^|\n)enum\s+(\w+)\s*\{([\s\S]*?)\n\}/g;
  while ((m = enumRegex.exec(source)) !== null) {
    const [, name, body] = m;
    const values = body
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("//"))
      .map((l) => l.split(/\s+/)[0]);
    enums.push({ name, values });
  }

  return { models, enums };
}

function groupOf(modelName: string): string {
  for (const [group, names] of Object.entries(MODEL_GROUPS)) {
    if (names.includes(modelName)) return group;
  }
  return "Other";
}

function relationTargets(model: ParsedModel, scalarTypes: Set<string>): string[] {
  const targets = new Set<string>();
  for (const f of model.fields) {
    if (!f.isRelation) continue;
    if (scalarTypes.has(f.type)) continue;
    targets.add(f.type);
  }
  return Array.from(targets).sort();
}

function relationCount(model: ParsedModel, scalarTypes: Set<string>): number {
  return model.fields.filter((f) => f.isRelation && !scalarTypes.has(f.type)).length;
}

function buildMermaid(group: string, models: ParsedModel[], allModelNames: Set<string>): string {
  if (models.length === 0) return "";
  const lines: string[] = ["```mermaid", "erDiagram"];
  const seenEdges = new Set<string>();
  for (const model of models) {
    for (const f of model.fields) {
      if (!f.isRelation) continue;
      if (!allModelNames.has(f.type)) continue;
      const a = model.name;
      const b = f.type;
      if (a === b) continue;
      const edgeKey = [a, b].sort().join("--");
      if (seenEdges.has(edgeKey)) continue;
      seenEdges.add(edgeKey);
      const cardinality = f.isList ? '"1" ||--o{ "many"' : '"1" ||--|| "1"';
      lines.push(`  ${a} ${cardinality} ${b} : ${f.name}`);
    }
    if (
      !models.some((other) =>
        other.fields.some((ff) => ff.isRelation && ff.type === model.name)
      ) &&
      !model.fields.some((ff) => ff.isRelation && allModelNames.has(ff.type))
    ) {
      lines.push(`  ${model.name} {`);
      lines.push(`    string id`);
      lines.push(`  }`);
    }
  }
  lines.push("```");
  return lines.join("\n");
}

async function main() {
  const source = await fs.readFile(SCHEMA_PATH, "utf-8");
  const { models, enums } = parseSchema(source);
  const allModelNames = new Set(models.map((m) => m.name));
  const enumNames = new Set(enums.map((e) => e.name));
  const scalarTypes = new Set([
    "String",
    "Int",
    "Float",
    "Decimal",
    "Boolean",
    "DateTime",
    "Json",
    "Bytes",
    "BigInt",
    ...enumNames,
  ]);

  const grouped: Record<string, ParsedModel[]> = {};
  for (const m of models) {
    const g = groupOf(m.name);
    grouped[g] ??= [];
    grouped[g].push(m);
  }

  const out: string[] = [];
  out.push("# Prisma Schema Map");
  out.push("");
  out.push(
    "_Auto-generated by `npm run schema:map` from [prisma/schema.prisma](../prisma/schema.prisma). Do not edit by hand._",
  );
  out.push("");
  out.push(
    `Models: **${models.length}** • Enums: **${enums.length}** • Groups: **${
      Object.keys(grouped).length
    }**`,
  );
  out.push("");
  out.push("## Table of contents");
  out.push("");
  const orderedGroups = [
    ...GROUP_ORDER.filter((g) => grouped[g]?.length),
    ...Object.keys(grouped).filter((g) => !GROUP_ORDER.includes(g)),
  ];
  for (const g of orderedGroups) {
    const slug = g.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    out.push(`- [${g}](#${slug}) (${grouped[g].length})`);
  }
  out.push("");

  for (const g of orderedGroups) {
    const models = grouped[g];
    out.push(`## ${g}`);
    out.push("");
    out.push("| Model | Table | Relations | Linked to |");
    out.push("| --- | --- | ---: | --- |");
    for (const m of models.sort((a, b) => a.name.localeCompare(b.name))) {
      const rels = relationCount(m, scalarTypes);
      const targets = relationTargets(m, scalarTypes);
      const targetList = targets.length
        ? targets
            .map((t) =>
              allModelNames.has(t)
                ? `[${t}](#${groupOf(t).toLowerCase().replace(/[^a-z0-9]+/g, "-")})`
                : t,
            )
            .slice(0, 10)
            .join(", ") + (targets.length > 10 ? ", …" : "")
        : "—";
      out.push(
        `| **${m.name}** | \`${m.tableMap ?? "—"}\` | ${rels} | ${targetList} |`,
      );
    }
    out.push("");
    const mermaid = buildMermaid(g, models, allModelNames);
    if (mermaid) {
      out.push("<details><summary>ER diagram</summary>");
      out.push("");
      out.push(mermaid);
      out.push("");
      out.push("</details>");
      out.push("");
    }
  }

  if (enums.length) {
    out.push("## Enums");
    out.push("");
    out.push("| Enum | Values |");
    out.push("| --- | --- |");
    for (const e of enums.sort((a, b) => a.name.localeCompare(b.name))) {
      out.push(`| **${e.name}** | ${e.values.map((v) => `\`${v}\``).join(", ")} |`);
    }
    out.push("");
  }

  out.push("---");
  out.push("");
  out.push(
    `Regenerate after schema changes: \`npm run schema:map\`. Curated groupings live in [scripts/generate-schema-map.ts](../scripts/generate-schema-map.ts) under \`MODEL_GROUPS\`.`,
  );
  out.push("");

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, out.join("\n"), "utf-8");
  // eslint-disable-next-line no-console
  console.log(
    `Wrote ${path.relative(REPO_ROOT, OUTPUT_PATH)} — ${models.length} models in ${
      orderedGroups.length
    } groups, ${enums.length} enums.`,
  );
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
