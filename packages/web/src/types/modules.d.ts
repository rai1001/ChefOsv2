declare module 'jspdf-autotable';
declare module 'fuse.js';
declare module 'react-barcode';
declare module 'html5-qrcode' {
    export class Html5Qrcode {
        constructor(elementId: string);
        start(cameraIdOrConfig: any, configuration: any, qrCodeSuccessCallback: (decodedText: string, decodedResult: any) => void, qrCodeErrorCallback: (errorMessage: string) => void): Promise<void>;
        stop(): Promise<void>;
        isScanning: boolean;
    }
}
