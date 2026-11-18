import { Form } from '@inertiajs/react';
import { useState } from 'react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const FORM_ID = 'username-form';

export default function UsernameChangeForm({
    currentUsername,
}: {
    currentUsername: string;
}) {
    const [username, setUsername] = useState(currentUsername);
    const [confirming, setConfirming] = useState(false);
    // The server lowercases and trims too; show the name that would actually be saved.
    const chosen = username.trim().toLowerCase();

    return (
        <Form
            {...ProfileController.updateUsername.form()}
            id={FORM_ID}
            options={{ preserveScroll: true }}
            className="space-y-6"
            onError={(errors) =>
                // A wrong password keeps the dialog open; any username error needs the field in view.
                setConfirming(!!errors.current_password && !errors.username)
            }
        >
            {({ processing, errors }) => (
                <>
                    <div className="grid gap-2">
                        <Label htmlFor="username">Username</Label>

                        <Input
                            id="username"
                            aria-invalid={!!errors.username}
                            aria-describedby={
                                errors.username
                                    ? 'username-hint username-error'
                                    : 'username-hint'
                            }
                            className="mt-1 block w-full"
                            value={username}
                            onChange={(event) =>
                                setUsername(event.target.value)
                            }
                            name="username"
                            required
                            maxLength={12}
                            autoCapitalize="none"
                            autoComplete="off"
                            spellCheck={false}
                        />

                        <p
                            id="username-hint"
                            className="text-sm text-muted-foreground"
                        >
                            6–12 huruf atau angka, diawali huruf. Username hanya
                            bisa diganti satu kali, dan nama lama tidak bisa
                            dipakai orang lain.
                        </p>

                        <InputError
                            id="username-error"
                            className="mt-2"
                            message={errors.username}
                        />
                    </div>

                    <Button
                        type="button"
                        disabled={processing || chosen === ''}
                        data-test="update-username-button"
                        onClick={() => setConfirming(true)}
                    >
                        Simpan username
                    </Button>

                    <Dialog open={confirming} onOpenChange={setConfirming}>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>
                                    Ganti username menjadi “{chosen}”?
                                </DialogTitle>
                                <DialogDescription>
                                    Username hanya bisa diganti satu kali dan
                                    tidak bisa dibatalkan. Periksa ejaannya,
                                    lalu masukkan password untuk mengonfirmasi.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="grid gap-2">
                                <Label htmlFor="current_password">
                                    Password
                                </Label>
                                <Input
                                    id="current_password"
                                    form={FORM_ID}
                                    type="password"
                                    name="current_password"
                                    autoComplete="current-password"
                                    required
                                    aria-invalid={!!errors.current_password}
                                    aria-describedby={
                                        errors.current_password
                                            ? 'current_password-error'
                                            : undefined
                                    }
                                />
                                <InputError
                                    id="current_password-error"
                                    message={errors.current_password}
                                />
                            </div>

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setConfirming(false)}
                                >
                                    Batal
                                </Button>
                                <Button
                                    type="submit"
                                    form={FORM_ID}
                                    disabled={processing}
                                    data-test="confirm-username-button"
                                >
                                    Ganti username
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </>
            )}
        </Form>
    );
}
