declare namespace sodium {
    function from_hex(h: string): Uint8Array;
    function to_hex(b: Uint8Array): string;
    function is_hex(str: string): boolean;

    function from_base64(b64: string): Uint8Array;
    function to_base64(bytes: Uint8Array): string;

    function crypto_box_open_easy(cipherText: Uint8Array, nonce: Uint8Array, senderPubKey: Uint8Array, receiverSecKey: Uint8Array): Uint8Array;

    function memcmp(b1: Uint8Array, b2: Uint8Array): boolean;
    function memzero(bytes: Uint8Array): void;
    function compare(b1: Uint8Array, b2: Uint8Array): number;
}
