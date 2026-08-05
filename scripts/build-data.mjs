import fs from "node:fs";
import path from "node:path";

const repo = path.resolve(import.meta.dirname, "..");
const upstreamHandoff = path.resolve(repo, "..", "..", "..", "task-11b-agricultural-theory", "outputs");
const recoveredHandoff = path.join(repo, "source-notes", "theory-handoffs");
const visualManifestPath = path.join(repo, "source-notes", "VISUAL-MANIFEST.json");
const visualRecords = fs.existsSync(visualManifestPath)
  ? (JSON.parse(fs.readFileSync(visualManifestPath, "utf8")).records || [])
  : [];
const metadata = [
  [1, "Introduction to Agriculture", "Define agriculture, connect daily products to sectors and investigate how people and technologies shape production."],
  [2, "The Value of Agriculture and Food Security", "Explain why agriculture matters and examine the availability, access, use and stability of food."],
  [3, "Introduction to Beef Cattle and Breeds", "Compare cattle groups and breeds, then connect characteristics to environments and production goals."],
  [4, "Beef Cattle Farming and Nutrition", "Compare beef-production and feeding systems, then explain the trade-offs using the supplied lesson evidence."],
  [5, "Dairy Breeds and Milk Production", "Relate dairy breeds, regions, routines and value adding without inventing local farm requirements."],
  [6, "Dairy Processing and Nutrition", "Sequence milk processing and explain taught nutrition concepts using current, visible sources."],
  [7, "Horticulture and Growing Regions", "Investigate horticultural products and explain how climate, water, soil and management affect regions."],
  [8, "Paddock to Plate — Technology, Nutrition and Choice", "Trace a product supply chain and evaluate the role of technology, work and food choice."],
  [9, "Australian Pork Industry and Breeds", "Interpret product labels and industry evidence, then explain breed selection and crossbreeding."],
  [10, "Pig Farming Systems and Feeding", "Compare production systems and reason about feeding, welfare, efficiency and farmer choices."],
  [11, "Australian Poultry Industry — Farm to Plate", "Distinguish broilers and layers, compare production systems and examine evidence-based trade-offs."]
].map(([module, title, summary]) => ({ file: `AGRICULTURE-MODULE-${String(module).padStart(2, "0")}.json`, module, title, summary }));

const between = (text, start, end) => {
  const a = text.indexOf(start);
  const b = text.indexOf(end, a + start.length);
  if (a < 0 || b < 0) throw new Error(`Missing ${start} or ${end}`);
  return text.slice(a + start.length, b).trim();
};

const currentVerification = {
  "1.3": {
    note: "Current sources verify the general cultural-burning and Gunditjmara aquaculture examples. Any local comparison, community source selection and cultural or ICIP protocol remain Teacher to confirm.",
    sources: [
      { label: "Australia State of the Environment 2021 — Caring for Country", url: "https://soe.dcceew.gov.au/indigenous/management/caring-country" },
      { label: "UNESCO — Budj Bim Cultural Landscape", url: "https://whc.unesco.org/en/list/1577/" }
    ]
  }
};

function parseSources(content) {
  const raw = content.split("\nSources\n")[1]?.trim() || "";
  return raw.split(/;\s+/).map((entry) => {
    const match = entry.match(/^(.*?):\s*(https?:\/\/\S+)$/);
    return match ? { label: match[1].trim(), url: match[2].trim() } : null;
  }).filter(Boolean);
}

