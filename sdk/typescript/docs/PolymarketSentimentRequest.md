
# PolymarketSentimentRequest


## Properties

Name | Type
------------ | -------------
`topicText` | string
`userId` | string
`connectorId` | string
`eventUrl` | string
`eventSlug` | string
`maxHeadlines` | number
`refreshIfEmpty` | boolean
`credentials` | [ConnectorCredentialRequest](ConnectorCredentialRequest.md)

## Example

```typescript
import type { PolymarketSentimentRequest } from '@integra-markets/sdk'

// TODO: Update the object below with actual values
const example = {
  "topicText": null,
  "userId": null,
  "connectorId": null,
  "eventUrl": null,
  "eventSlug": null,
  "maxHeadlines": null,
  "refreshIfEmpty": null,
  "credentials": null,
} satisfies PolymarketSentimentRequest

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as PolymarketSentimentRequest
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


