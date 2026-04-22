import api from './api'

export const templateService = {
  async list(workspaceId?: string) {
    const query = workspaceId ? `?workspaceId=${workspaceId}` : ''
    const { data } = await api.get(`/templates${query}`)
    return data.data
  },

  async getById(id: string) {
    const { data } = await api.get(`/templates/${id}`)
    return data.data
  },

  async create(body: any) {
    const { data } = await api.post('/templates', body)
    return data.data
  },

  async update(id: string, body: any) {
    const { data } = await api.patch(`/templates/${id}`, body)
    return data.data
  },

  async delete(id: string) {
    await api.delete(`/templates/${id}`)
  },

  async instantiate(id: string, body: any) {
    const { data } = await api.post(`/templates/${id}/instantiate`, body)
    return data.data
  },
}
