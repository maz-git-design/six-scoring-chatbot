import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { AuthPaymentService } from './auth-payment.service';
import { UserDocument } from 'src/modules/users/entities/user.schema';
import { CreateBillDto } from 'src/modules/bills/dto/create-bill.dto';
import {
  Device,
  DeviceDocument,
} from 'src/modules/devices/entities/device.entity';

@Injectable()
export class DeviceService {
  private readonly logger = new Logger(DeviceService.name);

  async getDeviceType(id: number): Promise<Device> {
    //const url = 'https://afrrikia.com/api/device-type/';
    const url = 'http://127.0.0.1:9999/api/device-type/';

    try {
      console.log('phone: ', id);
      const response = await axios.get(`${url}${id}`);

      const device: Device = {
        code: response.data.id,
        name: response.data.typeName,
        activationFee: response.data.typeActivationFee,
        price: response.data.typePrice,
        model: response.data.typeModel,
        description: response.data.typeDescription,
      };
      console.log('device: ', response.data);
      return device;
    } catch (error) {
      this.logger.error(`Error in getDevice: ${error.message}`);
      throw new Error(`Failed to Get Device Information: ${error.message}`);
    }
  }
}
