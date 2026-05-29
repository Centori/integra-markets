
# AIAnalysisRequest


## Properties

Name | Type
------------ | -------------
`query` | string
`commodity` | string
`useTools` | boolean
`searchWeb` | boolean

## Example

```typescript
import type { AIAnalysisRequest } from '@integra-markets/sdk'

// TODO: Update the object below with actual values
const example = {
  "query": null,
  "commodity": null,
  "useTools": null,
  "searchWeb": null,
} satisfies AIAnalysisRequest

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as AIAnalysisRequest
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


