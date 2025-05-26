import { Injectable } from '@nestjs/common';
import { CreateFileDto } from './dto/create-file.dto';
import { UpdateFileDto } from './dto/update-file.dto';
import { InjectMinio } from '../minio/minio.decorator';
import * as Minio from 'minio';
import { randomUUID } from 'crypto';

@Injectable()
export class FilesService {
  protected _bucketName = 'main';

  constructor(@InjectMinio() private readonly minioService: Minio.Client) {}
  create(createFileDto: CreateFileDto) {
    return 'This action adds a new file';
  }

  findAll() {
    return `This action returns all files`;
  }

  findOne(id: number) {
    return `This action returns a #${id} file`;
  }

  update(id: number, updateFileDto: UpdateFileDto) {
    return `This action updates a #${id} file`;
  }

  async bucketsList() {
    return await this.minioService.listBuckets();
  }

  async getFile(filename: string) {
    return await this.minioService.presignedUrl(
      'GET',
      this._bucketName,
      filename,
    );
  }

  uploadFile(file: Express.Multer.File) {
    return new Promise((resolve, reject) => {
      const filename = `${randomUUID().toString()}-${file.originalname}`;
      this.minioService.putObject(
        this._bucketName,
        filename,
        file.buffer,
        file.size,
        (error, objInfo) => {
          if (error) {
            reject(error);
          } else {
            resolve(objInfo);
          }
        },
      );
    });
  }

  uploadFileFromWhatsApp(file: Express.Multer.File, filename: string) {
    const finalFileName = `${filename}-${file.originalname}`;
    return new Promise((resolve, reject) => {
      this.minioService.putObject(
        this._bucketName,
        finalFileName,
        file.buffer,
        file.size,
        (error, objInfo) => {
          if (error) {
            reject(error);
          } else {
            resolve(objInfo);
          }
        },
      );
    });
  }

  remove(id: number) {
    return `This action removes a #${id} file`;
  }
}
