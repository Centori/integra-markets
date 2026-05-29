
# ArticleSummarizeRequest


## Properties

Name | Type
------------ | -------------
`url` | string
`sentences` | number
`commodity` | string

## Example

```typescript
import type { ArticleSummarizeRequest } from '@integra-markets/sdk'

// TODO: Update the object below with actual values
const example = {
  "url": null,
  "sentences": null,
  "commodity": null,
} satisfies ArticleSummarizeRequest

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ArticleSummarizeRequest
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


