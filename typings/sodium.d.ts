declare namespace sodium {
    export type Uint8ArrayOutputFormat = 'uint8array';

    export type StringOutputFormat = 'text' | 'hex' | 'base64';

    function from_hex(h: string): Uint8Array;
    function to_hex(b: Uint8Array): string;
    function is_hex(str: string): boolean;

    export function from_base64(input: string, variant?: base64_variants): Uint8Array;
    export function to_base64(input: string | Uint8Array, variant?: base64_variants): string;

    function crypto_box_easy(message: Uint8Array, nonce: Uint8Array, receiverPubKey: Uint8Array, senderSecKey: Uint8Array): Uint8Array;
    function crypto_box_open_easy(cipherText: Uint8Array, nonce: Uint8Array, senderPubKey: Uint8Array, receiverSecKey: Uint8Array): Uint8Array;

    function memcmp(b1: Uint8Array, b2: Uint8Array): boolean;
    function memzero(bytes: Uint8Array): void;
    function compare(b1: Uint8Array, b2: Uint8Array): number;

    export function randombytes_buf(length: number, outputFormat?: Uint8ArrayOutputFormat | null): Uint8Array;

    export const enum base64_variants {
        ORIGINAL = 1,
        ORIGINAL_NO_PADDING = 3,
        URLSAFE = 5,
        URLSAFE_NO_PADDING = 7,
    }

    export const crypto_box_NONCEBYTES: number;

    export const crypto_secretbox_KEYBYTES: number;

    export const crypto_pwhash_ALG_ARGON2I13: number;

    export const crypto_pwhash_ALG_ARGON2ID13: number;

    export function crypto_pwhash(
        keyLength: number,
        password: string | Uint8Array,
        salt: Uint8Array,
        opsLimit: number,
        memLimit: number,
        algorithm: number,
        outputFormat?: Uint8ArrayOutputFormat | null,
    ): Uint8Array;

    export function crypto_secretbox_open_easy(
        ciphertext: string | Uint8Array,
        nonce: Uint8Array,
        key: Uint8Array,
        outputFormat?: Uint8ArrayOutputFormat | null,
    ): Uint8Array;
    
    export function crypto_secretbox_open_easy(
        ciphertext: string | Uint8Array,
        nonce: Uint8Array,
        key: Uint8Array,
        outputFormat?: StringOutputFormat | null,
    ): string;
}
