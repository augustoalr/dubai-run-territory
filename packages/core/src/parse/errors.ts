export const PARSE_ERROR = {
  NO_TIMESTAMPS: "NO_TIMESTAMPS",
  INVALID_FILE: "INVALID_FILE",
} as const;

export type ParseErrorCode = (typeof PARSE_ERROR)[keyof typeof PARSE_ERROR];

/** Typed failure from `parseGpx` / `parseFit`. `code` is the product reject code. */
export class TrackParseError extends Error {
  readonly code: ParseErrorCode;

  constructor(code: ParseErrorCode, message: string) {
    super(message);
    this.name = "TrackParseError";
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function isTrackParseError(error: unknown): error is TrackParseError {
  return error instanceof TrackParseError;
}
