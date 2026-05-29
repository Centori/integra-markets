
# DashboardSentimentEngineRequest


## Properties

Name | Type
------------ | -------------
`commodities` | Array&lt;string&gt;
`maxHeadlines` | number
`refreshIfEmpty` | boolean

## Example

```typescript
import type { DashboardSentimentEngineRequest } from '@integra-markets/sdk'

// TODO: Update the object below with actual values
const example = {
  "commodities": null,
  "maxHeadlines": null,
  "refreshIfEmpty": null,
} satisfies DashboardSentimentEngineRequest

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as DashboardSentimentEngineRequest
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


