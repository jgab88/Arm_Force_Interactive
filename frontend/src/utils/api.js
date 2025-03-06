// frontend/src/utils/api.js
const API_BASE_URL = 'http://localhost:8000';

export const calculateForcesHttp = async (data) => {
  try {
    console.log("Sending data to backend:", data);
    const response = await fetch(`${API_BASE_URL}/calculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    
    const result = await response.json();
    console.log("Received response from backend:", result);
    return result;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};