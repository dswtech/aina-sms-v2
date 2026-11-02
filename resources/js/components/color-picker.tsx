import { useColor, COLOR_OPTIONS } from '@/hooks/use-color';
import { cn } from '@/lib/utils';

export default function ColorPicker() {
    const { color, updateColor } = useColor();

    return (
        <div className="flex flex-wrap justify-end gap-2">
            {COLOR_OPTIONS.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    aria-label={`Pilih warna ${option.label}`}
                    aria-pressed={color === option.value}
                    onClick={() => updateColor(option.value)}
                    className={cn(
                        'size-5 rounded-full ring-offset-2 ring-offset-background transition-transform outline-none hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring',
                        color === option.value
                            ? 'ring-2 ring-foreground'
                            : 'ring-0',
                    )}
                    style={{ backgroundColor: option.swatch }}
                />
            ))}
        </div>
    );
}
