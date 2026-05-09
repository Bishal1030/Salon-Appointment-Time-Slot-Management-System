'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { notificationService, NotificationTemplate } from '@/services/notification.service';
import { Button } from '@/components/retroui/Button';
import { Mail, Check, Eye } from 'lucide-react';

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<NotificationTemplate | null>(null);

  useEffect(() => {
    fetchTemplates();
    const stored = localStorage.getItem('selected_template_id');
    if (stored) setSelectedId(stored);
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const data = await notificationService.getTemplates();
      setTemplates(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (id: string) => {
    try {
      await notificationService.selectTemplate(id);
      setSelectedId(id);
      localStorage.setItem('selected_template_id', id);
      
      // Update the user object in localStorage if needed
      const userStr = localStorage.getItem('user');
      if (userStr && userStr !== 'undefined') {
        try {
          const user = JSON.parse(userStr);
          if (user) {
            user.selectedTemplateId = id;
            localStorage.setItem('user', JSON.stringify(user));
          }
        } catch (parseErr) {
          console.error('Failed to parse user data', parseErr);
        }
      }
    } catch (err) {
      console.error('Failed to select template', err);
    }
  };

  return (
    <div 
      className="bg-white min-h-screen pb-20 px-6 flex flex-col items-center"
      style={{ paddingTop: '10rem' }}
    >
      <div className="w-full max-w-4xl space-y-16">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-2 border-black pb-10">
          <div className="space-y-4 text-center md:text-left">
            <h1 className="text-4xl font-black uppercase tracking-tighter leading-none">Message<br/>Templates</h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-400">Communication Node: Active</p>
          </div>
          <div 
            className="flex items-center gap-4 bg-zinc-50 border-2 border-black"
            style={{ padding: '1rem' }}
          >
            <Mail className="w-5 h-5" />
            <div className="text-left">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Active Protocol</p>
              <p className="text-xs font-bold uppercase truncate max-w-[150px]">
                {templates.find(t => t.id === selectedId)?.name || 'NONE SELECTED'}
              </p>
            </div>
          </div>
        </div>

        {/* Template Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {loading ? (
            <div className="col-span-full py-20 text-center font-bold uppercase tracking-widest text-zinc-200">Retrieving Templates...</div>
          ) : templates.length === 0 ? (
            <div 
              className="col-span-full text-center border-2 border-dashed border-zinc-100 uppercase text-[10px] font-bold text-zinc-300 tracking-widest"
              style={{ padding: '5rem 2rem' }}
            >
              No templates found in database
            </div>
          ) : (
            templates.map((tpl) => (
              <div 
                key={tpl.id} 
                className={`group border-2 transition-all space-y-6 ${
                  selectedId === tpl.id ? 'border-black bg-white ring-4 ring-black/5' : 'border-zinc-100 hover:border-black'
                }`}
                style={{ padding: '2rem' }}
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Template ID</p>
                    <h3 className="text-lg font-black uppercase tracking-tight">{tpl.name}</h3>
                  </div>
                  {selectedId === tpl.id && (
                    <div className="bg-black p-1 text-white">
                      <Check className="w-4 h-4" />
                    </div>
                  )}
                </div>

                <div className="h-px w-full bg-zinc-100" />

                <div className="space-y-4">
                  <p className="text-[10px] font-bold uppercase text-zinc-400 italic">Preview Mode</p>
                  <p className="text-xs font-bold uppercase tracking-tight line-clamp-1">SUB: {tpl.subject}</p>
                  <div 
                    className="text-[11px] text-zinc-500 line-clamp-3 font-mono bg-zinc-50 border border-zinc-100"
                    style={{ padding: '1rem' }}
                  >
                    {tpl.body}
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <Button 
                    variant="outline" 
                    className="flex-1 rounded-none border-2 h-11"
                    onClick={() => setPreviewTemplate(tpl)}
                  >
                    <Eye className="w-4 h-4 mr-2" /> VIEW FULL
                  </Button>
                  <Button 
                    className="flex-1 rounded-none h-11"
                    variant={selectedId === tpl.id ? 'secondary' : 'default'}
                    onClick={() => handleSelect(tpl.id)}
                  >
                    {selectedId === tpl.id ? 'SELECTED' : 'USE THIS'}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Action Footer */}
        <div 
          className="border-t border-zinc-100 flex justify-center"
          style={{ margin: '4rem 0' }}
        >
          <Button 
            disabled={!selectedId}
            onClick={() => router.push('/dashboard')}
            className="h-12 text-[10px] font-black uppercase tracking-[0.3em] rounded-none group"
            style={{ paddingLeft: '4rem', paddingRight: '4rem' }}
          >
            CONTINUE TO DASHBOARD
            <div className="ml-3 w-4 h-px bg-white transition-all group-hover:w-8" />
          </Button>
        </div>

        {/* Full Preview Modal (Simple B&W) */}
        {previewTemplate && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm">
            <div 
              className="bg-white border-2 border-black w-full max-w-lg space-y-8 animate-in zoom-in-95 duration-200"
              style={{ padding: '2.5rem' }}
            >
              <div className="space-y-2">
                <h2 className="text-2xl font-black uppercase tracking-tighter">Full Content Preview</h2>
                <div className="h-1 w-12 bg-black" />
              </div>
              
              <div className="space-y-6">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Subject Line</p>
                  <p className="text-sm font-bold border-b border-zinc-100 pb-2">{previewTemplate.subject}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Body Protocol</p>
                  <pre 
                    className="text-xs font-mono whitespace-pre-wrap bg-zinc-50 border border-zinc-100 leading-relaxed"
                    style={{ padding: '1.5rem' }}
                  >
                    {previewTemplate.body}
                  </pre>
                </div>
              </div>

              <Button 
                onClick={() => setPreviewTemplate(null)} 
                className="w-full rounded-none h-12"
              >
                CLOSE PREVIEW
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
