// import { queryClient } from "@/main"
import axios, {
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'

const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
})

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('pathlens-token')
    const apiKey = import.meta.env.VITE_API_KEY
    config.headers['x-api-key'] = apiKey
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // You can unwrap data here if you always return { data: ... }
    return response
  },
  (error) => {
    // Centralized error logging
    if (error.response) {
      const message = error.response.data?.message || 'Something went wrong'

      // e.g. handle 401
      const isLoginRequest = error.config?.url?.endsWith('/auth/login')

      if (
        !isLoginRequest &&
        (error.response.status === 401 ||
          error.response.status === 403 ||
          error.response.status === 404)
      ) {
        localStorage.removeItem('pathlens-token')
        window.location.href = '/login'
        // queryClient.removeQueries({
        //   queryKey: ["ME"],
        // })
      }

      return Promise.reject(new Error(message))
    }

    if (error.request) {
      // The request was made but no response was received
      console.error('Network Error or No Response:', error.message)
      return Promise.reject(new Error('Network error. Please try again.'))
    }

    // Something happened in setting up the request that triggered an Error
    console.error('Request Error:', error.message)
    return Promise.reject(new Error(error.message || 'Unknown error'))
  }
)

export default apiClient
