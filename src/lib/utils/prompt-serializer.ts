import { PanelInput } from '@/types/agent';

/**
 * Converts PanelInput into structured plain text sections for inclusion in
 * agent prompts. All four agents use the same serializer so they receive
 * identical factual context — only the persona instructions differ.
 */
export function serializePanelInput(input: PanelInput): string {
  const { jobProfile, candidateProfile, evidence } = input;

  const job = [
    '=== JOB PROFILE ===',
    jobProfile.title ? `Title: ${jobProfile.title}` : '',
    jobProfile.responsibilities.length
      ? `Responsibilities:\n${jobProfile.responsibilities.map(r => `  - ${r}`).join('\n')}`
      : '',
    jobProfile.requiredSkills.length
      ? `Required Skills:\n${jobProfile.requiredSkills.map(s => `  - ${s}`).join('\n')}`
      : '',
    jobProfile.preferredSkills.length
      ? `Preferred Skills:\n${jobProfile.preferredSkills.map(s => `  - ${s}`).join('\n')}`
      : '',
    jobProfile.requiredExperience ? `Required Experience: ${jobProfile.requiredExperience}` : '',
    jobProfile.preferredExperience ? `Preferred Experience: ${jobProfile.preferredExperience}` : '',
    jobProfile.educationRequirements.length
      ? `Education Requirements:\n${jobProfile.educationRequirements.map(e => `  - ${e}`).join('\n')}`
      : '',
    jobProfile.certifications.length
      ? `Certifications:\n${jobProfile.certifications.map(c => `  - ${c}`).join('\n')}`
      : '',
    jobProfile.otherRequirements.length
      ? `Other Requirements:\n${jobProfile.otherRequirements.map(r => `  - ${r}`).join('\n')}`
      : '',
  ]
    .filter(Boolean)
    .join('\n');

  const identity = [
    candidateProfile.identity.name ? `Name: ${candidateProfile.identity.name}` : '',
    candidateProfile.identity.email ? `Email: ${candidateProfile.identity.email}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const candidate = [
    '=== CANDIDATE PROFILE ===',
    identity,
    candidateProfile.skills.length
      ? `Skills:\n${candidateProfile.skills.map(s => `  - ${s}`).join('\n')}`
      : '',
    candidateProfile.education.length
      ? `Education:\n${candidateProfile.education.map(e => `  - ${e}`).join('\n')}`
      : '',
    candidateProfile.experience.length
      ? `Experience:\n${candidateProfile.experience.map(e => `  - ${e}`).join('\n')}`
      : '',
    candidateProfile.projects.length
      ? `Projects:\n${candidateProfile.projects.map(p => `  - ${p}`).join('\n')}`
      : '',
    candidateProfile.certifications.length
      ? `Certifications:\n${candidateProfile.certifications.map(c => `  - ${c}`).join('\n')}`
      : '',
    candidateProfile.resumeClaims.length
      ? `Resume Claims:\n${candidateProfile.resumeClaims
          .map(c => `  [${c.id}] (${c.category}) ${c.text}`)
          .join('\n')}`
      : '',
    candidateProfile.interviewClaims.length
      ? `Interview Claims:\n${candidateProfile.interviewClaims
          .map(c => `  [${c.id}] (${c.category}) ${c.text}`)
          .join('\n')}`
      : '',
    candidateProfile.relevantFacts.length
      ? `Relevant Facts:\n${candidateProfile.relevantFacts.map(f => `  - ${f}`).join('\n')}`
      : '',
  ]
    .filter(Boolean)
    .join('\n');

  const evidenceSection =
    evidence.length > 0
      ? [
          '=== EXTRACTED EVIDENCE ===',
          evidence
            .map(
              (e, i) =>
                `[E${i + 1}] Source: ${e.sourceDocument} (${e.documentType}, page ${e.pageNumber})\n` +
                `  Category: ${e.category}\n` +
                `  Quote: "${e.quote}"` +
                (e.context ? `\n  Context: ${e.context}` : ''),
            )
            .join('\n\n'),
        ].join('\n')
      : '=== EXTRACTED EVIDENCE ===\nNo evidence items were extracted.';

  return [job, candidate, evidenceSection].join('\n\n');
}

/** JSON output schema description reused in all four agent prompts. */
export const AGENT_JSON_SCHEMA_DESCRIPTION = `
Return ONLY a single valid JSON object with this exact structure. No markdown fences. No text before or after the JSON.

{
  "agentType": "<your agent type string>",
  "overallAssessment": "<one-paragraph honest assessment>",
  "score": {
    "value": <0–10 integer, or null if insufficient evidence>,
    "explanation": "<must explain score with specific evidence; never a bare number>",
    "evidence": [<evidence objects>]
  },
  "confidence": "<high | medium | low>",
  "strengths": [
    { "description": "<specific strength>", "evidence": [<evidence objects>] }
  ],
  "concerns": [
    {
      "description": "<specific concern>",
      "severity": "<confirmed_contradiction | strong_concern | possible_concern | insufficient_evidence | no_issue>",
      "evidence": [<evidence objects>]
    }
  ],
  "evidence": [<all evidence objects referenced in this report>],
  "unknowns": ["<thing that could not be determined from supplied material>"],
  "reasoningSummary": "<2–4 sentence evidence-based summary suitable for the UI>"
}

Each evidence object must have:
  candidate (string), sourceDocument (string), documentType (string),
  pageNumber (integer > 0), quote (non-empty string), category (string).

NEVER invent quotes, page numbers, skills, or facts.
If evidence is insufficient, set score.value to null and explain why.
`;
