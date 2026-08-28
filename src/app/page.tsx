"use client";

import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

type FileState = {
  jobDescription: File | null;
  resume: File | null;
  transcript: File | null;
};

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

export default function Home() {
  const [files, setFiles] = useState<FileState>({
    jobDescription: null,
    resume: null,
    transcript: null
  });
  
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [resultMetadata, setResultMetadata] = useState<any>(null);

  const handleFileChange = (field: keyof FileState, selectedFile: File | null) => {
    if (selectedFile && selectedFile.type !== 'application/pdf') {
      alert('Please upload a valid PDF file.');
      return;
    }
    setFiles(prev => ({ ...prev, [field]: selectedFile }));
    setStatus('idle');
    setErrorMessage('');
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, field: keyof FileState) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(field, e.dataTransfer.files[0]);
    }
  };

  const submitAnalysis = async () => {
    if (!files.jobDescription) { setErrorMessage("Please upload the job description."); return; }
    if (!files.resume) { setErrorMessage("Please upload the candidate's resume."); return; }
    if (!files.transcript) { setErrorMessage("Please upload the interview transcript."); return; }

    setStatus('uploading');
    setErrorMessage('');
    
    const formData = new FormData();
    formData.append('jobDescription', files.jobDescription);
    formData.append('resume', files.resume);
    formData.append('transcript', files.transcript);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        body: formData
      });
      
      const rawText = await res.text();
      console.log(`[ANALYZE HTTP ${res.status}] Response preview:`, rawText.slice(0, 500));

      let data: any;
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error(`Server returned invalid non-JSON response (HTTP ${res.status}). Preview: ${rawText.slice(0, 150)}`);
      }
      
      if (!res.ok) {
        throw new Error(data.error || `Analysis request failed (HTTP ${res.status})`);
      }
      
      setStatus('success');
      setResultMetadata(data.result);
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message || 'An error occurred while analyzing candidate.');
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30 overflow-hidden relative">
      {/* Background glow effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/20 blur-[120px] pointer-events-none" />
      
      <div className="relative z-10 max-w-5xl mx-auto px-6 py-16 flex flex-col items-center">
        
        <header className="text-center mb-16 space-y-4">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-br from-white to-slate-400 bg-clip-text text-transparent">
            Candidate Intelligence
          </h1>
          <p className="text-slate-400 max-w-2xl text-lg font-light">
            Upload the job description, candidate resume, and interview transcript to generate a multi-agent hiring evaluation.
          </p>
        </header>

        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <UploadCard 
            title="Job Description" 
            file={files.jobDescription}
            onFileSelect={(f) => handleFileChange('jobDescription', f)}
            onDrop={(e) => handleDrop(e, 'jobDescription')}
          />
          <UploadCard 
            title="Candidate Resume" 
            file={files.resume}
            onFileSelect={(f) => handleFileChange('resume', f)}
            onDrop={(e) => handleDrop(e, 'resume')}
          />
          <UploadCard 
            title="Interview Transcript" 
            file={files.transcript}
            onFileSelect={(f) => handleFileChange('transcript', f)}
            onDrop={(e) => handleDrop(e, 'transcript')}
          />
        </div>

        {errorMessage && (
          <div className="mb-8 flex items-center space-x-2 text-rose-400 bg-rose-500/10 px-4 py-3 rounded-xl border border-rose-500/20">
            <AlertCircle className="w-5 h-5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {status === 'success' && resultMetadata && (
          <div className="w-full max-w-5xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* 1. FINAL RECOMMENDATION */}
            <div className="bg-slate-900/50 border border-indigo-500/30 rounded-2xl p-8 backdrop-blur-md shadow-2xl">
              <div className="flex items-center space-x-3 mb-6 pb-6 border-b border-slate-800">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
                <h2 className="text-2xl font-bold text-white">Final Recommendation: {resultMetadata.candidateName}</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm uppercase tracking-wider text-slate-400 mb-2">Decision</h3>
                    <div className={`inline-flex items-center px-4 py-2 rounded-lg font-bold border ${
                      resultMetadata.decision === 'strong_hire' || resultMetadata.decision === 'hire' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                      resultMetadata.decision === 'borderline' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                      'bg-rose-500/20 text-rose-400 border-rose-500/30'
                    }`}>
                      {resultMetadata.decision.replace('_', ' ').toUpperCase()}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm uppercase tracking-wider text-slate-400 mb-2">Score</h3>
                    <div className="text-3xl font-light text-white">
                      {resultMetadata.score !== null ? resultMetadata.score : 'N/A'} <span className="text-lg text-slate-500">/ 10</span>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm uppercase tracking-wider text-slate-400 mb-2">Confidence</h3>
                    <div className="text-lg text-slate-300 capitalize">
                      {resultMetadata.confidence}
                    </div>
                  </div>
                </div>
                
                <div className="bg-slate-800/30 rounded-xl p-5 border border-slate-700/50">
                  <h3 className="text-sm uppercase tracking-wider text-slate-400 mb-3">Executive Summary</h3>
                  <p className="text-slate-300 leading-relaxed text-sm">
                    {resultMetadata.summary}
                  </p>
                </div>
              </div>
            </div>

            {/* 2. AGENT PANEL */}
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">Agent Panel</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {resultMetadata.finalReports && resultMetadata.finalReports.map((report: any) => (
                  <div key={report.agentType} className="bg-slate-800/20 border border-slate-700/50 rounded-xl p-6">
                    <div className="flex justify-between items-start mb-4 pb-4 border-b border-slate-700/30">
                      <div>
                        <h3 className="font-bold text-indigo-400 capitalize text-lg">{report.agentType.replace(/([A-Z])/g, ' $1').trim()} Agent</h3>
                        <div className="text-xs text-slate-500 mt-1">Confidence: <span className="text-slate-300 capitalize">{report.confidence}</span></div>
                      </div>
                      <div className="text-xl font-semibold text-white bg-slate-800 px-3 py-1 rounded-md">
                        {report.score?.value !== null ? report.score.value : 'N/A'}
                      </div>
                    </div>
                    
                    <p className="text-slate-300 text-sm mb-4 leading-relaxed line-clamp-3" title={report.overallAssessment}>
                      {report.overallAssessment}
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-xs uppercase tracking-wider text-emerald-400 mb-2">Strengths</h4>
                        <ul className="space-y-2">
                          {report.strengths.slice(0,2).map((s: any, i: number) => (
                            <li key={i} className="text-xs text-slate-400 flex items-start"><span className="text-emerald-500 mr-2">✓</span> <span className="line-clamp-2">{s.description}</span></li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-xs uppercase tracking-wider text-rose-400 mb-2">Concerns</h4>
                        <ul className="space-y-2">
                          {report.concerns.slice(0,2).map((c: any, i: number) => (
                            <li key={i} className="text-xs text-slate-400 flex items-start"><span className="text-rose-500 mr-2">!</span> <span className="line-clamp-2">{c.description}</span></li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. DEBATE & OPINION CHANGES */}
            {resultMetadata.opinionChanges && resultMetadata.opinionChanges.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-white mb-4">Debate & Opinion Changes</h2>
                <div className="bg-slate-900/40 border border-slate-700/50 rounded-xl overflow-hidden">
                  {resultMetadata.opinionChanges.map((change: any, i: number) => (
                    <div key={i} className="p-5 border-b border-slate-800 last:border-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="font-semibold text-indigo-300 capitalize">{change.agent} Agent</span>
                        {change.changed ? (
                          <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded">Changed Opinion ({change.initialScore} → {change.finalScore})</span>
                        ) : (
                          <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded">Maintained Position</span>
                        )}
                      </div>
                      <p className="text-sm text-slate-400 italic bg-slate-800/30 p-3 rounded-lg border border-slate-700/30">&quot;{change.reason}&quot;</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* 4. EVIDENCE */}
              <div>
                <h2 className="text-xl font-bold text-white mb-4">Key Evidence References</h2>
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {resultMetadata.evidence && resultMetadata.evidence.map((ev: any, i: number) => (
                    <div key={i} className="bg-slate-800/20 border border-slate-700/50 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-semibold px-2 py-1 bg-slate-700 rounded text-slate-300 uppercase tracking-wider">{ev.category}</span>
                        <span className="text-xs text-slate-400">{ev.sourceDocument} (Pg {ev.pageNumber})</span>
                      </div>
                      <blockquote className="text-sm text-slate-300 border-l-2 border-indigo-500/50 pl-3 italic">
                        &quot;{ev.quote}&quot;
                      </blockquote>
                    </div>
                  ))}
                  {(!resultMetadata.evidence || resultMetadata.evidence.length === 0) && (
                    <p className="text-sm text-slate-500 italic">No specific evidence references provided in the final report.</p>
                  )}
                </div>
              </div>

              {/* 5. UNKNOWNS / LIMITATIONS */}
              <div>
                <h2 className="text-xl font-bold text-white mb-4">Unknowns & Limitations</h2>
                <div className="bg-slate-900/30 border border-slate-700/50 rounded-xl p-5">
                  <ul className="space-y-3">
                    {resultMetadata.finalReports && resultMetadata.finalReports.flatMap((r:any) => r.unknowns).filter(Boolean).map((u: string, i: number) => (
                      <li key={i} className="flex items-start text-sm text-slate-400">
                        <span className="text-slate-500 mr-2">?</span>
                        <span>{u}</span>
                      </li>
                    ))}
                    {(!resultMetadata.finalReports || resultMetadata.finalReports.flatMap((r:any) => r.unknowns).length === 0) && (
                      <li className="text-sm text-slate-500 italic">No significant unknowns reported.</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>

          </div>
        )}

        <button
          onClick={submitAnalysis}
          disabled={status === 'uploading'}
          className={`
            group relative px-8 py-4 rounded-full font-semibold text-lg transition-all duration-300
            ${status === 'uploading' ? 'bg-indigo-600/50 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 hover:shadow-[0_0_30px_-5px_rgba(79,70,229,0.5)] active:scale-95'}
          `}
        >
          <div className="flex items-center space-x-3">
            {status === 'uploading' ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Processing documents...</span>
              </>
            ) : (
              <span>Analyze Candidate</span>
            )}
          </div>
        </button>

      </div>
    </main>
  );
}

function UploadCard({ 
  title, 
  file, 
  onFileSelect, 
  onDrop 
}: { 
  title: string, 
  file: File | null, 
  onFileSelect: (f: File | null) => void,
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <div 
      className={`
        relative flex flex-col items-center justify-center p-8 rounded-3xl border transition-all duration-300 backdrop-blur-xl group cursor-pointer
        ${file ? 'bg-indigo-900/20 border-indigo-500/50' : 'bg-slate-900/40 border-slate-800 hover:border-slate-600 hover:bg-slate-800/40'}
        ${isDragOver ? 'border-indigo-400 scale-105 bg-indigo-900/30' : ''}
      `}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => { setIsDragOver(false); onDrop(e); }}
    >
      <input 
        type="file" 
        accept=".pdf" 
        className="hidden" 
        ref={inputRef}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onFileSelect(e.target.files[0]);
          }
        }}
      />
      
      <div className={`
        w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-colors duration-300
        ${file ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-400 group-hover:text-slate-300'}
      `}>
        {file ? <FileText className="w-7 h-7" /> : <UploadCloud className="w-7 h-7" />}
      </div>
      
      <h3 className="font-semibold text-slate-200 mb-2 text-center">{title}</h3>
      
      {file ? (
        <div className="flex flex-col items-center text-center">
          <span className="text-sm text-indigo-300 truncate max-w-[200px]" title={file.name}>
            {file.name}
          </span>
          <span className="text-xs text-slate-500 mt-1">
            {(file.size / 1024 / 1024).toFixed(2)} MB
          </span>
          <button 
            onClick={(e) => { e.stopPropagation(); onFileSelect(null); }}
            className="text-xs text-slate-400 hover:text-rose-400 mt-3 transition-colors"
          >
            Remove
          </button>
        </div>
      ) : (
        <p className="text-sm text-slate-500 text-center">
          Click to upload or drag and drop <br/>
          <span className="text-xs opacity-70 mt-1 block">PDF only</span>
        </p>
      )}
    </div>
  );
}
