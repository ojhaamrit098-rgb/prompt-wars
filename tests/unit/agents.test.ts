import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentReportSchema } from '../../src/validation/agent.schema';
import { TECHNICAL_AGENT_PERSONA } from '../../src/prompts/technical.prompt';
import { HR_AGENT_PERSONA } from '../../src/prompts/hr.prompt';
import { HIRING_MANAGER_PERSONA } from '../../src/prompts/hiring-manager.prompt';
import { SKEPTIC_AGENT_PERSONA } from '../../src/prompts/skeptic.prompt';
import type { PanelInput, AgentReport } from '../../src/types/agent';

// ─── Shared Fixtures ──────────────────────────────────────────────────────────

const sampleEvidence = {
  candidate: 'candidate_a' as const,
  sourceDocument: 'resume',
  documentType: 'resume' as const,
  pageNumber: 1,
  quote: 'Led a migration of legacy monolith to microservices.',
  category: 'experience',
};

const samplePanelInput: PanelInput = {
  jobProfile: {
    title: 'Senior Software Engineer',
    responsibilities: ['Design scalable systems', 'Lead technical discussions'],
    requiredSkills: ['TypeScript', 'Node.js', 'PostgreSQL'],
    preferredSkills: ['Kubernetes', 'GraphQL'],
    requiredExperience: '5+ years of software engineering',
    educationRequirements: ["Bachelor's in Computer Science or equivalent"],
    certifications: [],
    otherRequirements: [],
  },
  candidateProfile: {
    candidateId: 'candidate_a',
    identity: { name: 'Jane Doe' },
    skills: ['TypeScript', 'Node.js'],
    education: ["BSc Computer Science, MIT 2018"],
    experience: ['3 years at Acme Corp as Backend Engineer'],
    projects: ['Open-source CLI tool with 500+ GitHub stars'],
    certifications: [],
    resumeClaims: [
      {
        id: 'rc-1',
        text: 'Led a migration of legacy monolith to microservices.',
        source: 'resume',
        category: 'experience',
        evidenceReferences: [sampleEvidence],
      },
    ],
    interviewClaims: [
      {
        id: 'ic-1',
        text: 'Described the service mesh pattern used during migration.',
        source: 'interview',
        category: 'experience',
        evidenceReferences: [{ ...sampleEvidence, sourceDocument: 'transcript', documentType: 'transcript' }],
      },
    ],
    relevantFacts: ['Available immediately'],
    evidenceReferences: [sampleEvidence],
  },
  evidence: [sampleEvidence],
};

function makeValidReport(agentType: AgentReport['agentType']): AgentReport {
  return {
    agentType,
    overallAssessment: `Assessment from ${agentType} agent.`,
    score: {
      value: 7,
      explanation: 'Candidate demonstrated relevant experience in the interview.',
      evidence: [sampleEvidence],
    },
    confidence: 'medium',
    strengths: [{ description: 'Strong TypeScript background.', evidence: [sampleEvidence] }],
    concerns: [{ description: 'Limited Kubernetes experience.', severity: 'possible_concern', evidence: [] }],
    evidence: [sampleEvidence],
    unknowns: ['Did not address PostgreSQL experience directly.'],
    reasoningSummary: 'Overall the candidate shows solid fundamentals but some gaps remain.',
  };
}

// ─── 1. Prompt Content Checks (prove 4 separate personas exist) ───────────────

describe('Agent Persona Prompts', () => {
  it('Technical prompt is focused on technical skills', () => {
    expect(TECHNICAL_AGENT_PERSONA).toContain('TECHNICAL AGENT');
    expect(TECHNICAL_AGENT_PERSONA).toContain('technical skills');
    // Technical prompt must NOT have HR-specific behavioral evaluation language
    expect(TECHNICAL_AGENT_PERSONA.toLowerCase()).not.toContain('behavioral and workplace');
    expect(TECHNICAL_AGENT_PERSONA.toLowerCase()).not.toContain('hr and behavioral interviewer');
  });

  it('HR prompt is focused on behavior and culture', () => {
    expect(HR_AGENT_PERSONA).toContain('HR / CULTURE AGENT');
    expect(HR_AGENT_PERSONA).toContain('behavioral');
    // HR prompt must NOT have technical evaluation language
    expect(HR_AGENT_PERSONA.toLowerCase()).not.toContain('programming languages');
    expect(HR_AGENT_PERSONA.toLowerCase()).not.toContain('architecture and system design');
  });

  it('Hiring Manager prompt is focused on role fit', () => {
    expect(HIRING_MANAGER_PERSONA).toContain('HIRING MANAGER AGENT');
    expect(HIRING_MANAGER_PERSONA).toContain('role fit');
  });

  it('Skeptic prompt is focused on contradictions and verification', () => {
    expect(SKEPTIC_AGENT_PERSONA).toContain('SKEPTIC AGENT');
    expect(SKEPTIC_AGENT_PERSONA).toContain('contradiction');
    expect(SKEPTIC_AGENT_PERSONA).toContain('confirmed_contradiction');
  });

  it('All four persona strings are distinct', () => {
    const personas = [TECHNICAL_AGENT_PERSONA, HR_AGENT_PERSONA, HIRING_MANAGER_PERSONA, SKEPTIC_AGENT_PERSONA];
    const unique = new Set(personas);
    expect(unique.size).toBe(4);
  });
});

