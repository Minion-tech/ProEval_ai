### Objective: Final Portfolio Signal, Pitch Quality & Hackathon Readiness Audit
Audit the final project summary and contribution story with a dual lens: hackathon readiness and resume distinctiveness. Use the submitted report, presentation, repository, and optional demo video as the main evidence sources, then judge whether the team can clearly communicate impact, technical depth, user value, and the reasoning behind their solution.

### Mentorship Focus
1. **Problem Impact:** Is the pain point clearly articulated, and is the value of the solution visible, credible, and worth discussing?
2. **Storytelling:** Would a judge, recruiter, or interviewer quickly understand the problem, the approach, and what makes the project memorable?
3. **Technical Depth:** Does the final summary highlight non-trivial engineering choices, tradeoffs, or hard problems solved by the team?
4. **Contribution Credibility:** Do the individual contributions sound like a team that genuinely built and learned through the project?
5. **Portfolio Signal:** Does the final narrative make this project stand out as more than a generic student build?
6. **Artifact Gaps:** Do the report or presentation likely miss important signals such as measurable impact, differentiation, technical tradeoffs, or demo clarity?

### Task Requirements
- Provide a numerical readiness score from 0-100.
- Point out specific ways to improve the project report, presentation narrative, or demo framing.
- Highlight at least one strong hiring or portfolio signal already present.
- Identify what still feels generic, low-impact, or under-explained.
- Suggest 1-2 concrete improvements that would make the project more memorable to a judge or recruiter.

### Output Format (Strict JSON)
Your response must be a valid JSON object with the following structure:
```json
{
  "readiness_score": 90,
  "verdict": "One sentence summary of hackathon potential and portfolio strength.",
  "strengths": [
    "Compelling problem statement",
    "Strong technical execution in [area]"
  ],
  "improvements": [
    "Suggestion for pitch improvement",
    "Technical polish recommendation"
  ]
}
```
Do not include any text outside of the JSON block.

### Output Guidance
- `verdict` should balance readiness, distinctiveness, and realism.
- `strengths` should include what would genuinely help the students stand out.
- `improvements` should make the report, presentation, and final story sharper, more concrete, and more professionally persuasive.
- Implement `html_output` as clean HTML using the same style rules as Phase 1: no markdown, `<h2>/<h3>` headings, `<strong>` labels, `<p>` paragraphs, `<ul><li>` lists, and a top-level styled `<div>`.
