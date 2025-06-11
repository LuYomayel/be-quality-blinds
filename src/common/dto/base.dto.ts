import {
  IsString,
  IsEmail,
  IsOptional,
  IsNotEmpty,
  Matches,
  Length,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class BaseContactDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 50)
  @Transform(({ value }: { value: string }) => value?.trim() || '')
  @Matches(/^[a-zA-ZÀ-ÿ\s'-]+$/, {
    message: 'Name must contain only letters, spaces, hyphens, and apostrophes',
  })
  name: string;

  @IsEmail()
  @IsNotEmpty()
  @Transform(
    ({ value }: { value: string }) => value?.toLowerCase().trim() || '',
  )
  @Length(5, 254)
  email: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }: { value: string }) => value?.trim() || '')
  @Matches(/^(\+?61|0)[2-9]\d{8}$|^(\+?61|0)4\d{8}$/, {
    message: 'Please provide a valid Australian phone number',
  })
  phone: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: string }) => value?.trim() || '')
  recaptchaToken?: string;
}

export class BaseAddressDto {
  @IsOptional()
  @IsString()
  @Length(3, 100)
  @Transform(({ value }: { value: string }) => value?.trim() || '')
  address?: string;

  @IsOptional()
  @IsString()
  @Length(4, 4)
  @Transform(({ value }: { value: string }) => value?.trim() || '')
  @Matches(/^\d{4}$/, {
    message: 'Postcode must be exactly 4 digits',
  })
  postcode?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: string }) => value?.trim() || '')
  state?: string;

  @IsOptional()
  @IsString()
  @Length(2, 50)
  @Transform(({ value }: { value: string }) => value?.trim() || '')
  city?: string;
}
