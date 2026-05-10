'use client';

import React, { useEffect, useState } from 'react';
import { appointmentService, CreateAppointmentDto } from '@/services/appointment.service';
import { servicesService, Service } from '@/services/services.service';
import { Button } from '@/components/retroui/Button';
import { Input } from '@/components/retroui/Input';
import Link from 'next/link';
import { Plus, Calendar, Clock, Scissors, RefreshCw, ChevronRight, Trash2, Edit2, Activity, MailCheck, AlertCircle, Upload } from 'lucide-react';
import useSWR, { useSWRConfig } from 'swr';
import { io } from 'socket.io-client';
import { notificationService } from '@/services/notification.service';

export default function DashboardPage() {
  const { mutate } = useSWRConfig();
  
  // SWR for initial data fetch
  const { data: appointments = [], mutate: mutateAppts, isLoading: apptsLoading } = useSWR('appointments', () => appointmentService.getAll());
  const { data: services = [], isLoading: svcsLoading } = useSWR('services', () => servicesService.getAll());
  const { data: fetchedLogs = [], isLoading: logsLoading } = useSWR('notification_logs', () => notificationService.getLogs());

  // Live logs state — updated directly by socket (guaranteed re-render)
  const [liveLogs, setLiveLogs] = useState<any[]>([]);

  // Sync SWR data into liveLogs once loaded
  useEffect(() => {
    if (fetchedLogs.length > 0) {
      setLiveLogs(fetchedLogs);
    }
  }, [fetchedLogs]);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [selectedService, setSelectedService] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // WebSocket Setup — uses setLiveLogs directly, no SWR cache issues
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    let userId = '';
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        userId = user.userId;
      } catch (e) {}
    }

    const socket = io('http://localhost:3001/notifications');
    
    socket.on('connect', () => {
      console.log('Connected to real-time feed');
      if (userId) {
        socket.emit('subscribe', { userId });
        console.log('Subscribed to room:', userId);
      }
    });

    socket.on('notification_status', (data) => {
      console.log('🔔 Socket event received:', data);

      if (data.type === 'SINGLE_APPOINTMENT') {
        setLiveLogs(prev => {
          const existsIndex = prev.findIndex(l =>
            l.id === data.logId ||
            (l.id?.startsWith('temp-') && l.email?.toLowerCase() === data.email?.toLowerCase())
          );

          if (existsIndex > -1) {
            // Update existing entry
            const updated = [...prev];
            updated[existsIndex] = {
              ...updated[existsIndex],
              id: data.logId,
              status: data.status,
            };
            console.log(' Updated existing log to', data.status);
            return updated;
          } else if (data.status === 'PENDING') {
            // Add new PENDING entry
            console.log('Adding new PENDING log');
            return [{
              id: data.logId,
              email: data.email,
              status: 'PENDING',
              createdAt: data.createdAt,
              appointment: { service: { name: data.serviceName } }
            }, ...prev];
          }
          return prev;
        });

        // Also update appointments badge
        mutateAppts((currentAppts: any[] = []) => {
          return currentAppts.map(appt => {
            if (appt.id === data.appointmentId) {
              return { ...appt, notificationLogs: [{ status: data.status }] };
            }
            return appt;
          });
        }, false);

        // Re-fetch from DB after terminal state
        if (data.status === 'SENT' || data.status === 'FAILED') {
          setTimeout(() => {
            mutateAppts();
            mutate('notification_logs');
          }, 1500);
        }
      }
    });

    return () => { socket.disconnect(); };
  }, []);

  useEffect(() => {
    if (selectedService && selectedDate) {
      fetchSlots();
    }
  }, [selectedService, selectedDate]);

  const fetchSlots = async () => {
    try {
      const slots = await appointmentService.getAvailableSlots(selectedDate, selectedService);
      setAvailableSlots(slots);
      setSelectedSlot('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      // Optimistically show a PENDING log immediately
      if (!editingId) {
        const userEmail = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}').email || ''; } catch { return ''; } })();
        const tempLog = {
          id: `temp-${Date.now()}`,
          email: userEmail,
          status: 'PENDING',
          createdAt: new Date().toISOString(),
          appointment: { service: { name: services.find(s => s.id === selectedService)?.name || 'Service' } }
        };
        setLiveLogs(prev => [tempLog, ...prev]);
      }

      if (editingId) {
        await appointmentService.update(editingId, { serviceId: selectedService, startTime: selectedSlot });
      } else {
        await appointmentService.create({ serviceId: selectedService, appointmentDate: selectedDate, startTime: selectedSlot });
      }

      setShowForm(false);
      setEditingId(null);
      resetForm();
      mutateAppts();
    } catch (err) {
      console.error(err);
    } finally {
      setFormLoading(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to delete this appointment?')) return;
    try {
      await appointmentService.delete(id);
      mutate('appointments');
    } catch (err) {
      console.error(err);
    }
  };

  const handleReschedule = (appt: any) => {
    setEditingId(appt.id);
    setSelectedService(appt.serviceId);
    setSelectedDate(new Date(appt.startTime).toISOString().split('T')[0]);
    setShowForm(true);
  };

  const resetForm = () => {
    setSelectedService('');
    setSelectedDate('');
    setSelectedSlot('');
    setAvailableSlots([]);
    setEditingId(null);
  };

  const isGlobalLoading = apptsLoading || svcsLoading || logsLoading;

  return (
    <div 
      className="bg-white min-h-screen pb-20 px-10 flex flex-col items-center"
      style={{ paddingTop: '10rem' }}
    >
      <div className="w-full max-w-2xl space-y-24 px-4">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-2 border-black pb-10">
          <div className="space-y-4">
            <h1 className="text-4xl font-black uppercase tracking-tighter leading-none">Schedule<br/>Management</h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-400">System Identity: Terminal_01</p>
          </div>
            <Button 
              onClick={() => {
                if (showForm) resetForm();
                setShowForm(!showForm);
              }} 
              className="h-14 text-xs tracking-widest rounded-none"
              style={{ paddingLeft: '3rem', paddingRight: '3rem' }}
              variant={showForm ? 'secondary' : 'default'}
            >
              {showForm ? 'CLOSE PORTAL' : 'ADD APPOINTMENT'}
            </Button>
        </div>

        {/* Action Panel: Form */}
        {showForm && (
          <div 
            className="border-2 border-black bg-white space-y-10 animate-in fade-in slide-in-from-top-4 duration-300"
            style={{ padding: '2.5rem' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-black" />
              <h2 className="text-sm font-black uppercase tracking-widest text-black">
                {editingId ? 'Modify Sequence' : 'New Sequence'}
              </h2>
            </div>
            
            <form onSubmit={handleCreateOrUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Service Type</label>
                <select 
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                  className="w-full h-12 border-2 border-black bg-white px-5 text-xs font-bold uppercase focus:outline-none appearance-none cursor-pointer hover:bg-zinc-50"
                  required
                >
                  <option value="">SELECT SERVICE</option>
                  {services.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name} — ${s.price}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Execution Date</label>
                <Input 
                  type="date" 
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="h-12 border-2 border-black rounded-none text-xs font-bold uppercase px-5"
                  required
                />
              </div>

              <div className="space-y-3 md:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Available Windows</label>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
                  {availableSlots.length > 0 ? (
                    availableSlots.map((slot: any) => {
                      const timeStr = new Date(slot.start).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit', 
                        hour12: false 
                      });
                      return (
                        <button
                          key={slot.start}
                          type="button"
                          disabled={slot.isBooked}
                          onClick={() => setSelectedSlot(slot.start)}
                          className={`h-10 text-[10px] font-bold border-2 transition-all ${
                            slot.isBooked
                              ? 'bg-zinc-100 border-zinc-200 text-zinc-300 cursor-not-allowed line-through'
                              : selectedSlot === slot.start
                                ? 'bg-black text-white border-black' 
                                : 'bg-white border-zinc-200 hover:border-black text-black'
                          }`}
                        >
                          {timeStr}
                        </button>
                      );
                    })
                  ) : (
                    <div 
                      className="col-span-full border-2 border-dashed border-zinc-100 text-[10px] font-bold text-zinc-300 uppercase tracking-widest text-center"
                      style={{ padding: '2rem' }}
                    >
                      Select Service & Date to Sync Slots
                    </div>
                  )}
                </div>
              </div>

              <div className="md:col-span-2 pt-6">
                <Button type="submit" disabled={formLoading || !selectedSlot} className="w-full h-14 rounded-none">
                  {formLoading ? 'INITIALIZING...' : editingId ? 'UPDATE SEQUENCE' : 'CONFIRM APPOINTMENT'}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Schedule List */}
        <div className="space-y-8">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
            <h2 className="text-xs font-black uppercase tracking-[0.3em] flex items-center gap-3 text-zinc-400">
              <Calendar className="w-4 h-4" /> Active Timeline
            </h2>
            <button 
              onClick={() => mutate('appointments')} 
              className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:text-black transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${isGlobalLoading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>

          {isGlobalLoading && appointments.length === 0 ? (
            <div className="py-20 text-center font-bold uppercase tracking-widest text-zinc-200">Synchronizing Data...</div>
          ) : appointments.length === 0 ? (
            <div 
              className="text-center border-2 border-dashed border-zinc-100 uppercase text-[10px] font-bold text-zinc-300 tracking-widest"
              style={{ padding: '5rem 2rem' }}
            >
              Zero records in local storage
            </div>
          ) : (
            <div className="divide-y-2 divide-black">
              {appointments.map((appt: any) => (
                <div 
                  key={appt.id} 
                  className="group flex flex-col sm:flex-row sm:items-center justify-between gap-6"
                  style={{ padding: '2.5rem 0' }}
                >
                  <div className="flex gap-10 items-center">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                        {new Date(appt.startTime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </p>
                      <p className="text-2xl font-black uppercase tracking-tighter italic">
                        {new Date(appt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                      </p>
                    </div>
                    <div className="h-12 w-px bg-zinc-200 hidden sm:block" />
                    <div className="space-y-1">
                      <p className="text-lg font-black uppercase leading-none">{appt.service?.name}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                        <Scissors className="w-3 h-3" /> {appt.service?.durationMin} MIN / ${appt.service?.price}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest border-2 ${
                      appt.notificationLogs?.[0]?.status === 'SENT' ? 'border-black bg-black text-white' : 
                      appt.notificationLogs?.[0]?.status === 'PENDING' ? 'border-zinc-400 bg-zinc-100 text-zinc-600' :
                      appt.notificationLogs?.[0]?.status === 'FAILED' ? 'border-red-500 bg-red-500 text-white' :
                      'border-zinc-200 text-zinc-400'
                    }`}>
                      {appt.notificationLogs?.[0]?.status === 'SENT' ? 'CONFIRMED' : 
                       appt.notificationLogs?.[0]?.status || 'CONFIRMED'}
                    </span>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleReschedule(appt)}
                        className="p-2 border-2 border-black hover:bg-black hover:text-white transition-all"
                        title="Reschedule"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleCancel(appt.id)}
                        className="p-2 border-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                        title="Cancel"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Transmission Logs Section */}
        <div className="space-y-8 pb-20">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-4 text-zinc-400">
            <h2 className="text-xs font-black uppercase tracking-[0.3em] flex items-center gap-3">
              <Activity className="w-4 h-4" /> Transmission Logs
            </h2>
          </div>

          {liveLogs.length === 0 ? (
            <div className="text-center py-10 text-[10px] font-bold uppercase tracking-widest text-zinc-300">
              No Transmission History Detected
            </div>
          ) : (
            <div className="space-y-4">
              {liveLogs.map((log: any) => (
                <div key={log.id} className="border-2 border-zinc-100 p-4 flex items-center justify-between group hover:border-black transition-all">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-none ${
                      log.status === 'SENT' ? 'bg-zinc-100' : 
                      log.status === 'PENDING' ? 'bg-zinc-50' :
                      'bg-red-50 text-red-500'
                    }`}>
                      {log.status === 'SENT' ? <MailCheck className="w-4 h-4" /> : 
                       log.status === 'PENDING' ? <RefreshCw className="w-4 h-4 animate-spin" /> :
                       <AlertCircle className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest">{log.email}</p>
                      <p className="text-[8px] font-bold uppercase text-zinc-400 tracking-tighter">
                        {log.appointment?.service?.name} @ {new Date(log.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 ${
                      log.status === 'SENT' ? 'text-green-600' : 
                      log.status === 'PENDING' ? 'text-zinc-400' :
                      'text-red-600'
                    }`}>
                      {log.status === 'SENT' ? 'SUCCESS' : 
                       log.status === 'PENDING' ? 'PROCESSING...' :
                       'FAILURE'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
