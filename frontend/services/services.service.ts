import api from './api';

export interface Service {
  id: string;
  name: string;
  description?: string;
  duration: number; // in minutes
  price: number;
}

export const servicesService = {
  async getAll(): Promise<Service[]> {
    const { data } = await api.get('/services');
    return data;
  },
};
