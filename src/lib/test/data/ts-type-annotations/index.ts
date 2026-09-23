interface Config {
hostName: string
aVeryLongPortName?: number
}

export const defaults: Config = {
  hostName: 'localhost',
  aVeryLongPortName: 8080
}
