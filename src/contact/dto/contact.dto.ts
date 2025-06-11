import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  Length,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { BaseContactDto, BaseAddressDto } from '../../common/dto/base.dto';

export class ContactDto extends BaseContactDto {
  @IsString()
  @IsNotEmpty()
  @Length(10, 1000)
  @Transform(({ value }: { value: string }) => value?.trim() || '')
  message: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['measure-quote', 'installation', 'repair', 'consultation'], {
    message:
      'Service must be one of: measure-quote, installation, repair, consultation',
  })
  service: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(
    [
      'roller-blinds',
      'roman-blinds',
      'venetian-blinds',
      'curtains',
      'shutters',
      'awnings',
      'other',
    ],
    {
      message: 'Product must be a valid product type',
    },
  )
  product: string;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  @Transform(({ value }: { value: string }) => value?.trim() || '')
  chatSummary?: string;
}

export class ContactAddressDto extends BaseAddressDto {}
