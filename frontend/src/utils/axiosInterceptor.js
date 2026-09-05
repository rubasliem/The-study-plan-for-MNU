import axios from 'axios';

export const round2 = (num) => {
    if (num === null || num === undefined || num === "") return num;
    const n = Number(num);
    if (isNaN(n)) return num;
    return Number(Math.round(n + "e+2") + "e-2");
};

const sanitizeNumbers = (obj) => {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'number') {
        if (!Number.isInteger(obj)) return round2(obj);
        return obj;
    }
    if (typeof obj === 'string' && !isNaN(obj) && obj.trim() !== '') {
        // Only round string numbers if they are explicitly floats with > 2 decimal places
        if (obj.includes('.') && obj.split('.')[1].length > 2) {
            const num = Number(obj);
            if (!isNaN(num)) return String(round2(num));
        }
        return obj;
    }
    if (Array.isArray(obj)) return obj.map(sanitizeNumbers);
    if (typeof obj === 'object' && obj.constructor === Object) {
        const newObj = {};
        for (const key in obj) {
            newObj[key] = sanitizeNumbers(obj[key]);
        }
        return newObj;
    }
    return obj;
};

// Intercept responses to clean up incoming floats
axios.interceptors.response.use(response => {
    if (response.data) {
        response.data = sanitizeNumbers(response.data);
    }
    return response;
}, error => Promise.reject(error));

// Intercept requests to clean up outgoing floats and add study plan context headers
axios.interceptors.request.use(config => {
    if (config.data) {
        config.data = sanitizeNumbers(config.data);
    }
    // إضافة العام الجامعي والفصل الدراسي المختارين كـ headers تلقائياً
    let studyYear = (config.data && config.data.academic_year) ? config.data.academic_year : localStorage.getItem('studyplan_year');
    let studySemester = (config.data && config.data.semester) ? config.data.semester : localStorage.getItem('studyplan_semester');
    if (studyYear) config.headers['X-Academic-Year'] = studyYear;
    if (studySemester) config.headers['X-Semester'] = studySemester;
    return config;
}, error => Promise.reject(error));

