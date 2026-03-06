import { IsString, IsEmail, IsNotEmpty, IsNumber, IsOptional, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';

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

    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    available120Hours?: boolean;

    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    openToWeekends?: boolean;

    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    comfortableNightShifts?: boolean;

    @IsString()
    @IsNotEmpty()
    motivation: string;
}
