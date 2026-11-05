import { useForm } from '@inertiajs/react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

type ContactCustomer = {
    public_id: string;
    contact_channel_preference: string | null;
    opt_out: boolean;
};

export function CustomerContactPreferences({
    customer,
}: {
    customer: ContactCustomer;
}) {
    const form = useForm({
        contact_channel_preference: customer.contact_channel_preference ?? '',
        opt_out: customer.opt_out,
    });
    return (
        <section
            aria-label="Preferensi kontak pelanggan"
            className="grid gap-3 rounded-xl border p-4"
        >
            <div>
                <h3 className="font-semibold">Preferensi kontak</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                    {customer.opt_out
                        ? 'Pelanggan menolak dihubungi pada semua kanal.'
                        : 'Tidak ada penolakan kontak yang tercatat.'}
                </p>
            </div>
            <form
                className="grid gap-3"
                onSubmit={(event) => {
                    event.preventDefault();
                    form.transform((data) => ({
                        ...data,
                        contact_channel_preference:
                            data.contact_channel_preference || null,
                    }));
                    form.patch(
                        `/customers/${customer.public_id}/contact-preferences`,
                        {
                            preserveScroll: true,
                            onNetworkError: () => {
                                form.setError(
                                    'opt_out',
                                    'Koneksi terputus. Preferensi belum dapat dikonfirmasi tersimpan; periksa koneksi sebelum mencoba lagi.',
                                );
                                return false;
                            },
                            onHttpException: () => {
                                form.setError(
                                    'opt_out',
                                    'Preferensi belum dapat dikonfirmasi tersimpan. Periksa kembali sebelum mencoba lagi.',
                                );
                                return false;
                            },
                        },
                    );
                }}
            >
                <div className="grid gap-1">
                    <Label htmlFor="customer-contact-channel">
                        Kanal pilihan
                    </Label>
                    <select
                        id="customer-contact-channel"
                        className="native-select min-h-11 w-full rounded-md border bg-background px-3"
                        value={form.data.contact_channel_preference}
                        disabled={form.processing}
                        onChange={(event) =>
                            form.setData(
                                'contact_channel_preference',
                                event.target.value,
                            )
                        }
                        aria-invalid={!!form.errors.contact_channel_preference}
                        aria-describedby={
                            form.errors.contact_channel_preference
                                ? 'contact-channel-error'
                                : undefined
                        }
                    >
                        <option value="">Belum ditentukan</option>
                        <option value="whatsapp">WhatsApp</option>
                        <option value="phone">Telepon</option>
                        <option value="any">WhatsApp dan telepon</option>
                    </select>
                    <InputError
                        id="contact-channel-error"
                        message={form.errors.contact_channel_preference}
                    />
                </div>
                <Label
                    htmlFor="customer-contact-refusal"
                    className="flex min-h-11 items-center gap-3 leading-5"
                >
                    <Checkbox
                        id="customer-contact-refusal"
                        aria-invalid={!!form.errors.opt_out}
                        aria-describedby={
                            form.errors.opt_out
                                ? 'customer-contact-refusal-error'
                                : undefined
                        }
                        checked={form.data.opt_out}
                        disabled={form.processing}
                        onCheckedChange={(value) =>
                            form.setData('opt_out', value === true)
                        }
                    />
                    Pelanggan menolak dihubungi pada semua kanal
                </Label>
                <div role={form.errors.opt_out ? 'alert' : undefined}>
                    <InputError
                        id="customer-contact-refusal-error"
                        message={form.errors.opt_out}
                    />
                </div>
                <Button
                    type="submit"
                    variant="secondary"
                    className="min-h-11 w-fit"
                    disabled={form.processing}
                >
                    {form.processing
                        ? 'Menyimpan…'
                        : 'Simpan preferensi kontak'}
                </Button>
            </form>
        </section>
    );
}
