import { NextResponse } from 'next/server';
import { ingestTestDocuments } from '@/services/document/ingestion';

export async function GET() {
  try {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
    }

    const result = await ingestTestDocuments();
    
    const formattedReport = result.documents.map(doc => {
      const needsOcr = doc.pages.some(p => p.ocrRequired);
      return {
        'Document': doc.filename,
        'Type': doc.documentType,
        'Candidate': doc.candidate,
        'Pages': doc.totalPages,
        'Text extracted': doc.status === 'success' ? 'YES' : (doc.status === 'partial' ? 'PARTIAL (OCR needed)' : 'NO'),
        'OCR Needed': needsOcr
      };
    });

    return NextResponse.json({
      success: result.success,
      errors: result.errors,
      report: formattedReport,
      rawDocuments: result.documents.map(d => ({
        filename: d.filename,
        pagesSample: d.pages.map(p => ({
          page: p.pageNumber,
          chars: p.characterCount,
          ocr: p.ocrRequired,
          snippet: p.text.substring(0, 100) + (p.text.length > 100 ? '...' : '')
        }))
      }))
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
