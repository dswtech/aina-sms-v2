<?php

namespace App\Enums;

enum PipelineStage: string
{
    case Lead = 'lead';
    case Prospect = 'prospect';
    case HotProspect = 'hot_prospect';
    case Spk = 'spk';
    case Do = 'do';
    case Delivery = 'delivery';
    case Lost = 'lost';

    public function label(): string
    {
        return match ($this) {
            self::Lead => 'Lead',
            self::Prospect => 'Prospect',
            self::HotProspect => 'Hot Prospect',
            self::Spk => 'SPK',
            self::Do => 'DO',
            self::Delivery => 'Delivery',
            self::Lost => 'Lost',
        };
    }

    /** Position among the open pipeline stages; null for DO, Delivery and Lost. */
    public function openRank(): ?int
    {
        return match ($this) {
            self::Lead => 0,
            self::Prospect => 1,
            self::HotProspect => 2,
            self::Spk => 3,
            default => null,
        };
    }

    public function isBackwardTo(self $to): bool
    {
        return $this->openRank() !== null && $to->openRank() !== null && $to->openRank() < $this->openRank();
    }

    public function isClosed(): bool
    {
        return in_array($this->value, self::closedValues(), true);
    }

    /** @return list<string> */
    public static function closedValues(): array
    {
        return [self::Do->value, self::Delivery->value, self::Lost->value];
    }
}
