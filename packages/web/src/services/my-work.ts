import api from './api'

export const myWorkService = {
  async getAll() {
    const { data } = await api.get('/my-work')
    return data.data
  },

  async getSummary() {
    const { data } = await api.get('/my-work/summary')
    return data.data
  },

  async getToday() {
    const { data } = await api.get('/my-work/today')
    return data.data
  },

  async getOverdue() {
    const { data } = await api.get('/my-work/overdue')
    return data.data
  },

  async getWaiting() {
    const { data } = await api.get('/my-work/waiting')
    return data.data
  },
}
