import api from './api';

export interface CreateAppointmentDto {
  serviceId: string;
  appointmentDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  templateId?: string;
}

export const appointmentService = {
  async getAll() {
    const { data } = await api.get('/appointments');
    return data;
  },

  async getAvailableSlots(date: string, serviceId: string) {
    const { data } = await api.get('/appointments/available-slots', {
      params: { date, serviceId },
    });
    return data;
  },

  async create(dto: CreateAppointmentDto) {
    const templateId = localStorage.getItem('selected_template_id');
    const { data } = await api.post('/appointments', {
      ...dto,
      templateId: templateId || undefined
    });
    return data;
  },

  async update(id: string, dto: any) {
    const { data } = await api.patch(`/appointments/${id}`, dto);
    return data;
  },

  async delete(id: string) {
    const { data } = await api.delete(`/appointments/${id}`);
    return data;
  },
};
