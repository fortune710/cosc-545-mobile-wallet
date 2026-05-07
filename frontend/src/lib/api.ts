import axios from 'axios'
import logger from './logger'

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Request interceptor for logging
api.interceptors.request.use((config) => {
  logger.info({
    url: config.url,
    method: config.method,
    headers: config.headers,
  }, `Outgoing Request: ${config.method?.toUpperCase()} ${config.url}`)
  return config
})

// Response interceptor for logging
api.interceptors.response.use(
  (response) => {
    logger.info({
      url: response.config.url,
      status: response.status,
    }, `Successful Response: ${response.status} ${response.config.url}`)
    return response
  },
  (error) => {
    logger.error({
      url: error.config?.url,
      status: error.response?.status,
      message: error.message,
      data: error.response?.data,
    }, `API Error: ${error.response?.status || 'Network Error'} ${error.config?.url}`)
    return Promise.reject(error)
  }
)

export default api
