import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { AuthPaymentService } from './auth-payment.service';
import { UserDocument } from 'src/modules/users/entities/user.schema';
import { CreateBillDto } from 'src/modules/bills/dto/create-bill.dto';

@Injectable()
export class ClerkService {
  private readonly logger = new Logger(ClerkService.name);

  async getClerkInfo(phone: string): Promise<ClerkModel> {
    const url = 'https://afrrikia.com/api/common/getClerkInfo';
    //const url = 'http://mvp-gateway:9999/api/common/getClerkInfo';

    try {
      console.log('phone: ', phone);
      const response = await axios.get(`${url}?clerkPhone=${phone}`);

      console.log(`Getting clerk for : ${JSON.stringify(response.data)}`);

      if (!response.data.ok) {
        console.log('Data', response.data);
        throw new Error(`Failed to fetch clerk info: ${response.data.msg}`);
      }
      const clerkData = response.data.data['clerk'];
      const agentData = response.data.data['agent'];
      const clerk: ClerkModel = {
        id: clerkData.id,
        phone: clerkData.phoneNumber,
        fullName: clerkData.fullName,
        agentName: agentData.agentName,
        agentPhone: agentData.agentPhone,
        agentEmail: agentData.agentEmail,
        agentAddress: agentData.agentAddress,
        agentId: agentData.id,
      };
      return clerk;
    } catch (error) {
      this.logger.error(`Error in getClerkInfo: ${error.message}`);
      throw new Error(`Failed to Get Clerk Information: ${error.message}`);
    }
  }

  //   async getAllClerks(phone: string): Promise<ClerkModel[]> {
  //     const url = 'https://afrrikia.com/api/common/getAllClerks';
  //     //const url = 'http://127.0.0.1:9999/api/common/getAllClerks';

  //     try {
  //       const response = await axios.get(url, {});

  //       console.log(`All clerk fetched: ${JSON.stringify(response.data)}`);

  //       if (response.data.ok) {
  //         const clerks: CreateBillDto[] = response.data.data.map((bill: any) => {
  //           return {
  //             billNumber: bill.billNo,
  //             billAmount: bill.billAmount,
  //             billType: bill.billType,
  //             billTypeCode: bill.billTypeCode,
  //             customerId: bill.customerId,
  //             customerPhone: phone,
  //             createTime: bill.createTime,
  //             deviceId: bill.deviceId,
  //             billStatus: bill.billStatus,
  //             notifyTime: bill.notifyTime,
  //             overdueTime: bill.overdueTime,
  //             payTime: bill.payTime,
  //             settledAmount: bill.settledAmount,
  //             customerName: bill.customerName,
  //             deviceCode: bill.deviceCode,
  //           };
  //         });
  //         return bills[bills.length - 1]; // Return last bill];
  //       } else {
  //         throw new Error(`Failed to fetch user bill: ${response.data.msg}`);
  //       }
  //     } catch (error) {
  //       this.logger.error(`Error in getUserBill: ${error.message}`);
  //       throw new Error(`Failed to fetch user bill: ${error.message}`);
  //     }
  //   }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
