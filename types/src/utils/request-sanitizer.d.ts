declare function RequestSanitizer(options: any): void;
declare namespace RequestSanitizer {
    var options: {
        reporter: typeof SanitizeReporter;
    } & {
        forceAsync: boolean;
        skipMissed: boolean;
    };
    var express: (options: any) => (req: any, res: any, next: any) => void;
}
declare function SanitizeReporter(validator: any): void;
export = RequestSanitizer;
