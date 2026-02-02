import axios from 'axios';

const BASE_URL = 'https://farm-ferry-backend-new.vercel.app';

export const dashboardAPI = {
  getStats: (token) =>
    axios.get(`${BASE_URL}/api/v1/supplier/dashboard`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }),
};
