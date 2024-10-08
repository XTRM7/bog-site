import axios from 'axios';
import { API_NOTIFICATION_MESSAGES, SERVICE_URLS } from '../constants/config';
import { getAccessToken, getRefreshToken, setAccessToken, getType } from '../utils/common-utils';

const API_URL = 'http://localhost:8000';

const axiosInstance = axios.create({
    baseURL: API_URL,
    timeout: 10000,
    headers: {
        "content-type": "application/json"
    }
});

axiosInstance.interceptors.request.use(
    function(config) {
        if (config.TYPE) {
            if (config.TYPE.params) {
                config.params = config.TYPE.params;
            } else if (config.TYPE.query) {
                config.url = `${config.url}/${config.TYPE.query}`;
            }
        }
        return config;
    },
    function(error) {
        return Promise.reject(error);
    }
);

axiosInstance.interceptors.response.use(
    function(response) {
        return processResponse(response);
    },
    async function(error) {
        return Promise.reject(await processError(error));
    }
);

///////////////////////////////
// If success -> returns { isSuccess: true, data: object }
// If fail -> returns { isFailure: true, status: string, msg: string, code: int }
//////////////////////////////
const processResponse = (response) => {
    if (response?.status === 200) {
        return { isSuccess: true, data: response.data };
    } else {
        return {
            isFailure: true,
            status: response?.status,
            msg: response?.msg || API_NOTIFICATION_MESSAGES.responseFailure,
            code: response?.code
        };
    }
}

///////////////////////////////
// If success -> returns { isSuccess: true, data: object }
// If fail -> returns { isError: true, status: string, msg: string, code: int }
//////////////////////////////
const processError = async (error) => {
    if (error.response) {
        if (error.response.status === 403) {
            try {
                let response = await API.getRefreshToken({ token: getRefreshToken() });
                if (response.isSuccess) {
                    sessionStorage.clear();
                    setAccessToken(response.data.accessToken);

                    const requestData = error.toJSON();
                    return axiosInstance({
                        method: requestData.config.method,
                        url: requestData.config.baseURL + requestData.config.url,
                        headers: {
                            "content-type": "application/json",
                            "authorization": getAccessToken()
                        },
                        params: requestData.config.params
                    });
                }
            } catch (err) {
                return Promise.reject(err);
            }
        } else {
            console.log("ERROR IN RESPONSE:", error.response);
            return {
                isError: true,
                msg: API_NOTIFICATION_MESSAGES.responseFailure,
                code: error.response.status
            };
        }
    } else if (error.request) {
        console.log("ERROR IN REQUEST:", error.request);
        return {
            isError: true,
            msg: API_NOTIFICATION_MESSAGES.requestFailure,
            code: ""
        };
    } else {
        console.log("ERROR IN NETWORK:", error.message);
        return {
            isError: true,
            msg: API_NOTIFICATION_MESSAGES.networkError,
            code: ""
        };
    }
}

const API = {};

for (const [key, value] of Object.entries(SERVICE_URLS)) {
    API[key] = (body, showUploadProgress, showDownloadProgress) =>
        axiosInstance({
            method: value.method,
            url: value.url,
            data: value.method === 'DELETE' ? '' : body,
            responseType: value.responseType,
            headers: {
                authorization: getAccessToken(),
            },
            TYPE: getType(value, body),
            onUploadProgress: function(progressEvent) {
                if (showUploadProgress) {
                    let percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    showUploadProgress(percentCompleted);
                }
            },
            onDownloadProgress: function(progressEvent) {
                if (showDownloadProgress) {
                    let percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    showDownloadProgress(percentCompleted);
                }
            }
        });
}

export { API };
