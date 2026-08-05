import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import vm from "node:vm";

const repo = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(repo, file), "utf8");
const must = (condition, message) => { if (!condition) throw new Error(message); };

function walk(folder) {
  return fs.readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === ".git") return [];
    const full = path.join(folder, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const stalePatterns = [
  /Programmable Light/i,
  /programmable lamp/i,
  /PICAXE/i,
  /Arduino/i,
  /acrylic key.?tag/i,
  /Year 10 Metal(?:work)?/i,
  /BBQ(?: and Case)?/i,
  /Folding Camping Shovel/i,
  /year-10-metal/i,
  /80\s*(?:mm)?\s*(?:×|x)\s*50\s*mm/i,
  /Technology Mandatory 7-8 Syllabus \(2017\)/i
];
const textExtensions = new Set([".html", ".js", ".mjs", ".css", ".md", ".json", ".txt"]);
for (const file of walk(repo).filter((file) => textExtensions.has(path.extname(file).toLowerCase()))) {
  if (path.resolve(file) === path.resolve(import.meta.filename)) continue;
  const content = fs.readFileSync(file, "utf8");
  stalePatterns.forEach((pattern) => must(!pattern.test(content), `Stale sister-course content found in ${path.relative(repo, file)}: ${pattern}`));
  must(!/[ï¿½�]/.test(content), `Broken text encoding found in ${path.relative(repo, file)}.`);
}

const requiredFiles = [
  "index.html", "module.html", "folio.html",
  "guided/data.js", "guided/course.js", "guided/course.css",
  "assets/agriculture-hero.png",
  "source-notes/SOURCE-MAP.md", "source-notes/DRIVE-SOURCE-INVENTORY.csv",
  "source-notes/EVIDENCE-CONTRACT.json", "source-notes/EVIDENCE-SOURCE-STATUS.md",
  "source-notes/EVIDENCE-INPUT-PACK.md", "source-notes/FOLIO-INPUT-PACK.md",
  "source-notes/QUESTION-BANK.json", "source-notes/VISUAL-MANIFEST.json",
  "source-notes/VISUAL-SEMANTIC-AUDIT.md", "source-notes/CURRENT-CLAIMS-REGISTER.md",
  "source-notes/YOUTUBE-LEARNING-MANIFEST.json",
  ...Array.from({ length: 11 }, (_, moduleIndex) => Array.from({ length: 3 }, (_, sectionIndex) => `assets/theory/theory-m${String(moduleIndex + 1).padStart(2, "0")}-s${String(sectionIndex + 1).padStart(2, "0")}.png`)).flat(),
  ...Array.from({ length: 12 }, (_, index) => `assets/visuals/folio-card-${String(index + 1).padStart(2, "0")}.png`)
];
requiredFiles.forEach((file) => must(fs.existsSync(path.join(repo, file)), `Missing ${file}`));

const sourceMap = read("source-notes/SOURCE-MAP.md");
[
  "1jCfJPg6pE-r3lrmhyKSHBZGUzHz95fbP", "1Xs_4kwIpp1b-tNongrs2STuOo_GNnMkm",
  "15UNTx2i4r5e66rjd7G_iGd8wZC5Y08zO", "15cA9I42NUGGU_Gy7qwWa2YVsQ-huYAvm",
  "1jmrqyAZ3__VspZFGvD4U-6dTG19quund", "12LPf62Soqo6VPoxVmXGCAhYdWpIAciWE",
  "16QCQZ308ly_vdCf8LKq2sxLoZXI6buGD", "1Tq49cgdlYCqOFn3LornVrj_GscBzEYTg",
  "1Xz_6t3IJf69jUDi-FpfxqpB2qAJd4a04", "1J13TPCCt3Qpyj0ZF2rphYU1-08g4lNii",
  "1SLFs7rh_AUInJPYFNfCKer_R1g1n5_My", "1a8flVlZOpK7GJ3RHbOpS16rZIiEO4ry0",
  "15gcs28RgHFpczMgq8iN-46ShdJ4Ni3Zv", "18hxyX7_fBgGW4A2PpE56Q59gZCJKwYvM3Va0bOXj5hk"
].forEach((id) => must(sourceMap.includes(id), `Authorised source ${id} is missing from SOURCE-MAP.md.`));
must(sourceMap.includes("Technology 7–8 Syllabus (2023)") && sourceMap.includes("implemented from 2026"), "Current NESA syllabus authority is missing.");
must(/essentially blank|title slide/i.test(sourceMap), "Module 4 blank-title-slide limitation is missing.");
must(/Guernsey[\s\S]{0,200}Brown Swiss[\s\S]{0,200}Ayrshire/i.test(sourceMap), "Module 5 disputed dairy-image key is missing.");

const sandbox = { window: {} };
vm.runInNewContext(read("guided/data.js"), sandbox);
const course = sandbox.window.COURSE_DATA;
must(course && Array.isArray(course.modules), "Course data did not load.");
must(course.draft !== true, "Course data is still the draft stub.");
must(course.modules.length === 11, "Course must contain exactly 11 teacher-adjustable module containers.");
must(course.modules.every((module, index) => module.projectModule === index + 1), "Module order must preserve Drive packages 1-11.");
must(course.modules.every((module) => module.cadence === "Teacher-adjustable two-week container"), "Every module must label the two-week cadence as teacher-adjustable.");
must(course.modules.every((module) => module.sections.length === 3), "Every module must contain exactly three named theory sections.");
must(course.modules.flatMap((module) => module.sections).length === 33, "Course must contain exactly 33 named theory sections.");
must(course.modules.every((module) => module.checks.length === 30), "Every module must contain exactly 30 knowledge checks.");
must(course.modules.every((module) => module.sections.every((_, theoryIndex) => module.checks.filter((check) => check.theoryIndex === theoryIndex).length === 10)), "Every named theory section must contain exactly 10 knowledge checks.");
const allChecks = course.modules.flatMap((module) => module.checks);
must(allChecks.length === 330, "Course must contain exactly 330 knowledge checks.");
must(allChecks.every((check) => check.options.length === 4 && check.answerIndex >= 0 && check.answerIndex < 4), "Every knowledge check must contain four options and a valid answer index.");
must(allChecks.reduce((total, check) => total + check.options.length, 0) === 1320, "Course must contain exactly 1,320 knowledge-check options.");
must(allChecks.every((check) => check.question.trim() && check.correctFeedback.trim() && check.incorrectFeedback.trim()), "Every knowledge check must include useful feedback.");
must(course.modules.every((module) => module.sections.every((_, theoryIndex) => {
  const questions = module.checks.filter((check) => check.theoryIndex === theoryIndex).map((check) => check.question.trim().toLowerCase());
  return new Set(questions).size === 10;
})), "Each named section must contain 10 distinct question texts.");

const quizBan = /\b(?:TE4-[A-Z]+-01|outcome codes?|syllabus outcomes?|module|lesson plan|teacher|assessment (?:task|metadata|date|weighting)|task number|weighting|due date|total marks?|file names?|filename|folders?|Google Drive|source IDs?|programme labels?|website labels?)\b/i;
const imageIdentityBan = /(?:\b(?:which|what)\b.{0,80}\b(?:pictured|shown in (?:the|this) image)\b|\bidentify\b.{0,60}\b(?:image|photo))/i;
allChecks.forEach((check) => {
  const testedText = [check.question, ...check.options].join(" ");
  must(!quizBan.test(testedText), `Knowledge check tests prohibited admin or curriculum metadata: ${check.question}`);
  must(!imageIdentityBan.test(check.question) && !/\bimages?\s*(?:5|6|7)\b/i.test(testedText), `Knowledge check relies on unverified image identity: ${check.question}`);
});

const sections = course.modules.flatMap((module) => module.sections);
sections.forEach((section) => {
  const words = section.theory.join(" ").trim().split(/\s+/).length;
  must(words >= 250 && words <= 420, `${section.id} theory must contain 250-420 words; found ${words}.`);
  must(section.takeaways.length >= 3 && section.takeaways.length <= 5, `${section.id} must contain 3-5 key takeaways.`);
  must(section.boundary?.trim(), `${section.id} is missing a source boundary.`);
  must(section.visual?.image && section.visual?.alt && section.visual?.caption, `${section.id} is missing a complete visual record.`);
  must(fs.existsSync(path.join(repo, section.visual.image)), `${section.id} links to missing visual ${section.visual.image}.`);
});
const videoManifest = JSON.parse(read("source-notes/YOUTUBE-LEARNING-MANIFEST.json"));
const videos = sections.flatMap((section) => (section.videos || []).map((video) => ({ ...video, adjacentSectionId: section.id })));
must(videoManifest.status === "published", "YouTube learning manifest must record the authorised published state.");
must(videos.length === 2, "Year 8 Agriculture must contain exactly the two verified, theory-adjacent YouTube clips in this handoff.");
must(new Set(videos.map((video) => video.videoId)).size === videos.length, "YouTube learning clips must have unique video IDs.");
must(videos.every((video) => /^[A-Za-z0-9_-]{11}$/.test(video.videoId)), "Every YouTube clip must have a valid 11-character video ID.");
must(videos.every((video) => video.url === `https://www.youtube.com/watch?v=${video.videoId}`), "Every YouTube fallback URL must match its video ID.");
must(videos.every((video) => video.title?.trim() && video.channel?.trim() && video.watchFor?.trim() && video.fallback?.trim() && video.rationale?.trim() && video.sourceCheck?.trim() && video.relatedSourceUrl?.trim() && video.disclaimer?.trim()), "Every YouTube clip must include title/channel, watch prompt, no-video fallback, rationale, source check, related source and disclaimer.");
must(videos.some((video) => video.videoId === "02MubUjvEPM" && video.adjacentSectionId === "6.1"), "The milk-processing clip must remain adjacent to Why milk is processed.");
must(videos.some((video) => video.videoId === "9wlUCswEd0c" && video.adjacentSectionId === "8.2"), "The RIPPA clip must remain adjacent to Sensors, robotics and precision decisions.");
const written = course.modules.flatMap((module) => module.written);
must(written.length >= 33 && written.length <= 66, "Course must preserve at least one and no more than two grounded written-evidence tasks per section.");
must(written.every((item) => item.prompt?.trim() && item.model?.trim()), "Every written task must include a prompt and Appropriate response example.");

const questionBank = JSON.parse(read("source-notes/QUESTION-BANK.json"));
must(questionBank.authoredVia === "Signed-in ChatGPT in the in-app browser, one named theory section at a time", "Question-bank authoring provenance is missing.");
must(questionBank.sections?.length === 33, "Question bank must contain 33 named sections.");
must(questionBank.sections.every((section) => section.questions?.length === 10), "Every question-bank section must contain exactly 10 questions.");
must(questionBank.sections.reduce((total, section) => total + section.questions.length, 0) === 330, "Question bank must contain exactly 330 questions.");

const folio = read("folio.html");
must((folio.match(/class="card folio-card"/g) || []).length === 12, "Folio must contain exactly 12 evidence cards.");
must((folio.match(/class="folio-visual"/g) || []).length === 12, "Every folio card must include one visual hook.");
for (let index = 1; index <= 12; index += 1) must(folio.includes(`id="folio-card-${String(index).padStart(2, "0")}"`), `Missing folio card ${index}.`);
must(/Build a Beef Farm[\s\S]{0,300}(?:title slide|not a design brief)/i.test(folio), "Folio must expose the Module 4 source limitation.");
must(/(?:No current dimensioned[\s\S]{0,400}Teacher to confirm|Teacher to confirm[\s\S]{0,400}No current dimensioned)/i.test(folio), "Folio must gate missing plan and practical evidence.");
must(!/data-outcomes="[^"]*(?:TE4-DES-01|TE4-PPM-01|TE4-SAF-01)[^"]*"/.test(folio.replace(/data-outcomes="[^"]*only after separately confirmed[^"]*"/, "")), "Folio must not claim unsupported design, management or safe-practical evidence as complete.");

const courseScript = read("guided/course.js");
must(courseScript.includes("Print / Save PDF"), "Modules must include Print / Save PDF.");
must(courseScript.includes("localStorage"), "Course evidence must autosave in local browser storage.");
must(courseScript.includes("indexedDB"), "Folio photo evidence must use device-local IndexedDB persistence.");
must(courseScript.includes('target="_blank"') || courseScript.includes('visualLink.target = "_blank"'), "Teaching visuals must offer Open larger in a new tab.");
must(courseScript.includes("youtube-nocookie.com/embed/") && courseScript.includes("No embed or no YouTube?"), "YouTube learning must use privacy-enhanced embeds and retain a visible non-embed fallback.");

const claims = read("source-notes/CURRENT-CLAIMS-REGISTER.md");
must(claims.includes("Publication state: RELEASE-CLEAR"), "Current-claims register is not release-clear.");
must(!/\b(?:PENDING|UNVERIFIED|TO VERIFY)\b/i.test(claims), "Current-claims register contains an unresolved publication item.");
const visualAudit = read("source-notes/VISUAL-SEMANTIC-AUDIT.md");
must(!/\b(?:PENDING|REPLACE|REMOVE)\b/.test(visualAudit), "Visual semantic audit contains an unresolved item.");
const visualManifest = JSON.parse(read("source-notes/VISUAL-MANIFEST.json"));
const displayedVisuals = (visualManifest.assets || visualManifest.records || []).filter((record) => ["hero", "folio_card", "theory_visual"].includes(record.role));
must(displayedVisuals.length === 46, "Visual manifest must contain the hero, 12 folio cards and 33 theory visuals.");
displayedVisuals.forEach((record) => {
  const status = record.semantic_status ?? record.semanticStatus ?? record.semantic_audit;
  const assetPath = record.asset_path ?? record.path ?? record.relative_path;
  must(/^PASS\b/.test(status || ""), `Visual ${record.asset_id ?? record.id ?? assetPath} is not a semantic PASS.`);
  must(assetPath && fs.existsSync(path.join(repo, assetPath)), `Visual asset is missing: ${assetPath}.`);
  if (record.sha256) {
    const actual = crypto.createHash("sha256").update(fs.readFileSync(path.join(repo, assetPath))).digest("hex");
    must(actual.toLowerCase() === record.sha256.toLowerCase(), `Visual SHA-256 mismatch: ${assetPath}.`);
  }
  must((record.alt ?? record.alt_text)?.trim(), `Visual ${assetPath} is missing alt text.`);
  must(record.caption?.trim(), `Visual ${assetPath} is missing a caption.`);
});

for (const file of ["index.html", "module.html", "folio.html"]) {
  const html = read(file);
  must((html.match(/<h1\b/g) || []).length === 1, `${file} must contain exactly one H1.`);
  for (const match of html.matchAll(/(?:href|src)="([^"#?]+)(?:\?[^"#]*)?"/g)) {
    const target = match[1];
    if (/^(?:https?:|mailto:|data:)/.test(target)) continue;
    must(fs.existsSync(path.resolve(repo, path.dirname(file), target)), `${file} links to missing ${target}.`);
  }
}

const studentSurface = [read("index.html"), read("module.html"), folio, read("guided/data.js")].join("\n");
must(!/\b(?:TE4-MSC-01|TE4-DIG-0[12])\b/.test(studentSurface), "Student surface claims an outcome not directly aligned by the current source contract.");
must(!/\b(?:task number|weighting|due date|total marks?)\s*[:=]?\s*\d/i.test(studentSurface), "Student surface contains unsupported formal assessment values.");
must(!/formal(?:ly)? authorised 22-week|authorised 22-week programme/i.test(studentSurface), "Student surface overstates the inferred 22-week container sequence.");

console.log("Course validation passed: 11 modules, 33 theory sections, 330 student-learning checks and 12 folio cards.");
