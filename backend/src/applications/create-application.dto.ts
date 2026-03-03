import { IsString, IsEmail, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateApplicationDto {
    @IsString()
    @IsNotEmpty()
    firstName: string;

    @IsString()
    @IsNotEmpty()
    lastName: string;

    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsNotEmpty()
    phone: string;

    @IsString()
    @IsNotEmpty()
    position: string;

    @Type(() => Number)
    @IsNumber()
    experience: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    expectedSalary?: number;

    @IsOptional()
    @IsString()
    currentLocation?: string;

    @IsString()
    @IsNotEmpty()
    motivation: string;
}
