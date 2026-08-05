# Year 8 Agriculture guided course

A Stage 4 guided-learning website governed by the NSW **Technology 7–8 Syllabus (2023)**, implemented from 2026.

The authorised Agriculture Drive folder is the primary course authority. Its Year 8/2026 folder supplies 11 numbered lesson packages covering agriculture, food security, beef, dairy, horticulture, pork and poultry. The website presents each supplied lesson as the anchor of a teacher-adjustable two-week integration container; this 22-week scaffold is not a formally authorised programme. Missing practical, animal-care, local safety, project-plan, assessment and submission requirements remain **Teacher to confirm**.

## Student routes

- `index.html` — course landing page and eleven-module pathway
- `module.html?module=1` through `module.html?module=11` — three named theory sections, exactly ten source-grounded student-learning checks per section, and written evidence
- `folio.html` — exactly 12 locally autosaving evidence records, JSON backup/restore and 12-page Print / Save PDF

## Local build and checks

```powershell
node scripts/build-data.mjs
node scripts/validate-course.mjs
node scripts/serve.mjs
```

The content build reads bounded Module 1–11 handoffs authored in signed-in ChatGPT one named theory section at a time. The release validator checks counts, student-learning question quality, source coverage, stale scaffold content, outcome mapping, visual records, plan status and local links.

Browser storage is specific to the current browser, profile and device. It is evidence preparation, not cloud submission.
