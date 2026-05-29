
# OverallSentimentRequest


## Properties

Name | Type
------------ | -------------
`topicText` | string
`commodity` | string
`maxHeadlines` | number
`refreshIfEmpty` | boolean
`eventUrl` | string
`eventSlug` | string

## Example

```typescript
import type { OverallSentimentRequest } from '@integra-markets/sdk'

// TODO: Update the object below with actual values
const example = {
  "topicText": null,
  "commodity": null,
  "maxHeadlines": null,
  "refreshIfEmpty": null,
  "eventUrl": null,
  "eventSlug": null,
} satisfies OverallSentimentRequest

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as OverallSentimentRequest
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


