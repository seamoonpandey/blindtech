const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const API_URL = API_BASE;
export const WS_URL = API_BASE.replace(/^http/, 'ws') + '/ws';
