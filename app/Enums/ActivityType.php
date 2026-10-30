<?php

namespace App\Enums;

enum ActivityType: string
{
    case Call = 'call';
    case Whatsapp = 'whatsapp';
    case Visit = 'visit';
    case Meeting = 'meeting';
    case Note = 'note';
    case StageChange = 'stage_change';
    case AssignmentChange = 'assignment_change';

    public function label(): string
    {
        return match ($this) {
            self::Call => 'Telepon',
            self::Whatsapp => 'WhatsApp',
            self::Visit => 'Kunjungan',
            self::Meeting => 'Pertemuan / Showroom',
            self::Note => 'Catatan Tambahan',
            self::StageChange => 'Perubahan Tahap',
            self::AssignmentChange => 'Perubahan Penugasan',
        };
    }
}
