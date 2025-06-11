import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ArrayMinSize,
  Length,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { BaseContactDto } from '../../common/dto/base.dto';

const VALID_PRODUCT_TYPES = [
  'Roller Blinds - Blockout',
  'Roller Blinds - Sunscreen',
  'Roller Blinds - Translucent',
  'Roman Blinds',
  'Venetian Blinds - Aluminium',
  'Venetian Blinds - Timber',
  'Curtains - Blockout',
  'Curtains - Sheer',
  'Shutters - ABS',
  'Shutters - Basswood',
  'Shutters - Phoenixwood',
  'Awning Fabrics',
];

export class SamplesDto extends BaseContactDto {
  @IsString()
  @IsNotEmpty()
  @Length(3, 100)
  @Transform(({ value }: { value: string }) => value?.trim() || '')
  address: string;

  @IsString()
  @IsNotEmpty()
  @Length(4, 4)
  @Transform(({ value }: { value: string }) => value?.trim() || '')
  postcode: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Please select at least one product type' })
  @IsString({ each: true })
  @Transform(({ value }: { value: string[] }) => {
    if (Array.isArray(value)) {
      return value.filter((item: string) => VALID_PRODUCT_TYPES.includes(item));
    }
    return [];
  })
  productTypes: string[];

  @IsOptional()
  @IsString()
  @Length(0, 500)
  @Transform(({ value }: { value: string }) => value?.trim() || '')
  message?: string;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  @Transform(({ value }: { value: string }) => value?.trim() || '')
  chatSummary?: string;
}
