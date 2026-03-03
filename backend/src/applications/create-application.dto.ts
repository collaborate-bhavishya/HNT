import { IsString, IsEmail, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

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

    @IsNumber()
    experience: number;

    @IsOptional()
    @IsNumber()
    expectedSalary?: number;

    @IsOptional()
    @IsString()
    currentLocation?: string;

    @IsString()
    @IsNotEmpty()
    motivation: string;
}