// ─── 2. AgentReportSchema Validation ─────────────────────────────────────────

describe('AgentReportSchema', () => {
  it('accepts a valid agent report', () => {
    const result = AgentReportSchema.safeParse(makeValidReport('technical'));
    expect(result.success).toBe(true);
  });

  it('accepts a null score when evidence is insufficient', () => {
    const report = {
      ...makeValidReport('hr'),
      score: { value: null, explanation: 'Insufficient evidence to score.', evidence: [] },
    };
    const result = AgentReportSchema.safeParse(report);
    expect(result.success).toBe(true);
  });

  it('rejects a score value above 10', () => {
    const report = { ...makeValidReport('technical'), score: { ...makeValidReport('technical').score, value: 11 } };
    const result = AgentReportSchema.safeParse(report);
    expect(result.success).toBe(false);
  });

  it('rejects a score with no explanation', () => {
    const report = { ...makeValidReport('technical'), score: { value: 7, explanation: '', evidence: [] } };
    const result = AgentReportSchema.safeParse(report);
    expect(result.success).toBe(false);
  });

  it('rejects an invalid concern severity', () => {
    const report = {
      ...makeValidReport('skeptic'),
      concerns: [{ description: 'test', severity: 'very_bad', evidence: [] }],
    };
    const result = AgentReportSchema.safeParse(report);
    expect(result.success).toBe(false);
  });

  it('accepts all valid concern severity values', () => {
    const severities = ['confirmed_contradiction', 'strong_concern', 'possible_concern', 'insufficient_evidence', 'no_issue'] as const;
    for (const severity of severities) {
      const report = {
        ...makeValidReport('skeptic'),
        concerns: [{ description: 'test', severity, evidence: [] }],
      };
      const result = AgentReportSchema.safeParse(report);
      expect(result.success).toBe(true);
    }
  });

  it('rejects an agent report with an invalid agentType', () => {
    const report = { ...makeValidReport('technical'), agentType: 'executive' };
    const result = AgentReportSchema.safeParse(report);
    expect(result.success).toBe(false);
  });

  it('rejects evidence with an empty quote', () => {
    const badEvidence = { ...sampleEvidence, quote: '' };
    const report = { ...makeValidReport('technical'), evidence: [badEvidence] };
    const result = AgentReportSchema.safeParse(report);
    expect(result.success).toBe(false);
  });
});

// ─── 3. Individual Agent Functions (mocked LLM) ───────────────────────────────

vi.mock('../../src/lib/ai/gemini', () => ({
  generateText: vi.fn(),
}));

describe('runTechnicalAgent', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('returns success when LLM returns valid JSON', async () => {
    const { generateText } = await import('../../src/lib/ai/gemini');
    vi.mocked(generateText).mockResolvedValueOnce(JSON.stringify(makeValidReport('technical')));
    const { runTechnicalAgent } = await import('../../src/agents/technical.agent');
    const result = await runTechnicalAgent(samplePanelInput);
    expect(result.success).toBe(true);
    if (result.success) expect(result.report.agentType).toBe('technical');
  });

  it('returns failure when LLM returns invalid JSON', async () => {
    const { generateText } = await import('../../src/lib/ai/gemini');
    vi.mocked(generateText).mockResolvedValueOnce('not json at all');
    const { runTechnicalAgent } = await import('../../src/agents/technical.agent');
    const result = await runTechnicalAgent(samplePanelInput);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.agentType).toBe('technical');
  });

  it('returns failure when LLM throws', async () => {
    const { generateText } = await import('../../src/lib/ai/gemini');
    vi.mocked(generateText).mockRejectedValueOnce(new Error('Quota exceeded'));
    const { runTechnicalAgent } = await import('../../src/agents/technical.agent');
    const result = await runTechnicalAgent(samplePanelInput);
    expect(result.success).toBe(false);
  });

  it('makes exactly one LLM call per run', async () => {
    const { generateText } = await import('../../src/lib/ai/gemini');
    vi.mocked(generateText).mockResolvedValueOnce(JSON.stringify(makeValidReport('technical')));
    const { runTechnicalAgent } = await import('../../src/agents/technical.agent');
    await runTechnicalAgent(samplePanelInput);
    expect(vi.mocked(generateText)).toHaveBeenCalledTimes(1);
  });
});

