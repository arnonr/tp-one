import api from './api'

export interface UserSearchResult {
  id: string
  name: string
  email: string
  avatarUrl?: string | null
}

export const userService = {
  async search(query: string): Promise<UserSearchResult[]> {
    const { data } = await api.get('/users', { params: { search: query } })
    return data.data
  },

  async list(): Promise<UserSearchResult[]> {
    const { data } = await api.get('/users?pageSize=100')
    return data.data
  },
}
