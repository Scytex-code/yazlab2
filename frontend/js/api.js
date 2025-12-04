import { getToken } from './auth.js'; 

const API_BASE_URL = 'http://127.0.0.1:8000/api/'; 

/**
 * @param {string} endpoint 
 * @param {string} method
 * @param {object} body 
 * @param {boolean} requiresAuth 
 */
export const fetchData = async (endpoint, method = 'GET', body = null, requiresAuth = true) => {
    const url = `${API_BASE_URL}${endpoint}`;

    const headers = {
        'Content-Type': 'application/json',
    };

    if (requiresAuth) {
        const token = getToken(); 
        if (token) {
            headers['Authorization'] = `Token ${token}`; 
        } else {
            throw new Error('Bu işlem için oturum açılması gerekiyor.');
        }
    }

    const config = {
        method: method,
        headers: headers,
    };

    if (body) {
        config.body = JSON.stringify(body);
    }
    
    const response = await fetch(url, config);

    if (!response.ok) {
        try {
            const errorData = await response.json();
            throw new Error(JSON.stringify(errorData)); 
        } catch (e) {
            if (response.status === 403 || response.status === 404) {
                 throw new Error(`API isteği başarısız: ${response.status} ${response.statusText}. Lütfen API yolunu kontrol edin.`);
            }
            throw new Error(`API isteği başarısız: ${response.statusText}`);
        }
    }

    if (response.status === 204) {
        return {};
    }

    return await response.json();
};