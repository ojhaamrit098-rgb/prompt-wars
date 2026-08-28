import { NextResponse } from 'next/server';
import { extractPdfTextFromBuffer } from '@/services/document/extractor';
import { buildCandidateProfile } from '@/services/profile/profile-builder';
import { runInitialPanel } from '@/services/orchestration/initial-panel';
import { runDebate } from '@/services/debate';
import { runFinalJudge } from '@/services/decision';
import { ExtractedDocument, DocumentType } from '@/types/document';
import { AgentReport } from '@/types/agent';
import { CandidateProfile } from '@/types/profile';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

async function fileToExtractedDocument(
  file: File,
  documentType: DocumentType
): Promise<ExtractedDocument> {
  const arrayBuffer = await file.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);
  const { totalPages, pages } = await extractPdfTextFromBuffer(uint8, file.name);

  const hasErrors = pages.some(p => p.extractionStatus === 'error');
  const allEmpty = pages.every(p => p.extractionStatus === 'empty');
  const status: 'success' | 'partial' | 'failed' =
    allEmpty || hasErrors ? (hasErrors ? 'failed' : 'partial') : 'success';

  return {
    id: crypto.randomUUID(),
    filename: file.name,
    documentType,
    candidate: 'candidate_a', // Single-candidate analysis
    totalPages,
    pages,
    status,
  };
}

export async function POST(req: Request) {
  console.log('[ANALYZE] Starting');
  try {
    const formData = await req.formData();

    const jobDescFile = formData.get('jobDescription') as File | null;
    const resumeFile = formData.get('resume') as File | null;
    const transcriptFile = formData.get('transcript') as File | null;

    if (!jobDescFile || !resumeFile || !transcriptFile) {
      return NextResponse.json(
        { error: 'All three documents are required: jobDescription, resume, transcript.' },
        { status: 400 }
      );
    }

    // Server-side validation: type and size
    for (const [label, file] of [
      ['jobDescription', jobDescFile],
      ['resume', resumeFile],
      ['transcript', transcriptFile],
    ] as [string, File][]) {
      if (file.type !== 'application/pdf') {
        return NextResponse.json(
          { error: `${label} must be a PDF file.` },
          { status: 400 }
        );
      }
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `${label} exceeds the 10 MB size limit.` },
          { status: 400 }
        );
      }
    }

    // Extract all three documents
    const [jobDescription, resume, transcript] = await Promise.all([
      fileToExtractedDocument(jobDescFile, 'job_description'),
      fileToExtractedDocument(resumeFile, 'resume'),
      fileToExtractedDocument(transcriptFile, 'transcript'),
    ]);

    console.log('[ANALYZE] PDF extraction complete');

    // Build the profile via Gemini
    const profileResult = await buildCandidateProfile({ jobDescription, resume, transcript });

    if (!profileResult.success) {
      console.error('[ANALYZE] Profile Builder failed:', profileResult.error);
      return NextResponse.json(
        { error: profileResult.error },
        { status: 502 }
      );
    }

    console.log('[ANALYZE] Profile Builder complete');

    const panelInput = {
      jobProfile: profileResult.data.jobProfile,
      candidateProfile: profileResult.data.candidateProfile as CandidateProfile,
      evidence: profileResult.data.evidence,
    };

    // Run Initial Panel
    const initialPanel = await runInitialPanel(panelInput);
    console.log('[ANALYZE] Initial Panel complete');

    // Run Debate
    const debateResult = await runDebate({
      jobProfile: panelInput.jobProfile,
      candidateProfile: panelInput.candidateProfile,
      evidence: panelInput.evidence,
      initialPanel,
    });
    console.log('[ANALYZE] Debate complete');
    
    // Extract successful initial reports for Final Judge
    const initialReports = Object.values(initialPanel)
      .filter((r): r is { success: true; report: AgentReport } => r.success)
      .map(r => r.report);

    // Run Final Judge
    const finalDecision = await runFinalJudge({
      jobProfile: panelInput.jobProfile,
      candidateProfile: panelInput.candidateProfile,
      initialReports,
      debate: debateResult,
      evidence: panelInput.evidence,
    });
    console.log('[ANALYZE] Final Judge complete');

    return NextResponse.json({
      success: true,
      result: {
        ...finalDecision,
        finalReports: debateResult.finalReports,
        debateTurns: debateResult.turns,
        candidateName: panelInput.candidateProfile.identity.name || 'Unknown Candidate',
      },
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected server error occurred.';
    console.error('[/api/analyze] Unexpected error:', error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
