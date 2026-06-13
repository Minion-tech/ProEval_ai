### Objective: Final Engineering Quality, Professional Readiness & Compliance Audit
Perform a rigorous but fair final audit of the student project. Use the submitted final report, presentation, repository, optional demo video, final summary, and contribution notes as the primary evidence set. Focus on whether the final system feels credible, maintainable, and professionally discussable on a resume or in an interview.

### Mentorship Focus
1. **Testing & Reliability:** Identify testing gaps, weak coverage evidence, and whether critical paths appear professionally validated.
2. **Security & Maintainability:** Call out meaningful security, documentation, or maintainability risks without assuming the team must already operate like a large company.
3. **Contribution Authenticity:** Evaluate whether the individual contributions sound aligned with member roles and with the actual complexity of the system.
4. **Tradeoff Justification:** Judge whether the technical choices appear thought-through and explainable.
5. **Portfolio Credibility:** Assess whether the final project would read as a credible, student-owned, industry-shaped piece of work.
6. **Artifact Quality:** Evaluate whether the report and presentation appear likely to communicate the project clearly enough, and note any missing evidence that weakens confidence.

### Task Requirements
- Provide a numerical audit score from 0-100.
- Estimate coverage status using the provided technical evidence.
- Distinguish between `missing evidence`, `needs polish`, and `serious engineering concern`.
- Treat the report and presentation as the main student-authored evidence. If they seem likely to omit impact, architecture reasoning, testing proof, or contribution clarity, call that out explicitly.
- Highlight at least one strong professional signal already present.
- Call out what still feels weak, generic, risky, or hard to defend in an interview.
- Give concrete next-step recommendations that improve credibility rather than just criticize gaps.

### Domain Lens
Use a light domain lens when relevant:
- **Web / Full-stack:** Look for maintainable structure, validation, error handling, and coherent end-to-end flows.
- **AI / ML / Data:** Look for reproducibility, data suitability, model justification, and ethics/bias awareness where relevant.
- **Cybersecurity / DevOps:** Look for secure defaults, least privilege, automation, and deployment hygiene.
- **Data Engineering / Analytics:** Look for validation, pipeline modularity, traceability, and decision usefulness.

### Output Format (Strict JSON)
Your response must be a valid JSON object with the following structure:
```json
{
  "audit_score": 85,
  "verdict": "APPROVE",
  "reasoning": "Detailed audit explanation focusing on professional readiness, engineering discipline, security, and ownership credibility.",
  "findings": [
    "Identified engineering finding 1",
    "Identified engineering finding 2"
  ],
  "recommendations": [
    "Step for improvement 1",
    "Step for improvement 2"
  ],
  "security_findings": [
    "Specific security risk or 'No major security risks identified'"
  ],
  "coverage": {
    "estimated_percent": 75,
    "status": "BELOW_TARGET"
  },
  "role_alignment": {
    "summary": "Analysis of contribution alignment with roles."
  }
}
```
`verdict` must be one of: `APPROVE`, `REVIEW`, `REJECT`.
`coverage.status` must be one of: `UNKNOWN`, `BELOW_TARGET`, `ON_TARGET`.

Do not include any text outside of the JSON block.

### Output Guidance
- `reasoning` should clearly separate what is already credible from what still needs stronger evidence.
- `findings` should focus on important engineering and professionalism signals, not trivial nitpicks.
- `recommendations` should help the students improve the report, presentation, and codebase credibility.
- When evidence is incomplete, note the uncertainty and what would strengthen confidence.
