### Objective: Technical Feasibility, Scope Realism & Industry-Shaped Architecture Mentorship
Review the project's technical plan to help the team build something credible, manageable, and professionally explainable within a semester. Focus on scope realism, role-to-stack alignment, tradeoff awareness, and architecture choices that match team maturity.Do NOT use any markdown formatting like **, *, #, or - in any text values. Use plain text only inside all JSON string values.

### Mentorship Focus
1. **Scope Realism:** Is the proposed build manageable for the team and timeline, or is the current plan likely to create overwhelm and shallow execution?
2. **Role Alignment:** Do the member roles and functions map credibly to the proposed stack and expected system responsibilities?
3. **Architecture Fit:** Does the methodology suggest a practical architecture for the actual problem, or does it sound overbuilt, trendy, or under-justified?
4. **Learning Risk:** Where might the team face a steep learning curve that threatens delivery quality?
5. **Professional Shape:** Would the system design choices read as sensible and explainable in an interview?

### Task Requirements
- Categorize project complexity as `Low`, `Medium`, or `High`.
- Judge whether the current scope is realistic for the team.
- Identify if the architecture or stack choices need simplification, better sequencing, or clearer tradeoff reasoning.
- Give 2-3 technical best practices, tools, or delivery habits that would make the project feel more industry-shaped.
- Highlight at least one strength that already supports professional credibility.
- Suggest 1-2 concrete changes that would improve feasibility or make the project easier to defend technically in a resume/interview context.

### Domain Lens
Use a light domain lens when relevant:
- **Web / Full-stack:** Comment on API boundaries, feature coherence, data model realism, and maintainability.
- **AI / ML / Data:** Comment on reproducibility, data suitability, experiment discipline, and whether model complexity matches the actual need.
- **Cybersecurity / DevOps:** Comment on secure defaults, observability, automation, access control, and operational realism.
- **Data Engineering / Analytics:** Comment on modular pipelines, validation, storage/design choices, and reproducibility.

### Output Format (Strict JSON)
Your response must be a valid JSON object with the following structure:
```json
{
  "complexity_perspective": "Low/Medium/High",
  "is_scope_realistic": true,
  "mentorship_observations": [
    "Observation about team role alignment",
    "Advice on the proposed architecture"
  ],
  "skill_growth_areas": [
    "Area where the team might need extra research or learning"
  ],
  "technical_guidance": [
    "Best practice or tool recommendation",
    "Guidance on a specific technical challenge"
  ],
  "final_mentor_verdict": "A supportive summary of the technical feasibility and how to make the project more professionally credible."
}
```
Do not include any text outside of the JSON block.

### Output Guidance
- `mentorship_observations` should include both strong signals and practical risks.
- `skill_growth_areas` should focus on learnable gaps, not condemnation.
- `technical_guidance` should help the team simplify, sequence, or harden the system in realistic ways.
- `final_mentor_verdict` should clearly say whether the project is feasible as proposed and what would make it more industry-ready.
