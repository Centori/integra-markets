
# NewsRequest


## Properties

Name | Type
------------ | -------------
`maxArticles` | number
`sources` | Array&lt;string&gt;
`commodityFilter` | string
`hoursBack` | number
`enhancedContent` | boolean
`maxEnhanced` | number
`alertFrequency` | string
`minImpact` | string

## Example

```typescript
import type { NewsRequest } from '@integra-markets/sdk'

// TODO: Update the object below with actual values
const example = {
  "maxArticles": null,
  "sources": null,
  "commodityFilter": null,
  "hoursBack": null,
  "enhancedContent": null,
  "maxEnhanced": null,
  "alertFrequency": null,
  "minImpact": null,
} satisfies NewsRequest

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as NewsRequest
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


