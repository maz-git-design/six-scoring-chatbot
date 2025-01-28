import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';

/**
 * A custom NestJS pipe for transforming a string into a valid MongoDB ObjectId.
 */
@Injectable()
export class ObjectIdPipe implements PipeTransform {
  /**
   * Constructor for ObjectIdPipe.
   *
   * @param required - Indicates whether the ObjectId is required (default: true).
   * @param options - Options for custom error message (default: { require: "ObjectId is required" }).
   */
  constructor(
    private readonly required: boolean = true,
    private readonly options: { require: string } = {
      require: 'ObjectId is required',
    },
  ) {}

  /**
   * Transforms a string into a valid MongoDB ObjectId.
   *
   * @param value - The value to transform.
   * @throws BadRequestException if the value is missing and required, or if it is an invalid ObjectId.
   * @returns A valid MongoDB ObjectId.
   */
  transform(value: string) {
    // Check if the value is missing and required
    if (!value && this.required)
      throw new BadRequestException(this.options?.require);

    // Check if the value is a valid ObjectId
    if (!Types.ObjectId.isValid(value))
      throw new BadRequestException('Invalid ObjectId');

    // Transform the string into a valid MongoDB ObjectId
    return new Types.ObjectId(value);
  }
}
