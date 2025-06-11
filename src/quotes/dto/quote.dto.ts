import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  Length,
  IsBoolean,
  IsNumberString,
  IsDateString,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { BaseContactDto } from '../../common/dto/base.dto';

export class QuoteDto extends BaseContactDto {
  @IsString()
  @IsNotEmpty()
  @Length(3, 100)
  @Transform(({ value }: { value: string }) => value?.trim() || '')
  address: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 50)
  @Transform(({ value }: { value: string }) => value?.trim() || '')
  city: string;

  @IsString()
  @IsNotEmpty()
  @Length(4, 4)
  @Transform(({ value }: { value: string }) => value?.trim() || '')
  postcode: string;

  @IsOptional()
  @IsString()
  @IsIn(['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'], {
    message: 'State must be a valid Australian state',
  })
  state?: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(
    [
      'Living Room',
      'Bedroom',
      'Kitchen',
      'Bathroom',
      'Office',
      'Dining Room',
      'Outdoor',
      'Conservatory',
      'Study',
      "Children's Room",
    ],
    {
      message: 'Room type must be a valid option',
    },
  )
  roomType: string;

  @IsOptional()
  @IsNumberString()
  @Transform(({ value }: { value: string }) => value?.trim() || '')
  width?: string;

  @IsOptional()
  @IsNumberString()
  @Transform(({ value }: { value: string }) => value?.trim() || '')
  height?: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['1', '2', '3', '4', '5+'], {
    message: 'Window count must be between 1 and 5+',
  })
  windowCount: string;

  @IsOptional()
  @IsString()
  @IsIn(['inside-mount', 'outside-mount', 'ceiling-mount', 'not-sure'], {
    message: 'Installation type must be a valid option',
  })
  installationType?: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['under-500', '500-1000', '1000-2000', '2000-5000', 'over-5000'], {
    message: 'Budget must be a valid range',
  })
  budget: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(
    ['asap', 'this-month', 'next-month', 'next-3-months', 'just-browsing'],
    {
      message: 'Urgency must be a valid option',
    },
  )
  urgency: string;

  @IsOptional()
  @IsDateString()
  preferredDate?: string;

  @IsOptional()
  @IsString()
  @IsIn(['morning', 'afternoon', 'evening', 'flexible'], {
    message: 'Preferred time must be a valid option',
  })
  preferredTime?: string;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  @Transform(({ value }: { value: string }) => value?.trim() || '')
  comments?: string;

  @IsOptional()
  @IsString()
  @Length(0, 100)
  @Transform(({ value }: { value: string }) => value?.trim() || '')
  referralSource?: string;

  @IsOptional()
  @IsBoolean()
  isNewCustomer?: boolean;

  @IsOptional()
  @IsBoolean()
  wantsNewsletter?: boolean;

  @IsString()
  @IsNotEmpty()
  @Length(3, 100)
  @Transform(({ value }: { value: string }) => value?.trim() || '')
  product: string;

  @IsOptional()
  @IsString()
  @Length(0, 100)
  @Transform(({ value }: { value: string }) => value?.trim() || '')
  productCategory?: string;
}
