export type DiscriminatedUnion<K extends PropertyKey, T extends object> = {
  [P in keyof T]: { [Q in K]: P } & T[P] extends infer U
    ? { [Q in keyof U]: U[Q] }
    : never;
}[keyof T];
