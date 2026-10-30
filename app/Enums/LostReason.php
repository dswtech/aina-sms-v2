<?php

namespace App\Enums;

enum LostReason: string
{
    case Competitor = 'competitor';
    case PriceBudget = 'price_budget';
    case CreditRejected = 'credit_rejected';
    case NoResponse = 'no_response';
    case CancelPurchase = 'cancel_purchase';
    case Other = 'other';

    public function label(): string
    {
        return match ($this) {
            self::Competitor => 'Membeli di kompetitor / merek lain',
            self::PriceBudget => 'Harga atau anggaran belum sesuai',
            self::CreditRejected => 'Pengajuan leasing ditolak',
            self::NoResponse => 'Tidak merespons follow-up',
            self::CancelPurchase => 'Batal atau menunda rencana beli',
            self::Other => 'Alasan lainnya',
        };
    }
}
