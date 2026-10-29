declare module 'node:test' {
  export function test(name: string, fn: () => void | Promise<void>): Promise<void>;
  export default test;
}

declare module 'node:assert/strict' {
  const assert: {
    ok(value: unknown, message?: string): asserts value;
    equal<T>(actual: T, expected: T, message?: string): void;
    notEqual<T>(actual: T, expected: T, message?: string): void;
    deepEqual<T>(actual: T, expected: T, message?: string): void;
    match(value: string, regExp: RegExp, message?: string): void;
  };
  export default assert;
}
