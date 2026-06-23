
# SentimentBreakdown


## Properties

Name | Type
------------ | -------------
`bullish` | number
`bearish` | number
`neutral` | number

## Example

```typescript
import type { SentimentBreakdown } from '@integra-markets/sdk'

// TODO: Update the object below with actual values
const example = {
  "bullish": null,
  "bearish": null,
  "neutral": null,
} satisfies SentimentBreakdown

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as SentimentBreakdown
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


