import axios from 'axios';
import cuid from 'cuid';
import Cookies from 'js-cookie';

// Define default URLs based on environment
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const IPFS_API_URL = process.env.NEXT_PUBLIC_IPFS_API_URL || 'http://localhost:5001';
const IPFS_GATEWAY_URL = process.env.NEXT_PUBLIC_IPFS_GATEWAY_URL || 'http://localhost:8080';

export const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
        'X-Request-Source': 'protchain-client',
        'X-Request-ID': cuid()
    },
    withCredentials: false
});

// Export URLs for use in components
export const getIpfsApiUrl = () => IPFS_API_URL;
export const getIpfsGatewayUrl = () => IPFS_GATEWAY_URL;

apiClient.interceptors.request.use((config) => {
    const token = Cookies.get('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const authenticateUser = async (email, password) => {
    try {
        // Use the Next.js API route instead of direct API call
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (data.payload?.token) {
            Cookies.set('token', data.payload.token, { 
                expires: 1000, // 1000 days
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'Lax'
            });
            // Trigger storage event for Navigation component
            window.dispatchEvent(new Event('storage'));
        }
        return data;
    } catch (error) {
        console.error("Login error:", error);
        throw new Error('Network Error');
    }
};

export const registerUser = async (name, email, password) => {
    try {
        // Use the Next.js API route instead of direct API call
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, password })
        });
        
        const data = await response.json();
        
        if (data.payload?.token) {
            Cookies.set('token', data.payload.token, { 
                expires: 1000, // 1000 days
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'Lax'
            });
            // Trigger storage event for Navigation component
            window.dispatchEvent(new Event('storage'));
        }
        return data;
    } catch (error) {
        console.error("Registration error:", error);
        throw new Error('Network Error');
    }
};

export const logoutUser = () => {
    Cookies.remove('token');
    // Trigger storage event for Navigation component
    window.dispatchEvent(new Event('storage'));
    window.location.href = '/login';
};

export const retrieveProteinDetail = async (proteinId) => {
    try {
        // Send request to retrieve protein details
        console.log('Fetching protein:', proteinId);
        const response = await apiClient.get(
            `/api/v1/protein/${proteinId}`,
            {
                headers: { Accept: 'application/json' },
            }
        );

        const { data: responseData } = response;
        console.log('API Response:', responseData);
        
        if (!responseData || !responseData.data || !responseData.file) {
            throw new Error('Invalid API response format');
        }

        // Create a blob from the PDB file content
        const fileBlob = new Blob([responseData.file], { type: 'chemical/x-pdb' });

        // Return both metadata and the file blob
        return {
            metadata: {
                protein_id: responseData.protein_id,
                data: responseData.data,
                blockchain_info: responseData.blockchain_info || {
                    ipfs_cid: '',
                    file_hash: ''
                }
            },
            file: fileBlob
        };
    } catch (error) {
        console.error('Error in retrieveProteinDetail:', error);
        const errorMessage = error.response?.data?.detail || error.message || 'Network Error';
        throw new Error(errorMessage);
    }
};
