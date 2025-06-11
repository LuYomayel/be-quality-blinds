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

  @IsOptional()
  @IsString()
  @Length(3, 100, {
    message: 'Address must be between 3 and 100 characters when provided',
  })
  @Transform(({ value }: { value: string }) => {
    const trimmed = value?.trim() || '';
    return trimmed === '' ? undefined : trimmed;
  })
  address?: string;

  @IsOptional()
  @IsString()
  @Length(4, 4, { message: 'Postcode must be exactly 4 digits when provided' })
  @Transform(({ value }: { value: string }) => {
    const trimmed = value?.trim() || '';
    return trimmed === '' ? undefined : trimmed;
  })
  postcode?: string;
}

export class ContactAddressDto extends BaseAddressDto {}