function parseSection(section) {
  const content = section.content.replace(/\r/g, "");
  const theoryMarker = content.indexOf("\nTheory\n");
  const titleMarker = content.indexOf(section.title);
  const theoryStart = theoryMarker >= 0 ? theoryMarker + "\nTheory\n".length : titleMarker + section.title.length;
  const theoryEnd = content.indexOf("\nKey takeaways\n", theoryStart);
  if (theoryStart < 0 || theoryEnd < 0) throw new Error(`Missing theory or key takeaways in ${section.id}`);
  const theory = content.slice(theoryStart, theoryEnd).trim().split(/\n\s*\n/).map((part) => part.trim()).filter((part) => part && !["Understand the idea", "Apply it to agriculture", "Check before moving on"].includes(part));
  const knowledgeHeading = content.includes("\nKnowledge check\n") ? "\nKnowledge check\n" : "\nKnowledge checks\n";
  const takeaways = between(content, "\nKey takeaways\n", knowledgeHeading).split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
  const checks = [];
  const checksRaw = between(content, knowledgeHeading, "\nWritten evidence\n");
  const checkPattern = /([^\n]+)\n\s*A\. ([^\n]+)\n\s*B\. ([^\n]+)\n\s*C\. ([^\n]+)\n\s*D\. ([^\n]+)\n\s*Answer: ([A-D])\. ([^\n]+)\n\s*Correct feedback: ([^\n]+)\n\s*Incorrect feedback: ([^\n]+)\n\s*Source: ([^\n]+)/g;
  for (const match of checksRaw.matchAll(checkPattern)) {
    checks.push({ question: match[1].trim(), options: match.slice(2, 6).map((value) => value.trim()), answerIndex: "ABCD".indexOf(match[6]), answer: match[7].trim(), correctFeedback: match[8].trim().replace(/^Correct\.\s*/, ""), incorrectFeedback: match[9].trim(), source: match[10].trim() });
  }
  const written = [];
  const writtenRaw = between(content, "\nWritten evidence\n", "\nSource boundary\n");
  for (const block of writtenRaw.split(/\n(?=Prompt: )/)) {
    const prompt = block.match(/^Prompt: ([^\n]+)/)?.[1]?.trim();
    const source = block.match(/\nSource: ([^\n]+)\s*$/)?.[1]?.trim();
    const responseBlock = block.match(/\nScaffold:\n([\s\S]*?)\nSource: /)?.[1];
    if (!prompt || !source || !responseBlock) continue;
    const parts = responseBlock.split(/\n\s*\n/).map((value) => value.trim()).filter(Boolean);
    const model = (parts.pop() || "").replace(/^Appropriate response example:\s*/, "").trim();
    if (parts.length && model) written.push({ prompt, scaffold: parts, model, source });
  }
  const boundary = content.split("\nSource boundary\n")[1]?.split("\nSources")[0]?.trim() || "Teacher to confirm unresolved practical details.";
  const verification = currentVerification[section.id] || { sources: [], note: "" };
  const sources = [...parseSources(content), ...verification.sources].filter((source, index, all) => all.findIndex((candidate) => candidate.url === source.url) === index);
  if (theory.length < 3 || takeaways.length < 3 || takeaways.length > 5 || checks.length !== 10 || written.length < 1) throw new Error(`Could not parse ${section.id}: theory=${theory.length}, takeaways=${takeaways.length}, checks=${checks.length}, written=${written.length}`);
  return { id: section.id, title: section.title, theory, takeaways, boundary, sources, verificationNote: verification.note, checks, written, authoringProvenance: section.authoringProvenance || null };
}

const handoffPath = (file) => {
  const recovered = path.join(recoveredHandoff, file);
  if (fs.existsSync(recovered)) return recovered;
  const upstream = path.join(upstreamHandoff, file);
  return fs.existsSync(upstream) ? upstream : null;
};

const modules = metadata.filter((item) => handoffPath(item.file)).map((item) => {
  const source = JSON.parse(fs.readFileSync(handoffPath(item.file), "utf8"));
  const sections = source.sections.map(parseSection);
  return {
    project: "Year 8 Agriculture",
    projectModule: item.module,
    cadence: "Teacher-adjustable two-week container",
    sourceLessonMinutes: source.sourceLessonMinutes || "50–65 minutes",
    title: item.title,
    summary: item.summary,
    sections: sections.map(({ checks, written, ...section }, theoryIndex) => {
      const visualRecord = visualRecords.find((record) => record.role === "theory_visual" && record.module === item.module && record.section === theoryIndex + 1);
      return {
        ...section,
        visual: {
          image: visualRecord?.relative_path || `assets/theory/theory-m${String(item.module).padStart(2, "0")}-s${String(theoryIndex + 1).padStart(2, "0")}.png`,
          alt: visualRecord?.alt || `Teaching visual supporting ${section.title}`,
          caption: visualRecord?.caption || `Teaching visual for ${section.title}. The adjacent theory and cited source control its meaning.`
        }
      };
    }),
    checks: sections.flatMap((section, theoryIndex) => section.checks.map((check) => ({ theoryIndex, question: check.question, options: check.options, answerIndex: check.answerIndex, correctFeedback: check.correctFeedback, incorrectFeedback: check.incorrectFeedback, source: check.source }))),
    written: sections.flatMap((section, theoryIndex) => section.written.map((entry, writtenIndex) => ({ theoryIndex, title: `${section.title} · Evidence ${writtenIndex + 1}`, prompt: entry.prompt, clarification: entry.scaffold.join(" "), model: entry.model, source: entry.source })))
  };
});

if (!modules.length) throw new Error(`No module handoffs found in ${upstreamHandoff} or ${recoveredHandoff}`);
const data = { shortTitle: "Year 8 Agriculture", fileSlug: "year-8-agriculture", storagePrefix: "year-8-agriculture", modules };
fs.writeFileSync(path.join(repo, "guided", "data.js"), `window.COURSE_DATA = ${JSON.stringify(data, null, 2)};\n`, "utf8");

const questionBank = {
  authoredVia: "Signed-in ChatGPT in the in-app browser, one named theory section at a time",
  generatedAt: new Date().toISOString(),
  sections: modules.flatMap((module) => module.sections.map((section, theoryIndex) => ({
    id: section.id,
    title: section.title,
    authoringProvenance: section.authoringProvenance,
    questions: module.checks.filter((check) => check.theoryIndex === theoryIndex).map((check) => ({ question: check.question, options: check.options, answerIndex: check.answerIndex, correctFeedback: check.correctFeedback, incorrectFeedback: check.incorrectFeedback, source: check.source }))
  })))
};
fs.writeFileSync(path.join(repo, "source-notes", "QUESTION-BANK.json"), `${JSON.stringify(questionBank, null, 2)}\n`, "utf8");
console.log(`Built ${modules.length} module(s), ${modules.flatMap((module) => module.sections).length} sections and ${modules.flatMap((module) => module.checks).length} checks.`);
