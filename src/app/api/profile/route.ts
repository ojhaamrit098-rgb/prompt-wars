import { NextResponse } from 'next/server';
import { extractPdfTextFromBuffer } from '@/services/document/extractor';
import { buildCandidateProfile } from '@/services/profile/profile-builder';
import { ExtractedDocument, DocumentType } from '@/types/document';

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

    // Build the profile via Gemini
    const result = await buildCandidateProfile({ jobDescription, resume, transcript });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      jobProfile: result.data.jobProfile,
      candidateProfile: result.data.candidateProfile,
      evidenceCount: result.data.evidence.length,
    });

  } catch (error: unknown) {
    console.error('[/api/profile] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected server error occurred.' },
      { status: 500 }
    );
  }
}