describe('runHRAgent', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('returns success with valid JSON', async () => {
    const { generateText } = await import('../../src/lib/ai/gemini');
    vi.mocked(generateText).mockResolvedValueOnce(JSON.stringify(makeValidReport('hr')));
    const { runHRAgent } = await import('../../src/agents/hr.agent');
    const result = await runHRAgent(samplePanelInput);
    expect(result.success).toBe(true);
    if (result.success) expect(result.report.agentType).toBe('hr');
  });

  it('isolates failure with agentType hr', async () => {
    const { generateText } = await import('../../src/lib/ai/gemini');
    vi.mocked(generateText).mockRejectedValueOnce(new Error('Network error'));
    const { runHRAgent } = await import('../../src/agents/hr.agent');
    const result = await runHRAgent(samplePanelInput);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.agentType).toBe('hr');
  });
});

describe('runHiringManagerAgent', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('returns success with valid JSON', async () => {
    const { generateText } = await import('../../src/lib/ai/gemini');
    vi.mocked(generateText).mockResolvedValueOnce(JSON.stringify(makeValidReport('hiringManager')));
    const { runHiringManagerAgent } = await import('../../src/agents/hiring-manager.agent');
    const result = await runHiringManagerAgent(samplePanelInput);
    expect(result.success).toBe(true);
    if (result.success) expect(result.report.agentType).toBe('hiringManager');
  });
});

describe('runSkepticAgent', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('returns success with valid JSON', async () => {
    const { generateText } = await import('../../src/lib/ai/gemini');
    vi.mocked(generateText).mockResolvedValueOnce(JSON.stringify(makeValidReport('skeptic')));
    const { runSkepticAgent } = await import('../../src/agents/skeptic.agent');
    const result = await runSkepticAgent(samplePanelInput);
    expect(result.success).toBe(true);
    if (result.success) expect(result.report.agentType).toBe('skeptic');
  });
});

// ─── 4. Independence & Orchestration Tests ────────────────────────────────────

