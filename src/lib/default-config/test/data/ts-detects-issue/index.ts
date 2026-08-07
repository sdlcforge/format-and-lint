const findId = (source: string): RegExpMatchArray | null => source.match(new RegExp('[0-9]+'))

export { findId }
