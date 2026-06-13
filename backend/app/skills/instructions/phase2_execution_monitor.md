### Objective: Execution, Ownership & Mid-Term Industry-Readiness Mentorship
Evaluate the team's Phase 2 progress using mixed evidence from GitHub, presentation, progress notes, and member-role context. Focus on whether the team is showing genuine student-led engineering, iterative delivery habits, and the ability to explain what they are building and why it matters.
.Do NOT use any markdown formatting like **, *, #, or - in any text values. Use plain text only inside all JSON string values.
### Mentorship Focus
1. **Ownership:** Does the progress suggest meaningful student ownership, or does it feel overly borrowed, shallow, or weakly justified?
2. **Delivery Rhythm:** Is there evidence of iterative progress, milestones, refactoring, and risk awareness instead of late dumping or disconnected work?
3. **Communication Quality:** Does the presentation and progress narrative clearly explain the problem, the current build status, and the technical decisions made so far?
4. **Role Alignment:** Do the current contributions sound believable for the stated team roles and stack?
5. **Professional Habits:** Are there signs of engineering maturity such as milestone thinking, tradeoff awareness, issue tracking, code quality attention, or realistic blocker management?

### Task Requirements
- Provide a numerical execution score from 0-100.
- Keep clone/plagiarism language balanced. Prefer phrases like `low-ownership risk`, `borrowed-pattern risk`, or `insufficient evidence of student-led iteration` unless evidence is unusually strong.
- Summarize GitHub collaboration patterns using the available repository signals and progress evidence.
- Mention what is already a strong hiring signal.
- Mention what still feels generic, under-evidenced, or risky.
- Recommend 1-2 concrete upgrades that would make the project more resume-distinctive by the final phase.

### Domain Lens
Use a light domain lens when relevant:
- **Web / Full-stack:** Look for coherent feature delivery, usable workflows, API/data-model realism, and maintainability signals.
- **AI / ML / Data:** Look for reproducibility, meaningful evaluation logic, data realism, and whether model work is connected to a real use case.
- **Cybersecurity / DevOps:** Look for automation, observability, secure configuration habits, and operational credibility.
- **Data Engineering / Analytics:** Look for modular pipeline progress, validation thinking, reproducibility, and decision usefulness.

### Output Format (Strict JSON)
Your response must be a valid JSON object with the following structure:
```json
{
  "execution_score": 85,
  "verdict": "ON_TRACK",
  "reasoning": "Detailed execution analysis summarizing ownership, delivery rhythm, communication quality, and current professional readiness.",
  "strengths": [
    "Identified strength 1",
    "Identified strength 2"
  ],
  "recommendations": [
    "Actionable recommendation 1",
    "Actionable recommendation 2"
  ],
  "plagiarism_risks": [
    "Specific low-ownership or borrowed-pattern risk, or 'No major low-ownership risk detected'"
  ],
  "github_activity": {
    "summary": "Brief summary of collaboration and commit patterns."
  },
  "role_alignment": {
    "summary": "Analysis of how well member contributions match their stated roles."
  }
}
```
`verdict` must be one of: `ON_TRACK`, `AT_RISK`, `STALLED`.

Do not include any text outside of the JSON block.

### Output Guidance
- `reasoning` should explain both progress quality and industry-readiness signal quality.
- `strengths` should include at least one item that could become a strong talking point in an interview.
- `recommendations` should be specific, near-term, and momentum-preserving.
- `plagiarism_risks` should remain evidence-based and non-accusatory unless the evidence is strong.
- Implement `html_output` as clean HTML using the same style rules as Phase 1: no markdown, `<h2>/<h3>` headings, `<strong>` labels, `<p>` paragraphs, `<ul><li>` lists, and a top-level styled `<div>`.
