
# UserNewsRequest


## Properties

Name | Type
------------ | -------------
`userId` | string
`maxArticles` | number
`enhancedContent` | boolean
`maxEnhanced` | number

## Example

```typescript
import type { UserNewsRequest } from '@integra-markets/sdk'

// TODO: Update the object below with actual values
const example = {
  "userId": null,
  "maxArticles": null,
  "enhancedContent": null,
  "maxEnhanced": null,
} satisfies UserNewsRequest

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as UserNewsRequest
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


