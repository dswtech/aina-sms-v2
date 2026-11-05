type ContactPreference = {
    opt_out: boolean;
    contact_channel_preference: string | null;
};

export function canContact(
    customer: ContactPreference | null | undefined,
    channel: 'phone' | 'whatsapp',
): boolean {
    return (
        !!customer &&
        !customer.opt_out &&
        (customer.contact_channel_preference === null ||
            customer.contact_channel_preference === 'any' ||
            customer.contact_channel_preference === channel)
    );
}
