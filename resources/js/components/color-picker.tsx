import { useColor, COLOR_OPTIONS } from '@/hooks/use-color';
import { cn } from '@/lib/utils';
import {
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';

export default function ColorPicker() {
    const { color, updateColor } = useColor();

    return (
        <DropdownMenuRadioGroup
            value={color}
            aria-label="Warna aksen"
            className="grid grid-cols-3 gap-1"
        >
            {COLOR_OPTIONS.map((option) => (
                <DropdownMenuRadioItem
                    key={option.value}
                    value={option.value}
                    aria-label={`Pilih warna ${option.label}`}
                    onSelect={(event) => {
                        event.preventDefault();
                        updateColor(option.value);
                    }}
                    className={cn(
                        'size-11 justify-center rounded-md p-0 outline-none focus-visible:ring-2 focus-visible:ring-ring [&>span:first-child]:hidden',
                        color === option.value ? 'bg-accent' : 'ring-0',
                    )}
                >
                    <span
                        aria-hidden="true"
                        className={cn(
                            'size-5 rounded-full',
                            color === option.value &&
                                'ring-2 ring-foreground ring-offset-2 ring-offset-background',
                        )}
                        style={{ backgroundColor: option.swatch }}
                    />
                </DropdownMenuRadioItem>
            ))}
        </DropdownMenuRadioGroup>
    );
}
