import axios from 'axios';

/**
 * Shared Axios HTTP client for all API calls.
 *
 * Base URL is `/api`, which Vite's dev server proxy forwards to
 * the Spring Boot backend at `http://localhost:8080`.
 */
const client = axios.create({
  baseURL: '/api',
});

export default client;
