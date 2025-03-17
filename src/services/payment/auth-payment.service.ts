import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class AuthPaymentService {
  private token: string | null = null;
  private tokenExpiry: number | null = null; // Store expiry timestamp

  async getAccessToken(): Promise<string> {
    const url = 'https://proxy.momoapi.mtn.com/collection/token/';

    // Check if token is still valid
    if (this.token && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.token;
    }

    try {
      const response = await axios.post(
        url,
        {},
        {
          headers: {
            'Content-Type': 'application/json',
            'Ocp-Apim-Subscription-Key': '45414642f181443e897e1a016568c960',
            Authorization: `Basic ZDU2YTUyYWEtOGJjOS00NjZhLWIzZmYtMjgzZWVhMWM1OWY2OjQ3MjI3NTUzZjkyNDRiZjE4ZGYxNDQ1YWYwYTZlZmQx`,
          },
        },
      );

      // Store the token and its expiry time
      this.token = response.data.access_token;
      this.tokenExpiry = Date.now() + response.data.expires_in * 1000; // Convert to milliseconds

      return this.token;
    } catch (error) {
      console.log('ACCCc', error.message);
      throw new HttpException(
        'Failed to get access token',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }
}
