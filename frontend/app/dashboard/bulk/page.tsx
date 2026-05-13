'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { notificationService, NotificationTemplate } from '@/services/notification.service';
import { Button } from '@/components/retroui/Button';
import { ChevronLeft, Upload, FileText, CheckCircle2, AlertCircle, RefreshCw, Activity, Layers } from 'lucide-react';
import useSWR from 'swr';
import { io } from 'socket.io-client';

interface BulkJob {
  jobId: string;
  total: number;
  processed: number;
  successful: number;
  failed: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
}

export default function BulkUploadPage() {
  const router = useRouter();
  const { data: templates = [] } = useSWR('templates', () => notificationService.getTemplates());
  
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [activeJobs, setActiveJobs] = useState<BulkJob[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    let userId = '';
    if (userStr) {
      try { userId = JSON.parse(userStr).userId; } catch (e) {}
    }

    const socket = io('http://localhost:3001/notifications');
    
    socket.on('connect', () => {
      console.log('📦 Bulk connected to notifications gateway');
      if (userId) {
        socket.emit('subscribe', { userId });
      }
    });

    // Note: We are no longer fetching existing jobs on mount to keep the UI clean 
    // and focused only on current active tasks.
    setActiveJobs([]);

    socket.on('bulk_job_status', (data) => {
      console.log('📦 Bulk Job Update:', data);
      setActiveJobs(prev => {
        const existsIndex = prev.findIndex(j => j.jobId === data.jobId);
        const updatedJob = {
          jobId: data.jobId,
          total: data.total,
          processed: data.processed,
          successful: data.successful || data.success, // Handle both naming conventions
          failed: data.failed,
          status: data.status
        };

        if (existsIndex > -1) {
          const updated = [...prev];
          updated[existsIndex] = { ...updated[existsIndex], ...updatedJob };
          return updated;
        }
        return [updatedJob, ...prev];
      });
    });

    socket.on('notification_status', (data) => {
      if (data.type === 'BULK_ITEM') {
        setLogs(prev => {
          // Check if this specific log update already exists to avoid duplicates
          const exists = prev.find(l => l.id === data.itemId && l.status === data.status);
          if (exists) return prev;

          const newLog = {
            id: data.itemId,
            status: data.status,
            error: data.error,
            email: data.email,
            createdAt: new Date().toISOString()
          };
          
          return [newLog, ...prev].slice(0, 50);
        });
      }
    });

    return () => { socket.disconnect(); };
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate || !file) return;

    setErrorMsg(null);
    setUploading(true);
    try {
      await notificationService.uploadBulk(selectedTemplate, file);
      setFile(null);
    } catch (err: any) {
      console.error('Upload failed:', err);
      // Extract the error message from the backend response (Axios)
      const backendMessage = typeof err.response?.data === 'string' 
        ? err.response?.data 
        : err.response?.data?.message;
        
      setErrorMsg(backendMessage || err.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <main 
      className="min-h-screen bg-white flex flex-col items-center pb-40 font-mono text-black"
      style={{ paddingTop: '10rem' }}
    >
      <div className="w-full max-w-xl space-y-32 px-4">
        
        {/* Header */}
        <div className="border-b-2 border-black pb-8 text-center">
          <h1 className="text-4xl font-black uppercase tracking-tighter">Bulk Appointment</h1>
        </div>

        <div className="space-y-32">
          
          {/* Vertical Form */}
          <form onSubmit={handleUpload} className="space-y-10">
            <div className="space-y-6">
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Target Template</p>
                <select 
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="w-full h-12 border-2 border-black bg-white px-4 text-xs font-black uppercase focus:outline-none appearance-none cursor-pointer hover:bg-zinc-50 transition-colors"
                  required
                >
                  <option value="">-- SELECT --</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Source File (.XLSX)</p>
                <div className="relative h-12">
                  <input 
                    type="file" 
                    accept=".xlsx, .xls"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="file-upload"
                    required
                  />
                  <label 
                    htmlFor="file-upload"
                    className={`flex items-center justify-between w-full h-full border-2 px-4 transition-all cursor-pointer ${
                      file ? 'bg-black text-white border-black' : 'bg-white border-black hover:bg-black hover:text-white'
                    }`}
                  >
                    <span className="text-xs font-black uppercase truncate">
                      {file ? file.name : 'UPLOAD DATA'}
                    </span>
                    <Upload className="w-4 h-4" />
                  </label>
                </div>
              </div>

              <div className="flex flex-col items-end pt-4 space-y-4">
                <Button 
                  type="submit" 
                  disabled={uploading || !file || !selectedTemplate}
                  className="h-12 px-10 text-[10px] font-black uppercase tracking-[0.4em] rounded-none border-2 border-black hover:bg-black hover:text-white transition-all"
                >
                  {uploading ? '...' : 'EXECUTE'}
                </Button>
                {errorMsg && (
                  <p className="text-[10px] font-black uppercase tracking-widest text-red-500">
                    {errorMsg}
                  </p>
                )}
              </div>
            </div>
          </form>

          {/* Active Jobs */}
          <div className="space-y-12" style={{ marginTop: '2rem' }}>
            <div className="border-b-2 border-black pb-4 flex items-center justify-between">
              <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Active Tasks</h2>
            </div>

            <div className="space-y-12">
              {activeJobs.length > 0 && activeJobs
                .filter((job, index, self) => {
                  // Show all PENDING/PROCESSING jobs
                  if (job.status === 'PENDING' || job.status === 'PROCESSING') return true;
                  // Show only top 2 COMPLETED/FAILED jobs to keep list clean
                  const completedIndices = self
                    .map((j, i) => (j.status === 'COMPLETED' || j.status === 'FAILED' ? i : -1))
                    .filter(i => i !== -1);
                  return completedIndices.slice(0, 2).includes(index);
                })
                .map((job) => {
                  const progress = Math.min(Math.round((job.processed / job.total) * 100), 100);
                  
                  return (
                    <div key={job.jobId} className="space-y-4">
                      <div className="flex items-center justify-between font-black uppercase text-[10px]">
                        <span className="tracking-tighter">Sequence_{job.jobId.slice(-6)}</span>
                        <span className="text-zinc-400">{progress}%</span>
                      </div>
                      <div className="w-full h-3 border-2 border-black p-0.5 bg-white">
                        <div 
                          className="h-full bg-black transition-all duration-700 ease-out" 
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-10 text-[9px] font-black uppercase">
                        <div className="space-y-1">
                          <p className="text-zinc-300 text-[8px]">Processed</p>
                          <p>{job.processed} / {job.total}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-zinc-300 text-[8px]">Success</p>
                          <p className="text-green-600">{job.successful}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-zinc-300 text-[8px]">Failed</p>
                          <p className="text-red-500">{job.failed}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Stream */}
          <div className="space-y-8" style={{ marginTop: '2rem' }}>
            <div className="border-b-2 border-black pb-4">
              <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Signal Stream</h2>
            </div>

            <div className="space-y-2">
              {logs.map((log, i) => (
                <div key={log.id || i} className="flex items-center justify-between border-2 border-black p-4 bg-white hover:bg-black hover:text-white transition-all group">
                  <div className="flex items-center gap-4 font-black uppercase text-[10px]">
                    <div className={`w-1.5 h-1.5 ${log.status === 'SENT' ? 'bg-black group-hover:bg-white' : 'bg-red-500 animate-pulse'}`} />
                    <div className="flex flex-col">
                      <span className="tracking-tight">{log.email || log.id}</span>
                      <span className="text-[7px] opacity-40 uppercase">{log.status}</span>
                    </div>
                  </div>
                  <span className="text-[8px] font-black opacity-20 group-hover:opacity-100">{new Date(log.createdAt).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
