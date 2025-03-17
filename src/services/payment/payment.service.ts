import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { AuthPaymentService } from './auth-payment.service';
import { UserDocument } from 'src/modules/users/entities/user.schema';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(private readonly authService: AuthPaymentService) {}

  async requestPay(
    phone: string,
    amount: number,
    referenceId: string,
  ): Promise<any> {
    const url = 'https://proxy.momoapi.mtn.com/collection/v1_0/requesttopay';
    const token = await this.authService.getAccessToken(); // Get valid access token

    const postData = {
      amount,
      currency: 'GNF',
      externalId: '12345',
      payer: {
        partyIdType: 'MSISDN',
        partyId: phone,
      },
      payerMessage: 'Payment Request',
      payeeNote: 'Payment for service',
    };

    try {
      const response = await axios.post(url, postData, {
        headers: {
          'X-Reference-Id': referenceId,
          'Content-Type': 'application/json',
          'Ocp-Apim-Subscription-Key': '45414642f181443e897e1a016568c960',
          'X-Target-Environment': 'mtnguineaconakry',
          Authorization: `Bearer ${token}`,
        },
      });

      this.logger.log(
        `Payment request initiated: ${JSON.stringify(response.data)}`,
      );
      return 'success';
    } catch (error) {
      this.logger.error(`Error in requestPay: ${error.message}`);
      throw new Error(`Failed to request payment: ${error.message}`);
    }
  }

  async checkStatus(
    referenceId: string,
    retries = 10,
    delayMs = 5000,
  ): Promise<any> {
    const url = `https://proxy.momoapi.mtn.com/collection/v1_0/requesttopay/${referenceId}`;
    const token = await this.authService.getAccessToken(); // Get valid token

    try {
      const response = await axios.get(url, {
        timeout: 108000,
        headers: {
          'Ocp-Apim-Subscription-Key': '45414642f181443e897e1a016568c960',
          'X-Target-Environment': 'mtnguineaconakry',
          Authorization: `Bearer ${token}`,
        },
      });

      const status = response.data.status;
      this.logger.log(`Payment status: ${status}`);

      if (status === 'SUCCESSFUL' || status === 'FAILED') {
        return response.data; // Stop retrying if status is final
      }

      if (retries > 0) {
        this.logger.warn(
          `Status is still pending. Retrying in ${delayMs / 1000}s...`,
        );
        await this.sleep(delayMs);
        return this.checkStatus(referenceId, retries - 1, delayMs); // Retry
      } else {
        this.logger.error(`Max retries reached. Payment still pending.`);
        return response.data; // Return pending if max retries exceeded
      }
    } catch (error) {
      this.logger.error(`Error checking payment status: ${error.message}`);
      throw new Error(`Failed to check payment status: ${error.message}`);
    }
  }

  async requestActivationCode(user: UserDocument): Promise<any> {
    const url = 'https://afrrikia.com/api/common/uploadKycInfo';

    const postData = user;

    try {
      const response = await axios.post(url, postData, {});

      console.log(
        `Payment request initiated: ${JSON.stringify(response.data)}`,
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Error in requestActivationCode: ${error.message}`);
      throw new Error(`Failed to request activation code: ${error.message}`);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
