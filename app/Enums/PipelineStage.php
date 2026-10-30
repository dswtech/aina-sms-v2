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

    public function isClosed(): bool
    {
        return in_array($this, [self::Delivery, self::Lost], true);
    }
}
