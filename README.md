# pino-zip-last

Pino transport that zip the last log file in the same log directory. A temporary solution for log handling that otherwise needs an overkill solution.

## Usage

```js
import pino from 'pino'

const logger = pino({
  transport: {
    target: 'pino-zip-last',
    options: {
      destination: 'logs/app.log'
    }
  }
})

logger.info('Hello, world!')
```