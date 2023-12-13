import axios from 'axios';
import type { Requester, HttpResponse } from '../../..';

export const requester: Requester = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  post: async function <T, D = any>(
    url: string,
    data: D,
    headers?: Record<string, string>
  ): Promise<HttpResponse<T>> {
    try {
      const response = await axios.post<T>(
        url,
        data,
        headers === undefined ? {} : { headers }
      );
      return {
        statusCode: response.status,
        data: response.data,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        return {
          statusCode: error.response?.status ?? 0,
          data: error.response?.data ?? {},
        };
      }

      return {
        statusCode: 0,
        // @ts-expect-error the {} can be mis-used.
        data: {},
      };
    }
  },
};
