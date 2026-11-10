<?php

namespace App\Enums;

enum Occupation: string
{
    case Farmer = 'farmer';
    case Employee = 'employee';
    case CivilServant = 'civil-servant';
    case Teacher = 'teacher';
    case Entrepreneur = 'entrepreneur';
    case Others = 'others';

    public function label(): string
    {
        return match ($this) {
            self::Farmer => 'Petani',
            self::Employee => 'Karyawan',
            self::CivilServant => 'PNS',
            self::Teacher => 'Guru',
            self::Entrepreneur => 'Wiraswasta',
            self::Others => 'Lainnya',
        };
    }
}
