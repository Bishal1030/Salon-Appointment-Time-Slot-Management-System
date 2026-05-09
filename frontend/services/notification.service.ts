import api from './api';

export interface NotificationTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  isActive: boolean;
}

export const notificationService = {
  async getTemplates(): Promise<NotificationTemplate[]> {
    const { data } = await api.get('/notifications/templates');
    return data;
  },

  async getTemplate(id: string): Promise<NotificationTemplate> {
    const { data } = await api.get(`/notifications/templates/${id}`);
    return data;
  },

  async selectTemplate(id: string): Promise<any> {
    const { data } = await api.patch(`/notifications/templates/${id}/select`);
    return data;
  },

  async getLogs(): Promise<any[]> {
    const { data } = await api.get('/notifications/logs');
    return data;
  },
};
