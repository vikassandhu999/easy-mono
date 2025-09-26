import axios from 'axios';

export const axiosBaseQuery =
    ({baseUrl}: {baseUrl: string} = {baseUrl: ''}) =>
    async ({url, method, data}: {data?: any; method: string; url: string}) => {
        try {
            const result = await axios({url: baseUrl + url, method, data});
            return {data: result.data};
        } catch (axiosError) {
            const err = axiosError as any;
            return {
                error: {
                    status: err.response?.status,
                    data: err.response?.data || err.message,
                },
            };
        }
    };
