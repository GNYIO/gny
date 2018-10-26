declare class Tmdb {
    constructor(map: any);
    set(keys: any, value: any): void;
    get(keys: any): any;
    remove(keys: any): void;
    set_(keys: any, value: any): void;
    rollback(): void;
    commit(): void;
}
export = Tmdb;
