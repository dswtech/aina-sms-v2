<?php

namespace App\Support;

class PhoneNormalizer
{
    /**
     * Normalizes a phone number to Indonesian E.164 format (+628...).
     * Returns null if the phone number is invalid.
     */
    public static function normalize(?string $phone): ?string
    {
        if ($phone === null) {
            return null;
        }

        $cleaned = preg_replace('/[^\d+]/', '', trim($phone));
        if ($cleaned === null || $cleaned === '') {
            return null;
        }

        // Check if there are unwanted characters in original string (besides digits, spaces, -, +, parentheses)
        if (preg_match('/[a-zA-Z]/', $phone)) {
            return null;
        }

        if (str_starts_with($cleaned, '+62')) {
            $digits = substr($cleaned, 3);
        } elseif (str_starts_with($cleaned, '62')) {
            $digits = substr($cleaned, 2);
        } elseif (str_starts_with($cleaned, '0')) {
            $digits = substr($cleaned, 1);
        } else {
            return null;
        }

        // Indonesian mobile numbers start with 8 and are between 9 and 13 digits after 0/+62
        if (! str_starts_with($digits, '8')) {
            return null;
        }

        $len = strlen($digits);
        if ($len < 8 || $len > 13) {
            return null;
        }

        return '+62'.$digits;
    }

    /**
     * Checks if a phone number is valid.
     */
    public static function isValid(?string $phone): bool
    {
        return self::normalize($phone) !== null;
    }
}
