
# PolymarketSentimentResponse


## Properties

Name | Type
------------ | -------------
`topicText` | string
`primaryTarget` | string
`commodity` | string
`displayName` | string
`targetAssets` | Array&lt;string&gt;
`overallSentiment` | string
`confidence` | number
`headlineCount` | number
`summary` | string
`sentimentBreakdown` | [SentimentBreakdown](SentimentBreakdown.md)
`sampleHeadlines` | Array&lt;string&gt;
`matchedSignals` | Array&lt;string&gt;
`method` | string
`eventUrl` | string
`eventSlug` | string
`sourceUrl` | string
`cacheTimestamp` | string
`connectorContext` | [PolymarketConnectorContext](PolymarketConnectorContext.md)

## Example

```typescript
import type { PolymarketSentimentResponse } from '@integra-markets/sdk'

// TODO: Update the object below with actual values
const example = {
  "topicText": null,
  "primaryTarget": null,
  "commodity": null,
  "displayName": null,
  "targetAssets": null,
  "overallSentiment": null,
  "confidence": null,
  "headlineCount": null,
  "summary": null,
  "sentimentBreakdown": null,
  "sampleHeadlines": null,
  "matchedSignals": null,
  "method": null,
  "eventUrl": null,
  "eventSlug": null,
  "sourceUrl": null,
  "cacheTimestamp": null,
  "connectorContext": null,
} satisfies PolymarketSentimentResponse

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as PolymarketSentimentResponse
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