describe('runInitialPanel — independence & isolation', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('makes exactly 4 separate LLM calls', async () => {
    const { generateText } = await import('../../src/lib/ai/gemini');
    vi.mocked(generateText)
      .mockResolvedValueOnce(JSON.stringify(makeValidReport('technical')))
      .mockResolvedValueOnce(JSON.stringify(makeValidReport('hr')))
      .mockResolvedValueOnce(JSON.stringify(makeValidReport('hiringManager')))
      .mockResolvedValueOnce(JSON.stringify(makeValidReport('skeptic')));
    const { runInitialPanel } = await import('../../src/services/orchestration/initial-panel');
    await runInitialPanel(samplePanelInput);
    expect(vi.mocked(generateText)).toHaveBeenCalledTimes(4);
  });

  it('each LLM call contains the job profile but NOT another agent report', async () => {
    const capturedPrompts: string[] = [];
    const { generateText } = await import('../../src/lib/ai/gemini');
    vi.mocked(generateText).mockImplementation(async (prompt: string) => {
      capturedPrompts.push(prompt);
      const idx = capturedPrompts.length - 1;
      const types = ['technical', 'hr', 'hiringManager', 'skeptic'] as const;
      return JSON.stringify(makeValidReport(types[idx]!));
    });

    const { runInitialPanel } = await import('../../src/services/orchestration/initial-panel');
    await runInitialPanel(samplePanelInput);

    expect(capturedPrompts).toHaveLength(4);
    for (const prompt of capturedPrompts) {
      // Must contain job and candidate context
      expect(prompt).toContain('Senior Software Engineer'); // job title
      expect(prompt).toContain('Jane Doe'); // candidate name

      // Must NOT contain outputs from other agents
      expect(prompt).not.toContain('"overallAssessment": "Assessment from technical');
      expect(prompt).not.toContain('"overallAssessment": "Assessment from hr');
      expect(prompt).not.toContain('"overallAssessment": "Assessment from hiringManager');
      expect(prompt).not.toContain('"overallAssessment": "Assessment from skeptic');
    }
  });

  it('each agent uses a different persona in its prompt', async () => {
    const capturedPrompts: string[] = [];
    const { generateText } = await import('../../src/lib/ai/gemini');
    vi.mocked(generateText).mockImplementation(async (prompt: string) => {
      capturedPrompts.push(prompt);
      const idx = capturedPrompts.length - 1;
      const types = ['technical', 'hr', 'hiringManager', 'skeptic'] as const;
      return JSON.stringify(makeValidReport(types[idx]!));
    });

    const { runInitialPanel } = await import('../../src/services/orchestration/initial-panel');
    await runInitialPanel(samplePanelInput);

    expect(capturedPrompts[0]).toContain('TECHNICAL AGENT');
    expect(capturedPrompts[1]).toContain('HR / CULTURE AGENT');
    expect(capturedPrompts[2]).toContain('HIRING MANAGER AGENT');
    expect(capturedPrompts[3]).toContain('SKEPTIC AGENT');
  });

  it('one agent failing does NOT affect the other three', async () => {
    const { generateText } = await import('../../src/lib/ai/gemini');
    vi.mocked(generateText)
      .mockResolvedValueOnce(JSON.stringify(makeValidReport('technical')))
      .mockResolvedValueOnce(JSON.stringify(makeValidReport('hr')))
      .mockRejectedValueOnce(new Error('API quota exceeded'))  // hiringManager fails
      .mockResolvedValueOnce(JSON.stringify(makeValidReport('skeptic')));

    const { runInitialPanel } = await import('../../src/services/orchestration/initial-panel');
    const result = await runInitialPanel(samplePanelInput);

    expect(result.technical.success).toBe(true);
    expect(result.hr.success).toBe(true);
    expect(result.hiringManager.success).toBe(false);
    expect(result.skeptic.success).toBe(true);

    if (!result.hiringManager.success) {
      expect(result.hiringManager.agentType).toBe('hiringManager');
      expect(result.hiringManager.error).toBeTruthy();
    }
  });

  it('all four agents failing returns four structured failure states', async () => {
    const { generateText } = await import('../../src/lib/ai/gemini');
    vi.mocked(generateText).mockRejectedValue(new Error('Service down'));

    const { runInitialPanel } = await import('../../src/services/orchestration/initial-panel');
    const result = await runInitialPanel(samplePanelInput);

    expect(result.technical.success).toBe(false);
    expect(result.hr.success).toBe(false);
    expect(result.hiringManager.success).toBe(false);
    expect(result.skeptic.success).toBe(false);
  });

  it('returns all four reports when all agents succeed', async () => {
    const { generateText } = await import('../../src/lib/ai/gemini');
    vi.mocked(generateText)
      .mockResolvedValueOnce(JSON.stringify(makeValidReport('technical')))
      .mockResolvedValueOnce(JSON.stringify(makeValidReport('hr')))
      .mockResolvedValueOnce(JSON.stringify(makeValidReport('hiringManager')))
      .mockResolvedValueOnce(JSON.stringify(makeValidReport('skeptic')));

    const { runInitialPanel } = await import('../../src/services/orchestration/initial-panel');
    const result = await runInitialPanel(samplePanelInput);

    expect(result.technical.success).toBe(true);
    expect(result.hr.success).toBe(true);
    expect(result.hiringManager.success).toBe(true);
    expect(result.skeptic.success).toBe(true);

    if (result.technical.success) {
      expect(result.technical.report.evidence).toContainEqual(sampleEvidence);
    }
  });

  it('evidence is preserved in a successful agent report', async () => {
    const { generateText } = await import('../../src/lib/ai/gemini');
    const reportWithEvidence = {
      ...makeValidReport('technical'),
      evidence: [sampleEvidence],
    };
    vi.mocked(generateText).mockResolvedValue(JSON.stringify(reportWithEvidence));

    const { runTechnicalAgent } = await import('../../src/agents/technical.agent');
    const result = await runTechnicalAgent(samplePanelInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.report.evidence.length).toBeGreaterThan(0);
      expect(result.report.evidence[0]!.quote).toBe(sampleEvidence.quote);
    }
  });
});
