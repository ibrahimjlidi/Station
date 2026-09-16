declare module 'json2csv' {
  export class Parser<T = unknown> {
    parse(data: T[]): string;
  }
}