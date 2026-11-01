import { Check } from 'lucide-react';
import { useColor, COLOR_OPTIONS } from '@/hooks/use-color';
import { cn } from '@/lib/utils';

export default function ColorPicker() {
    const { color, updateColor } = useColor();

    return (
        <div className="flex flex-wrap gap-2">
            {COLOR_OPTIONS.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    aria-label={`Pilih warna ${option.label}`}
                    aria-pressed={color === option.value}
                    onClick={() => updateColor(option.value)}
                    className={cn(
                        'flex size-8 items-center justify-center rounded-full border-2 transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                        color === option.value
                            ? 'border-foreground'
                            : 'border-transparent',
                    )}
                    style={{ backgroundColor: option.swatch }}
                >
                    {color === option.value && (
                        <Check className="size-4 text-white drop-shadow" />
                    )}
                </button>
            ))}
        </div>
    );
}
