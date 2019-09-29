export interface Versioned {
  _version_?: number;
}

export type NumericKey<T> = { [P in keyof T]?: 1 | -1 };

export type InCondition<T> = {
  [P in keyof T]?: {
    $in: Array<T[P]>;
  }
};

export type GreaterOrEqualsCondition<T> = {
  [P in keyof T]?: {
    $gte: T[P];
  }
};

export type LessOrEqualCondition<T> = {
  [P in keyof T]?: {
    $lte: T[P];
  }
};

export type Condition<T> =
  | Partial<T>
  | InCondition<T>
  | GreaterOrEqualsCondition<T>
  | LessOrEqualCondition<T>;

export interface FindAllOptions<T> {
  condition: Condition<T>;
  limit?: number;
  offset?: number;
  sort?: NumericKey<T>;
}

export type OneCondition<T> = Partial<T>;

export interface FindOneOptions<T> {
  condition: OneCondition<T>;
}

export type ArrayCondition<T> = { [P in keyof T]?: Array<T[P]> };
